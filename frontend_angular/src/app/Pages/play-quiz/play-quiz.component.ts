import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/AuthService/auth.service';
import * as jwt_decode from 'jwt-decode';
// import * as cocoSsd from '@tensorflow-models/coco-ssd';
// import * as tf from '@tensorflow/tfjs';
import { environment } from '../../../environments/environment';
import { ProctoringSocketService } from '../../core/services/proctoring-socket/proctoring-socket.service';

@Component({
  selector: 'app-play-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './play-quiz.component.html',
  styleUrls: ['./play-quiz.component.css'],
})
export class PlayQuizComponent implements OnInit, OnDestroy {
  @ViewChild('proctorVideo', { static: false })
  proctorVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('miniProctorVideo', { static: false })
  miniProctorVideo!: ElementRef<HTMLVideoElement>;

  // Base API (removes any trailing slashes)
  private api = (environment.apiBase || '').replace(/\/+$/, '');

  // Quiz + UI state
  quizCode = '';
  quizTitle: string | null = null;
  questions: any[] = [];
  currentQuestionIndex = 0;
  selectedOptions: { [key: number]: string } = {};

  isSubmitted = false;
  score = 0;
  loading = true;
  errorMessage = '';
  errorTitle = 'Error';

  // proctoring & timer
  quizStarted = false;
  timeLeft = 0;
  intervalId: any;

  // UX strike display
  proctoringViolations = 0;
  maxViolations = 1000;
  isProctoringActive = false;
  violationCount: number = 0; // ✅ ADD HERE

  // Immediate strikes counter (for critical events)
  private strikeCounter = 0;

  isViolating = false;
  violationTimer: any;
  gracePeriodSeconds = 5;

  // camera + audio
  mediaStream: MediaStream | null = null;
  private captureIntervalId: any = null;
  private captureIntervalSeconds: number = 20; // real-time monitoring
  private backendProctorUrl = `${this.api}/api/proctor/capture`;

  // face-api
  private faceapi: any = null;
  private objectModel: any = null;
  private modelsLoaded = false;
  private clientDetectionEnabled = true;

  // detection rAF
  private detectionRunning = false;

  // debounce counters (per-frame)
  private missFrames = 0;
  private offCenterFrames = 0;
  private eyesClosedFrames = 0;
  private multiFaceFrames = 0;
  private missFramesThreshold = 2;
  private offCenterFramesThreshold = 4;
  private eyesClosedFramesThreshold = 3;
  private multiFaceFramesThreshold = 5;

  // audio detection
  private audioContext: any = null;
  private analyser: any = null;
  private audioSource: any = null;
  private audioIntervalId: any = null;
  private audioLevelThreshold = 0.08;
  private audioViolationsFrames = 0;
  private audioViolationsThreshold = 2;

  // countdown UI state
  remainingGraceSeconds = 0;
  countdownPercent = 0;
  private countdownTickId: any = null;

  // token-derived
  roleType: string | null = null;
  userEmail: string | null = null;
  issuedAt: number | null = null;
  expiresAt: number | null = null;

  private visibilityHandler = this.handleVisibilityChange.bind(this);
  private fullscreenHandler = this.handleFullscreenChange.bind(this);

  // use arrow property to avoid "method not found at initializer" issues
  private keyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
  private contextMenuHandler = (e: Event) => e.preventDefault();
  private copyPasteHandler = (e: Event) => e.preventDefault();

  // head-movement tracking
  private headConsecutiveCount = 0;
  private headWarningsAllowed = 3;
  private headAutoSubmitThreshold = 4;
  private headResetTimer: any = null;
  private headResetDelay = 5000;
  private lastHeadWarningAt: number | null = null;
  private headWarningCooldownMs = 1500;

  // current test session id (folder name). Will be set when quiz starts:
  // format: <ISO_TIME>_<sanitized_quiz_title>_<quizCode>
  private currentTestSession: string | null = null;
  private lastPhoneDetection = 0;
  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private proctorSocket: ProctoringSocketService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.quizCode = this.route.snapshot.paramMap.get('code') || '';
    this.decodeTokenForRole();
    this.loadQuizData();

    // 🔒 START CAMERA IMMEDIATELY FOR SECURITY
    this.ensureCameraAuth();

    // 🔒 Internet connection monitoring
    window.addEventListener('offline', () => {
      if (this.quizStarted) {
        this.handleDetectionViolation('Internet connection lost.', true);
        this.sendEvidenceSnapshot('internet_disconnected', true);
      }
    });

    window.addEventListener('online', () => {
      console.log('Internet reconnected');
    });

    document.addEventListener('visibilitychange', this.visibilityHandler);
    document.addEventListener('fullscreenchange', this.fullscreenHandler);

    // 🔒 Detect ALT+TAB or window switching
    window.addEventListener('blur', () => {
      if (this.quizStarted) {
        this.handleDetectionViolation(
          'Window focus lost (possible ALT+TAB).',
          true,
        );
        this.sendEvidenceSnapshot('window_focus_lost', true);
      }
    });

    // System lockdown listeners
    document.addEventListener('contextmenu', this.contextMenuHandler);
    document.addEventListener('copy', this.copyPasteHandler);
    document.addEventListener('cut', this.copyPasteHandler);
    document.addEventListener('paste', this.copyPasteHandler);
    document.addEventListener('keydown', this.keyHandler);

    // devtools probing
    setInterval(() => {
      try {
        const threshold = 160;
        if (
          window.outerWidth - window.innerWidth > threshold ||
          window.outerHeight - window.innerHeight > threshold
        ) {
          this.handleDetectionViolation(
            'Developer tools opened (detected heuristically).',
            true,
          );
          this.sendEvidenceSnapshot('devtools_attempt', true);
        }
      } catch (e) {
        /* ignore */
      }
    }, 1500);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.captureIntervalId) clearInterval(this.captureIntervalId);
    if (this.countdownTickId) clearInterval(this.countdownTickId);

    clearTimeout(this.violationTimer);
    clearTimeout(this.headResetTimer);

    this.exitFullscreen();
    this.stopCamera();

    document.removeEventListener('visibilitychange', this.visibilityHandler);
    document.removeEventListener('fullscreenchange', this.fullscreenHandler);
    document.removeEventListener('contextmenu', this.contextMenuHandler);
    document.removeEventListener('copy', this.copyPasteHandler);
    document.removeEventListener('cut', this.copyPasteHandler);
    document.removeEventListener('paste', this.copyPasteHandler);
    document.removeEventListener('keydown', this.keyHandler);

    window.removeEventListener('offline', () => {});
    window.removeEventListener('online', () => {});

    // ✅ PERFECT
    this.proctorSocket.disconnect();
  }

  // -------------------------
  // Robust JWT decode helper + decodeTokenForRole implementation
  // -------------------------
  private safeJwtDecode<T = any>(token: string): T | null {
    try {
      const m: any = jwt_decode;
      if (typeof m === 'function') return m(token) as T;
      if (m && typeof m.default === 'function') return m.default(token) as T;
      if (m && typeof m.jwtDecode === 'function')
        return m.jwtDecode(token) as T;
      return null;
    } catch (e) {
      console.error('safeJwtDecode failed', e);
      return null;
    }
  }

  private decodeTokenForRole(): void {
    try {
      const token =
        this.authService.getToken() || localStorage.getItem('token') || '';
      if (!token) {
        this.roleType = null;
        this.userEmail = null;
        this.issuedAt = null;
        this.expiresAt = null;
        return;
      }
      const decoded: any = this.safeJwtDecode(token);
      if (decoded) {
        if (decoded.roles) {
          if (Array.isArray(decoded.roles) && decoded.roles.length > 0)
            this.roleType = decoded.roles[0];
          else if (typeof decoded.roles === 'string')
            this.roleType = decoded.roles;
        } else if (decoded.role) this.roleType = decoded.role;
        else this.roleType = null;
        this.userEmail = decoded.sub || decoded.email || null;
        this.issuedAt = decoded.iat ? Number(decoded.iat) : null;
        this.expiresAt = decoded.exp ? Number(decoded.exp) : null;
      }
    } catch (e) {
      console.error('Failed to decode token (no UI exposure):', e);
      this.roleType = null;
      this.userEmail = null;
      this.issuedAt = null;
      this.expiresAt = null;
    }
  }

  // -------------------------
  // Camera + Audio helpers (updated)
  // -------------------------
  async ensureCameraAuth(): Promise<boolean> {
    try {
      await this.startCamera();

      // If quiz hasn't started we create a temporary session name so pre-start captures go somewhere.
      if (!this.currentTestSession) {
        const nowIso = new Date().toISOString().replace(/[:.]/g, '-');
        this.currentTestSession = `${nowIso}_pre_${this.quizCode || 'general'}`;
      }

      // start periodic capture immediately so we capture before the user clicks Start
      this.startPeriodicCapture();

      // preload models from CDN (non-blocking)
      this.loadFaceApiModels().catch((e) =>
        console.error('Model load failed', e),
      );
      return true;
    } catch (e: any) {
      console.error('Camera permission error', e);
      this.errorTitle = 'Access Denied';
      this.errorMessage =
        'Camera & microphone access is required to start this exam. Please enable and try again.';
      return false;
    }
  }

  async startCamera(): Promise<void> {
    if (this.mediaStream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('No camera API');
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      // video: {
      //   facingMode: 'user',
      //   width: { ideal: 640 },
      //   height: { ideal: 480 },
      // },
      video: {
        facingMode: 'user',
        width: { ideal: 480 },
        height: { ideal: 360 },
      },
      audio: true,
    });

    // 🔒 Camera tampering detection
    const videoTrack = this.mediaStream.getVideoTracks()[0];

    videoTrack.onended = () => {
      this.handleDetectionViolation('Camera disconnected or turned off.', true);
      this.sendEvidenceSnapshot('camera_disconnected', true);
    };

    videoTrack.onmute = () => {
      this.handleDetectionViolation('Camera feed muted.', false);
      this.sendEvidenceSnapshot('camera_muted', false);
    };

    // attach streams
    setTimeout(() => {
      try {
        if (this.proctorVideo?.nativeElement)
          this.proctorVideo.nativeElement.srcObject = this.mediaStream;
        if (this.miniProctorVideo?.nativeElement)
          this.miniProctorVideo.nativeElement.srcObject = this.mediaStream;
      } catch (err) {
        console.warn('Unable to attach media stream to video element', err);
      }
    }, 0);

    // attempt to play preview elements (browsers may block until user gesture)
    setTimeout(async () => {
      try {
        if (this.proctorVideo && this.proctorVideo.nativeElement) {
          await this.safePlayVideo(this.proctorVideo.nativeElement);
        }
        if (this.miniProctorVideo && this.miniProctorVideo.nativeElement) {
          await this.safePlayVideo(this.miniProctorVideo.nativeElement);
        }
      } catch (e) {
        // ignore play errors — captures will wait for ready state later
      }
    }, 50);

    this.startAudioProcessing();
  }

  private async safePlayVideo(
    videoEl: HTMLVideoElement,
    timeout = 1000,
  ): Promise<void> {
    try {
      const p = videoEl.play();
      if (p && typeof (p as Promise<void>).then === 'function') {
        await Promise.race([
          p as Promise<void>,
          new Promise<void>((res) => setTimeout(res, timeout)),
        ]);
      }
    } catch (e) {
      // swallow autoplay errors
    }
  }

  stopCamera(): void {
    this.stopImmediateDetection();

    if (this.countdownTickId) {
      clearInterval(this.countdownTickId);
      this.countdownTickId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.captureIntervalId) {
      clearInterval(this.captureIntervalId);
      this.captureIntervalId = null;
    }

    this.stopAudioProcessing();

    try {
      if (this.miniProctorVideo?.nativeElement)
        this.miniProctorVideo.nativeElement.srcObject = null;
      if (this.proctorVideo?.nativeElement)
        this.proctorVideo.nativeElement.srcObject = null;
    } catch (e) {
      /* ignore */
    }
  }

  // -------------------------
  // Audio proctoring
  // -------------------------
  private startAudioProcessing() {
    if (!this.mediaStream) return;
    try {
      if (!this.audioContext)
        this.audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      this.audioSource = this.audioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.audioSource.connect(this.analyser);
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.audioIntervalId = setInterval(() => {
        this.analyser!.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        if (rms > this.audioLevelThreshold) {
          this.audioViolationsFrames++;
          if (this.audioViolationsFrames >= this.audioViolationsThreshold) {
            this.audioViolationsFrames = 0;
            this.handleDetectionViolation(
              'Loud audio / speech detected (client)',
              true,
            );
            this.sendEvidenceSnapshot('audio_noise', true);
          }
        } else {
          this.audioViolationsFrames = 0;
        }
      }, 250);
    } catch (e) {
      console.warn('Audio processing setup failed', e);
    }
  }

  private stopAudioProcessing() {
    if (this.audioIntervalId) {
      clearInterval(this.audioIntervalId);
      this.audioIntervalId = null;
    }
    try {
      if (this.analyser) this.analyser.disconnect();
    } catch (e) {}
    try {
      if (this.audioSource) this.audioSource.disconnect();
    } catch (e) {}
    try {
      if (this.audioContext) this.audioContext.close();
    } catch (e) {}
    this.analyser = null;
    this.audioSource = null;
    this.audioContext = null;
  }

  // -------------------------
  // CDN-only model loading (face-api)
  // -------------------------
  private async loadFaceApiModels(): Promise<void> {
    if (this.modelsLoaded) return;
    try {
      this.faceapi = await import('face-api.js');
      const cdn =
        'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights';
      await Promise.all([
        this.faceapi.nets.tinyFaceDetector.loadFromUri(cdn),
        this.faceapi.nets.faceLandmark68TinyNet.loadFromUri(cdn),
      ]);
      this.modelsLoaded = true;
      this.clientDetectionEnabled = true;
      console.info('face-api.js models loaded from CDN');
    } catch (err) {
      console.error('Failed to load face-api models from CDN:', err);
      this.modelsLoaded = false;
      this.clientDetectionEnabled = false;
    }
  }

  // -------------------------
  // Immediate detection loop (keeps existing logic)
  // -------------------------
  private startImmediateDetection() {
    if (!this.modelsLoaded || !this.clientDetectionEnabled) return;

    const videoEl =
      this.miniProctorVideo && this.miniProctorVideo.nativeElement
        ? this.miniProctorVideo.nativeElement
        : this.proctorVideo && this.proctorVideo.nativeElement
          ? this.proctorVideo.nativeElement
          : null;

    if (!videoEl) {
      console.warn('startImmediateDetection: video element not ready.');
      return;
    }

    (async () => {
      try {
        await videoEl.play();
      } catch (e) {
        /* ignore autoplay block */
      }
    })();

    this.detectionRunning = true;

    const options = new this.faceapi.TinyFaceDetectorOptions({
      inputSize: 160,
      scoreThreshold: 0.32,
    });

    let lastDetectionTime = 0;
    const detectionInterval = 300;

    const loop = async () => {
      if (!this.detectionRunning) return;

      const now = Date.now();

      // throttle detection
      if (now - lastDetectionTime >= detectionInterval) {
        lastDetectionTime = now;

        try {
          if (videoEl && videoEl.readyState >= 2) {
            console.log('Detection running');

            // 🔒 Phone detection
            if (this.objectModel) {
              const phoneNow = Date.now();

              if (phoneNow - this.lastPhoneDetection > 3000) {
                this.lastPhoneDetection = phoneNow;

                const predictions = await this.objectModel.detect(videoEl);

                predictions.forEach((p: any) => {
                  if (
                    (p.class === 'cell phone' || p.class === 'remote') &&
                    p.score > 0.6
                  ) {
                    this.handleDetectionViolation(
                      'Mobile phone detected.',
                      true,
                    );
                    this.sendEvidenceSnapshot('mobile_phone_detected', true);
                  }
                });
              }
            }

            // Face detection
            const results = await this.faceapi
              .detectAllFaces(videoEl, options)
              .withFaceLandmarks(true);

            console.log('Faces detected:', results.length);

            if (!results || results.length === 0) {
              this.missFrames++;
              this.offCenterFrames = 0;
              this.eyesClosedFrames = 0;
              this.multiFaceFrames = 0;
              if (this.missFrames >= this.missFramesThreshold) {
                this.missFrames = 0;
                this.handleDetectionViolation(
                  'No face detected (client)',
                  false,
                );
                this.sendEvidenceSnapshot('no_face', false);
              }
            } else {
              if (results.length > 1) {
                this.multiFaceFrames++;

                if (this.multiFaceFrames >= this.multiFaceFramesThreshold) {
                  this.multiFaceFrames = 0;

                  // 🔥 CORE FIX
                  this.handleDetectionViolation(
                    '🚨 MULTIPLE PEOPLE DETECTED! ONLY ONE STUDENT ALLOWED.',
                    true,
                  );

                  await this.sendEvidenceSnapshot('multi_face', true);
                }
              } else {
                this.multiFaceFrames = 0;
              }

              const r = results[0];
              this.missFrames = 0;
              const landmarks = r.landmarks;
              const box = r.detection.box;

              const faceCenterX = box.x + box.width / 2;
              const faceCenterY = box.y + box.height / 2;

              const videoW =
                videoEl.videoWidth && videoEl.videoWidth > 0
                  ? videoEl.videoWidth
                  : videoEl.clientWidth || 640;
              const videoH =
                videoEl.videoHeight && videoEl.videoHeight > 0
                  ? videoEl.videoHeight
                  : videoEl.clientHeight || 480;

              // 🔒 Face size detection
              const faceArea = box.width * box.height;
              const frameArea = videoW * videoH;
              const faceRatio = faceArea / frameArea;

              if (faceRatio < 0.02) {
                this.handleDetectionViolation(
                  'Face too far from camera.',
                  false,
                );
                this.sendEvidenceSnapshot('face_too_far', false);
              }

              if (faceRatio > 0.65) {
                this.handleDetectionViolation(
                  'Camera extremely close to face.',
                  false,
                );
                this.sendEvidenceSnapshot('face_too_close', false);
              }

              const centerX = videoW / 2;
              const centerY = videoH / 2;
              const dx = Math.abs(faceCenterX - centerX) / videoW;
              const dy = Math.abs(faceCenterY - centerY) / videoH;

              const leftEye = landmarks.getLeftEye();
              const rightEye = landmarks.getRightEye();
              const earLeft = this.computeEAR(leftEye);
              const earRight = this.computeEAR(rightEye);
              const ear = (earLeft + earRight) / 2.0;

              const nose = landmarks.getNose();
              const noseTip =
                nose && nose.length > 0
                  ? nose[Math.floor(nose.length / 2)]
                  : null;
              let headYawNormalized = 0;
              let headPitchNormalized = 0;
              if (noseTip) {
                headYawNormalized = (noseTip.x - faceCenterX) / box.width;
                headPitchNormalized = (noseTip.y - faceCenterY) / box.height;
              }

              const offCenterThreshold = 0.28;
              const earClosedThreshold = 0.18;

              const isOffCenter =
                dx > offCenterThreshold ||
                dy > offCenterThreshold ||
                Math.abs(headYawNormalized) > 0.25 ||
                Math.abs(headPitchNormalized) > 0.3;
              const eyesClosed = ear < earClosedThreshold;

              if (isOffCenter) this.offCenterFrames++;
              else this.offCenterFrames = 0;
              if (eyesClosed) this.eyesClosedFrames++;
              else this.eyesClosedFrames = 0;

              if (this.offCenterFrames >= this.offCenterFramesThreshold) {
                this.offCenterFrames = 0;
                this.handleHeadMovement(true, videoEl);
                this.captureAndUpload({
                  evidence: true,
                  violationType: 'head_pose',
                  critical: false,
                }).catch(() => {});
              } else {
                this.handleHeadMovement(false, videoEl);
                if (this.eyesClosedFrames >= this.eyesClosedFramesThreshold) {
                  this.eyesClosedFrames = 0;
                  this.handleDetectionViolation(
                    'Eyes closed / looking down (client)',
                    false,
                  );
                  this.sendEvidenceSnapshot('eyes_closed', false);
                } else {
                  this.resetViolationState();
                }
              }
            }
          }
        } catch (ex: any) {
          console.warn('Detection error', ex);

          const m = ex && ex.message ? String(ex.message).toLowerCase() : '';

          if (
            m.includes('tensor') ||
            m.includes('shape') ||
            m.includes('values but has')
          ) {
            console.error(
              'Disabling client-side detection due to model mismatch.',
            );
            this.clientDetectionEnabled = false;
            this.detectionRunning = false;
          }
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  } // ✅ THIS closes startImmediateDetection()

  private stopImmediateDetection() {
    this.detectionRunning = false;
  }

  private sendWebSocketAlert(message: string, isCritical: boolean) {
    const alert = {
      quizCode: this.quizCode,
      student: this.userEmail || 'unknown',
      message: message,
      type: isCritical ? 'CRITICAL' : 'WARNING',
      timestamp: new Date().toISOString(),
    };

    console.log('🚨 Sending WS Alert:', alert);

    this.proctorSocket.send(alert); // ✅ NOW WORKS
  }

  // -------------------------
  // Detection -> violation wiring
  // -------------------------
  private handleDetectionViolation(message: string, isCritical: boolean) {
    this.showWarning(message); // 🔥 add this line

    // ✅ ONLY SEND, DO NOT COUNT TWICE
    if (!message.includes('client')) {
      this.sendWebSocketAlert(message, isCritical);
    }

    this.isViolating = true;

    clearTimeout(this.violationTimer);

    // 🔥 FORCE UI REFRESH
    setTimeout(() => {
      this.isViolating = true;
    }, 10);

    this.violationTimer = setTimeout(() => {
      this.isViolating = false;
    }, this.gracePeriodSeconds * 1000);

    if (isCritical) {
      this.strikeCounter++;
      this.proctoringViolations = this.strikeCounter;
      this.sendEvidenceSnapshot(
        'critical_' + message.replace(/\s+/g, '_').toLowerCase(),
        true,
      );
      this.handleViolation(message, true);
      return;
    }

    this.strikeCounter++;
    // ✅ ALWAYS INCREMENT HERE
    this.proctoringViolations = this.strikeCounter;

    if (this.strikeCounter >= this.maxViolations) {
      this.handleViolation(message, true);
      return;
    }

    if (!this.isViolating) this.startGraceCountdown();
    this.handleViolation(message, false);
  }

  // compute Eye Aspect Ratio (EAR)
  private computeEAR(eyePoints: any[]): number {
    if (!eyePoints || eyePoints.length < 6) return 1;
    const p = (i: number) => eyePoints[i];
    const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
    const A = dist(p(1), p(5));
    const B = dist(p(2), p(4));
    const C = dist(p(0), p(3));
    if (C === 0) return 1;
    return (A + B) / (2.0 * C);
  }

  // -------------------------
  // HEAD movement handler
  // -------------------------
  handleHeadMovement(isHeadTurned: boolean, videoEl?: HTMLVideoElement) {
    const now = Date.now();
    const vEl =
      videoEl ||
      (this.proctorVideo && this.proctorVideo.nativeElement) ||
      undefined;

    if (!isHeadTurned) {
      if (this.headResetTimer) clearTimeout(this.headResetTimer);
      this.headResetTimer = setTimeout(() => {
        this.headConsecutiveCount = 0;
        this.lastHeadWarningAt = null;
        this.headResetTimer = null;
      }, this.headResetDelay);
      return;
    }

    if (
      this.lastHeadWarningAt &&
      now - this.lastHeadWarningAt < this.headWarningCooldownMs
    ) {
      this.showWarning(
        `Please look at the camera. (${Math.min(
          this.headConsecutiveCount,
          this.headWarningsAllowed,
        )}/${this.headWarningsAllowed})`,
      );
      return;
    }

    this.headConsecutiveCount++;
    this.lastHeadWarningAt = now;

    if (this.headConsecutiveCount <= this.headWarningsAllowed) {
      this.showWarning(
        `Please look at the camera. Warning ${this.headConsecutiveCount}/${this.headWarningsAllowed}`,
      );
    } else {
      this.showWarning(
        `Repeated head movement detected (${this.headConsecutiveCount}). Auto-submitting...`,
      );
    }

    if (vEl) {
      this.captureCenterImage(vEl)
        .then((blob: Blob) =>
          this.captureAndUpload({
            evidence: true,
            violationType: 'head_pose',
            critical: false,
          }),
        )
        .catch((err: any) =>
          console.error('Proctor evidence upload failed', err),
        );
    }

    if (this.headConsecutiveCount >= this.headAutoSubmitThreshold) {
      setTimeout(() => this.autoSubmit(true), 500);
      return;
    }

    if (this.headResetTimer) clearTimeout(this.headResetTimer);
    this.headResetTimer = setTimeout(() => {
      this.headConsecutiveCount = 0;
      this.lastHeadWarningAt = null;
      this.headResetTimer = null;
    }, this.headResetDelay);
  }

  // -------------------------
  // Countdown / grace UI (already implemented above)
  // -------------------------
  private startGraceCountdown() {
    if (this.countdownTickId) {
      clearInterval(this.countdownTickId);
      this.countdownTickId = null;
    }
    this.remainingGraceSeconds = this.gracePeriodSeconds;
    this.updateCountdownPercent();

    const stepMs = 250;
    const steps = Math.ceil((this.gracePeriodSeconds * 1000) / stepMs);
    let remainingSteps = steps;

    this.countdownTickId = setInterval(() => {
      remainingSteps--;
      this.remainingGraceSeconds = Math.ceil((remainingSteps * stepMs) / 1000);
      this.updateCountdownPercent();
      if (remainingSteps <= 0) {
        clearInterval(this.countdownTickId);
        this.countdownTickId = null;
      }
    }, stepMs);
  }

  private updateCountdownPercent() {
    if (this.gracePeriodSeconds <= 0) {
      this.countdownPercent = 100;
      return;
    }
    const percent = Math.max(
      0,
      Math.min(
        100,
        (this.remainingGraceSeconds / this.gracePeriodSeconds) * 100,
      ),
    );
    this.countdownPercent = Math.round(percent);
  }

  // -------------------------
  // Capture + upload (supports evidence flag + session)
  // -------------------------
  private async captureAndUpload(options?: {
    evidence?: boolean;
    violationType?: string;
    critical?: boolean;
  }): Promise<void> {
    try {
      if (!this.mediaStream) return;
      if (!this.proctorVideo?.nativeElement?.videoWidth) {
        console.warn(
          'captureAndUpload: proctorVideo not available yet; skipping.',
        );
        return;
      }

      const videoEl = this.proctorVideo.nativeElement;

      // ensure there's a valid frame to draw
      const ready = await this.waitForVideoReady(videoEl, 1200);
      if (!ready) {
        console.warn('captureAndUpload: video not ready - skipping.');
        return;
      }

      const w = videoEl.videoWidth || videoEl.clientWidth || 640;
      const h = videoEl.videoHeight || videoEl.clientHeight || 480;
      if (w === 0 || h === 0) {
        console.warn('captureAndUpload: video width/height zero - skipping');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoEl, 0, 0, w, h);

      const blob: Blob | null = await new Promise((resolve) =>
        // canvas.toBlob(resolve, 'image/jpeg', 0.85),
        canvas.toBlob(resolve, 'image/jpeg', 0.65),
      );
      if (!blob) {
        console.warn('captureAndUpload: toBlob returned null');
        return;
      }

      const form = new FormData();
      form.append('capture', blob, `capture-${Date.now()}.jpg`);
      form.append('quizCode', this.quizCode || 'unknown');

      if (this.currentTestSession)
        form.append('session', this.currentTestSession);
      if (options?.evidence) form.append('evidence', 'true');
      if (options?.violationType)
        form.append('violationType', options.violationType);
      if (options?.critical) form.append('critical', 'true');

      this.http
        .post<any>(this.backendProctorUrl, form, {
          observe: 'response' as const,
          withCredentials: true,
        })
        .subscribe({
          next: (resp: HttpResponse<any>) => {
            try {
              const body: any = resp.body;
              if (body && body.status === 'rejected' && !options?.evidence) {
                this.handleViolation(
                  'No face detected by proctoring server.',
                  true,
                );
                return;
              }
              if (body && body.warning === 'no_face_detector_available') {
                console.warn('Proctor server: no face detector available.');
              }
            } catch (ex) {
              console.warn('Error evaluating proctor response', ex);
            }
          },
          error: (err: any) => {
            console.warn('Proctor upload failed', err);
            if (err?.error) console.warn('Server response:', err.error);
            if (err && err.status === 422 && !options?.evidence) {
              this.handleViolation(
                'No face detected by proctoring server.',
                true,
              );
            }
          },
        });
    } catch (e) {
      console.warn('capture/upload error', e);
    }
  }

  private async sendEvidenceSnapshot(violationType: string, critical = false) {
    await this.captureAndUpload({ evidence: true, violationType, critical });
  }

  private startPeriodicCapture() {
    if (this.captureIntervalId) return;

    // Immediately capture once
    this.captureAndUpload({
      evidence: true,
      violationType: 'periodic_capture',
      critical: false,
    }).catch(() => {
      /* ignore */
    });

    // schedule repeating captures every captureIntervalSeconds seconds
    this.captureIntervalId = setInterval(() => {
      this.captureAndUpload({
        evidence: true,
        violationType: 'periodic_capture',
        critical: false,
      }).catch(() => {
        /* ignore */
      });
    }, this.captureIntervalSeconds * 1000);
  }

  // Wait helper for video readiness
  private waitForVideoReady(
    videoEl: HTMLVideoElement,
    timeoutMs = 1200,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0
      ) {
        resolve(true);
        return;
      }

      let settled = false;
      const onReady = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(
          videoEl.readyState >= 2 &&
            videoEl.videoWidth > 0 &&
            videoEl.videoHeight > 0,
        );
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        videoEl.removeEventListener('loadeddata', onReady);
        videoEl.removeEventListener('playing', onReady);
        videoEl.removeEventListener('error', onError);
      };

      videoEl.addEventListener('loadeddata', onReady, { once: true });
      videoEl.addEventListener('playing', onReady, { once: true });
      videoEl.addEventListener('error', onError, { once: true });

      setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(
          videoEl.readyState >= 2 &&
            videoEl.videoWidth > 0 &&
            videoEl.videoHeight > 0,
        );
      }, timeoutMs);
    });
  }

  // Capture centered square crop
  private async captureCenterImage(
    videoEl: HTMLVideoElement,
    outputSize = 640,
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const vw = videoEl.videoWidth || videoEl.clientWidth;
    const vh = videoEl.videoHeight || videoEl.clientHeight;
    const side = Math.min(vw, vh);

    const sx = Math.max(0, (vw - side) / 2);
    const sy = Math.max(0, (vh - side) / 2);

    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.drawImage(videoEl, sx, sy, side, side, 0, 0, outputSize, outputSize);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob from canvas'));
        },
        'image/jpeg',
        0.9,
      );
    });
  }

  // -------------------------
  // UI / keyboard handler
  // -------------------------
  private handleKeyDown(e: KeyboardEvent) {
    const isF12 = e.key === 'F12';
    const isCtrlShiftI =
      e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i');
    const isCtrlShiftJ =
      e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j');
    const isCtrlShiftC =
      e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c');

    if (isF12 || isCtrlShiftI || isCtrlShiftJ || isCtrlShiftC) {
      e.preventDefault();
      this.handleDetectionViolation(
        'Attempt to open developer tools or inspect (keyboard).',
        true,
      );
      this.sendEvidenceSnapshot('devtools_attempt', true);
    }

    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === 'c' || e.key === 'v' || e.key === 'x')
    ) {
      e.preventDefault();
      this.handleDetectionViolation('Copy/Paste attempt blocked.', false);
    }
  }

  // -------------------------
  // Template helpers (select/navigation)
  // -------------------------
  selectOption(questionId: number, option: string) {
    this.selectedOptions[questionId] = option;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1)
      this.currentQuestionIndex++;
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) this.currentQuestionIndex--;
  }

  // -------------------------
  // Remaining helpers (violation handling, quiz lifecycle)
  // -------------------------
  private handleViolation(message: string, isCritical = false) {
    if (this.isSubmitted || !this.quizStarted || !this.isProctoringActive)
      return;

    clearTimeout(this.violationTimer);

    if (isCritical) {
      this.showWarning(message);
      return;
    }

    if (this.proctoringViolations >= this.maxViolations) {
      this.autoSubmit(true);
      return;
    }

    if (!this.isViolating) {
      this.isViolating = true;

      this.showWarning(message);

      this.violationTimer = setTimeout(() => {
        if (this.isViolating) {
          if (this.proctoringViolations >= this.maxViolations)
            this.autoSubmit(true);
          else this.isViolating = false;
        }
      }, this.gracePeriodSeconds * 1000);
    }
  }

  private resetViolationState() {
    if (this.violationTimer) clearTimeout(this.violationTimer);
    if (this.countdownTickId) {
      clearInterval(this.countdownTickId);
      this.countdownTickId = null;
    }
    this.remainingGraceSeconds = 0;
    this.countdownPercent = 0;
    this.isViolating = false;
    this.missFrames = 0;
    this.offCenterFrames = 0;
    this.eyesClosedFrames = 0;
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      this.handleDetectionViolation('Leaving the quiz window/tab.', false);
      this.sendEvidenceSnapshot('visibility_hidden', false);
    } else this.resetViolationState();
  }

  handleFullscreenChange() {
    if (this.quizStarted && !document.fullscreenElement) {
      this.handleDetectionViolation('Exiting fullscreen mode.', true);
      this.sendEvidenceSnapshot('exit_fullscreen', true);
    } else this.resetViolationState();
  }

  loadQuizData() {
    this.loading = true;
    this.errorMessage = '';

    this.http
      .get<any>(`${this.api}/api/quizzes/code/${this.quizCode}`)
      .subscribe({
        next: (quiz) => {
          // ❌ Quiz deactivated
          if (quiz && (quiz.active === false || quiz.active === 'false')) {
            this.loading = false;
            this.errorTitle = 'Access Denied';
            this.errorMessage =
              'This quiz is currently deactivated by the instructor. Please contact your instructor.';
            return;
          }

          this.quizTitle = quiz?.title || quiz?.name || null;

          // ---------------- TIMER LOGIC ----------------

          const totalMinutes = Number(quiz?.totalTimeMinutes);
          const perQuestionSeconds = Number(quiz?.perQuestionTimeSeconds);
          const questionCount = Number(quiz?.questionsCount);

          // Priority 1: Total quiz timer
          if (!isNaN(totalMinutes) && totalMinutes > 0) {
            this.timeLeft = totalMinutes * 60;
          }

          // Priority 2: Per-question timer
          else if (
            !isNaN(perQuestionSeconds) &&
            perQuestionSeconds > 0 &&
            questionCount > 0
          ) {
            this.timeLeft = perQuestionSeconds * questionCount;
          }

          // Priority 3: Default fallback
          else {
            console.warn(
              'Quiz timer missing from backend. Using default 60 minutes.',
            );
            this.timeLeft = 60 * 60;
          }

          // Load questions
          if (quiz?.id != null) {
            this.http
              .get<any[]>(`${this.api}/api/questions/quiz/${quiz.id}`)
              .subscribe({
                next: (qs) => {
                  this.questions = qs || [];
                  this.loading = false;
                },
                error: () => {
                  this.loading = false;
                  this.errorTitle = 'Error';
                  this.errorMessage = 'Failed to load quiz questions.';
                },
              });
          } else {
            this.loading = false;
            this.errorTitle = 'Error';
            this.errorMessage = 'Invalid quiz data returned from server.';
          }
        },

        // ✅ THIS IS THE FIXED ERROR BLOCK
        error: (err: any) => {
          this.loading = false;

          // 🔒 BLOCK RETAKE AT ENTRY (IMPORTANT)
          if (err?.error?.reason === 'RETAKE_NOT_ALLOWED') {
            this.errorTitle = 'Retake Not Allowed';
            this.errorMessage =
              err.error.message ||
              'Retake not allowed yet. Please wait for approval.';
            return;
          }

          if (err.status === 403) {
            this.errorTitle = 'Access Denied';
            this.errorMessage =
              err?.error?.message || 'You are not allowed to access this quiz.';
          } else if (err.status === 404) {
            this.errorTitle = 'Not Found';
            this.errorMessage = 'Quiz not found.';
          } else {
            this.errorTitle = 'Error';
            this.errorMessage = 'Something went wrong.';
          }
        },
      });
  }

  async startQuiz() {
    try {
      await this.startCamera();
      await this.loadFaceApiModels();
    } catch (e) {
      this.errorTitle = 'Access Denied';
      this.errorMessage = 'Camera access is required to start the exam.';
      return;
    }

    // Build session folder name using quiz start time + quiz title + quiz code
    const startIso = new Date().toISOString().replace(/[:.]/g, '-');
    const title = (this.quizTitle || '').trim() || 'quiz';
    const safeTitle = title.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_');
    const safeCode = (this.quizCode || '').replace(/[^\w\-]+/g, '_');
    this.currentTestSession = `${startIso}_${safeTitle}_${safeCode}`;

    this.enterFullscreen();
    this.isProctoringActive = true;
    if (!this.timeLeft || this.timeLeft <= 0) {
      console.error('Invalid quiz timer. Blocking quiz start.');
      return;
    }
    this.quizStarted = true;

    // 🔥 ADD THIS BLOCK HERE
    this.proctorSocket.connect(this.quizCode, (data) => {
      console.log('🚨 LIVE ALERT FROM SERVER:', data);

      this.showWarning(data.message);

      // ✅ ADD THIS
      this.isViolating = true;

      if (data.type === 'CRITICAL') {
        this.strikeCounter++;
        this.proctoringViolations = this.strikeCounter;
      }

      // optional auto hide
      clearTimeout(this.violationTimer);

      this.violationTimer = setTimeout(() => {
        this.isViolating = false;
      }, this.gracePeriodSeconds * 1000);
    });

    // ensure mini preview attached
    setTimeout(() => {
      try {
        if (this.miniProctorVideo?.nativeElement && this.mediaStream)
          this.miniProctorVideo.nativeElement.srcObject = this.mediaStream;
      } catch (e) {
        /* ignore */
      }
    }, 50);

    // timer
    this.intervalId = setInterval(() => {
      if (this.timeLeft > 0) this.timeLeft--;
      else this.autoSubmit();
    }, 1000);

    // ensure periodic capture is running with the new session
    this.startPeriodicCapture();

    // start detection
    setTimeout(() => this.startImmediateDetection(), 200);
  }

  private enterFullscreen() {
    const element = document.documentElement as any;
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
  }

  private exitFullscreen() {
    const docAny = document as any;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        /* ignore */
      });
      return;
    }
    if (docAny.mozFullScreenElement) {
      try {
        docAny.mozCancelFullScreen();
      } catch (_) {
        /* ignore */
      }
    } else if (docAny.webkitFullscreenElement) {
      try {
        docAny.webkitExitFullscreen();
      } catch (_) {
        /* ignore */
      }
    } else if (docAny.msFullscreenElement) {
      try {
        docAny.msExitFullscreen();
      } catch (_) {
        /* ignore */
      }
    }
  }

  autoSubmit(penalty = false) {
    if (this.isSubmitted) return;
    clearInterval(this.intervalId);
    this.exitFullscreen();
    this.isProctoringActive = false;
    this.stopCamera();

    const message = penalty
      ? 'Quiz auto-submitted due to excessive proctoring violations.'
      : 'Time expired. Quiz auto-submitted.';
    alert(message);
    this.submitQuiz(true);
  }

  submitQuiz(isAutoSubmit = false) {
    if (this.isSubmitted) return;

    clearInterval(this.intervalId);
    this.exitFullscreen();
    this.isProctoringActive = false;
    this.stopCamera();

    const payload = this.selectedOptions;

    this.http
      .post(`${this.api}/api/results/submit/${this.quizCode}`, payload, {
        responseType: 'json', // 👈 IMPORTANT: allow backend JSON error
      })
      .subscribe({
        next: () => {
          this.isSubmitted = true;

          // ✅ Calculate score locally
          this.score = 0;
          this.questions.forEach((q) => {
            if (
              q.type === 'MCQ' &&
              q.correctAnswer &&
              this.selectedOptions[q.id] === q.correctAnswer
            ) {
              this.score++;
            }
          });
        },

        error: (err: any) => {
          console.error('Submit error:', err);

          // 🔒 Retake blocked (teacher has not allowed)
          if (
            err.status === 403 &&
            err.error?.reason === 'RETAKE_NOT_ALLOWED'
          ) {
            alert('Retake not allowed yet. Please wait for approval.');
            return;
          }

          // ❌ Creator trying to submit own quiz
          if (
            err.status === 403 &&
            err.error?.reason === 'CREATOR_CANNOT_PLAY'
          ) {
            alert('You cannot attempt a quiz you created.');
            return;
          }

          // ⚠️ Session expired / not logged in
          if (err.status === 401) {
            alert('Session expired. Please login again.');
            this.router.navigate(['/login']);
            return;
          }

          // 🧯 Edge case: backend returned 200 but Angular treated as error
          if (err.status === 200) {
            this.isSubmitted = true;
            return;
          }

          // ❌ Fallback
          alert('Failed to submit quiz. Please try again.');
        },
      });
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  goHome() {
    const role = (this.roleType || '').toUpperCase();
    if (role.includes('ADMIN')) this.router.navigate(['/dashboard/admin']);
    else if (role.includes('TEACHER') || role.includes('FACULTY'))
      this.router.navigate(['/dashboard/teacher']);
    else if (role.includes('STUDENT'))
      this.router.navigate(['/dashboard/student']);
    else {
      const token =
        this.authService.getToken() || localStorage.getItem('token');
      if (!token) {
        this.router.navigate(['/home']);
        return;
      }
      try {
        const decodedToken: any = this.safeJwtDecode(token);
        const roles: string[] = decodedToken?.roles || [];
        if (roles.includes('ADMIN')) this.router.navigate(['/dashboard/admin']);
        else if (roles.includes('TEACHER'))
          this.router.navigate(['/dashboard/teacher']);
        else if (roles.includes('STUDENT'))
          this.router.navigate(['/dashboard/student']);
        else this.router.navigate(['/dashboard/general']);
      } catch (e) {
        console.error('Failed to decode token for dashboard redirect:', e);
        this.router.navigate(['/home']);
      }
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.quizStarted && !this.isSubmitted) $event.returnValue = true;
  }

  // simple warning UI hook (replace with your toast/modal)
  warningMessage: string | null = null;

  private showWarning(msg: string) {
    this.warningMessage = msg;

    setTimeout(() => {
      this.warningMessage = null;
    }, this.gracePeriodSeconds * 1000); // ✅ dynamic
  }
}
