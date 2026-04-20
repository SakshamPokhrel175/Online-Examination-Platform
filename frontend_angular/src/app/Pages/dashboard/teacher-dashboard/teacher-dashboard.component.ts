import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { QuizService } from '../../../core/services/QuizService/quiz.service';
import { UserService } from '../../../core/services/UserService/user.service';
import { InstitutionService } from '../../../core/services/InstitutionService/institution.service';
import { Quiz } from '../../../../../INTERFACE/quiz';
import { InstitutionDataType } from '../../../../../INTERFACE/institution';
import { environment } from '../../../../environments/environment';
import { ProctoringSocketService } from '../../../core/services/proctoring-socket/proctoring-socket.service';

declare var bootstrap: any;

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.css',
})
export class TeacherDashboardComponent implements OnInit {
  // Normalized API base (removes trailing slash)
  private api = environment.apiBase
    ? environment.apiBase.replace(/\/+$/, '')
    : '';

  p: any;
  selectedQuizId: any;
  // temporary debug helper you can remove later
  debugOpenParticipant(p: any) {
    const candidate = p?.resolvedResultId || this.getResultId(p);
    console.log('DEBUG: participant row', p, 'resolvedId ->', candidate);
    if (!candidate || Number(candidate) <= 0) {
      alert(
        'Missing result id for this participant. See console for the object.',
      );
      return;
    }
    // call the real view method
    this.viewStudentAttempt(Number(candidate));
  }

  // --- VIEW STATE ---
  currentView: 'dashboard' | 'exams' | 'reports' | 'settings' = 'dashboard';

  // --- USER & INSTITUTION DATA ---
  currentUser: {
    email?: string;
    name?: string;
    profileImageUrl?: string | null;
    userType?: string;
    institutionId?: number | null;
  } | null = null;

  institutionDetails: InstitutionDataType = {
    id: 0,
    instituteName: 'My Institution',
    instituteImage: null,
  };

  // Settings Data
  passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
  selectedProfileImage: File | null = null;
  imagePreview: string | null = null;

  // --- QUIZ DATA ---
  myQuizzes: any[] = [];
  newQuiz = { title: '', description: '', timeLimit: 60, scheduledDate: '' };

  // --- ANALYTICS DATA ---
  totalStudents = 0;
  pendingEvaluations = 0;

  avgScorePercent: number = 0;

  isDownloading = false;
  downloadProgress = 0;

  selectedReportQuiz: string = '';
  reportParticipants: any[] = [];
  filteredParticipants: any[] = [];
  activeFilter: 'ALL' | 'PASS' | 'FAIL' | 'TOP' | 'LOW' = 'ALL';

  // --- INDIVIDUAL REVIEW DATA ---
  studentReview: any = null;

  // --- ANALYTICS SEARCH ---
  studentSearch: string = '';
  selectedQuizTitle: string = '';

  liveAlerts: any[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    private userService: UserService,
    private quizService: QuizService,
    private institutionService: InstitutionService,
    private http: HttpClient,
      // 🔥 ADD THIS
  private proctorSocket: ProctoringSocketService
  ) {}

  ngOnInit(): void {
    // 1️⃣ Identity (email, roles, institutionId)
    this.auth.user$.subscribe((identity) => {
      if (!identity) return;

      this.currentUser = {
        email: identity.email,
        userType: identity.userType,
        institutionId: identity.institutionId,
      };

      if (identity.institutionId) {
        this.loadInstitutionDetails(identity.institutionId);
      }
    });

    // 2️⃣ Profile hydration (name, image)
    this.loadUserProfile();

    // 3️⃣ Business data
    this.loadQuizzes();

    this.quizService.refreshNeeded$.subscribe(() => {
      this.loadQuizzes();
    });

    this.proctorSocket.connect('global', (data) => {
  console.log("👨‍🏫 Teacher received:", data);

  this.liveAlerts.unshift(data);

// keep only last 20 alerts
if (this.liveAlerts.length > 20) {
  this.liveAlerts.pop();
}
});

    
  }

  ngOnDestroy(): void {
  this.proctorSocket.disconnect();
}

  // ============================================================
  // 1. DATA LOADING & PROFILE
  // ============================================================

  private makeApiUrl(path: string) {
    // path should not start with a leading slash to avoid '//' when concatenating
    const p = String(path).replace(/^\/+/, '');
    return this.api ? `${this.api}/${p}` : `/${p}`;
  }

  loadUserProfile() {
    this.userService.getMe().subscribe({
      next: (data: any) => {
        if (!data) return;

        let imageUrl = data.profileImageUrl;

        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl =
            (this.api ? `${this.api}/` : '/') + imageUrl.replace(/^\/+/, '');
        }

        this.currentUser = {
          ...this.currentUser,
          name: data.name,
          email: data.email,
          userType: data.userType,
          institutionId:
            data.institution?.id ?? this.currentUser?.institutionId,
          profileImageUrl: imageUrl,
        };
      },
      error: (err) => console.error('Failed to load profile', err),
    });
  }

  loadInstitutionDetails(id: number) {
    this.institutionService.getInstituteById(id).subscribe({
      next: (data: InstitutionDataType) => {
        this.institutionDetails = data || this.institutionDetails;
        if (
          this.institutionDetails.instituteImage &&
          !this.institutionDetails.instituteImage.startsWith('http')
        ) {
          this.institutionDetails.instituteImage =
            (this.api ? `${this.api}/` : '/') +
            this.institutionDetails.instituteImage.replace(/^\/+/, '');
        }
      },
      error: (err) => console.error('Failed to load institution details', err),
    });
  }

  loadQuizzes() {
    this.quizService.getAll().subscribe({
      next: (data: Quiz[]) => {
        // Map and parse description to extract hidden metadata (Time/Schedule)
        this.myQuizzes = (data || []).map((q) => {
          const meta = this.parseDescription(q.description || '');
          return {
            ...q,
            status: q.active ? 'Active' : 'Draft',
            cleanDescription: meta.cleanDesc,
            timeLimit: meta.timeLimit,
            scheduledDate: meta.scheduledDate,
          };
        });

        // Calculate total attempts across all quizzes (Mock logic)
        this.totalStudents = this.myQuizzes.length * 12;
        this.pendingEvaluations = Math.floor(Math.random() * 5);
      },
      error: () => console.error('Failed to load quizzes'),
    });
  }

  parseDescription(desc: string) {
    if (!desc) return { cleanDesc: '', timeLimit: 60, scheduledDate: '' };

    let timeLimit = 60;
    let scheduledDate = '';

    const timeMatch = desc.match(/\[Time:(\d+)\]/);
    const dateMatch = desc.match(/\[Schedule:(.*?)\]/);

    if (timeMatch) timeLimit = parseInt(timeMatch[1]);
    if (dateMatch) scheduledDate = dateMatch[1];

    const cleanDesc = desc
      .replace(/\[Time:\d+\]/, '')
      .replace(/\[Schedule:.*?\]/, '')
      .trim();

    return { cleanDesc, timeLimit, scheduledDate };
  }

  // ============================================================
  // 2. QUIZ MANAGEMENT
  // ============================================================

  openCreateModal() {
    this.newQuiz = {
      title: '',
      description: '',
      timeLimit: 60,
      scheduledDate: '',
    };
    const modal = new bootstrap.Modal(
      document.getElementById('createQuizModal'),
    );
    modal.show();
  }

  createQuiz() {
    if (!this.newQuiz.title.trim()) return;

    let fullDescription = this.newQuiz.description || '';
    if (this.newQuiz.timeLimit) {
      fullDescription += ` [Time:${this.newQuiz.timeLimit}]`;
    }
    if (this.newQuiz.scheduledDate) {
      fullDescription += ` [Schedule:${this.newQuiz.scheduledDate}]`;
    }

    const formData = new FormData();
    formData.append('title', this.newQuiz.title);
    formData.append('description', fullDescription);

    // ✅ THIS WAS MISSING
    if (this.importFile) {
      formData.append('file', this.importFile);
    }

    this.http
      .post(`${this.api}/api/quizzes/create-with-import`, formData)
      .subscribe({
        next: (quiz: any) => {
          const el = document.getElementById('createQuizModal');
          if (el) bootstrap.Modal.getInstance(el)?.hide();

          // reset import
          this.importFile = null;

          // redirect like General
          this.router.navigate(['/quiz-builder', quiz.id]);
        },
        error: () => alert('Failed to create exam'),
      });
  }

  toggleQuizStatus(quiz: any) {
    const original = quiz.active;
    const newStatus = !original;

    quiz.active = newStatus;
    quiz.status = newStatus ? 'Active' : 'Inactive';

    this.quizService.updateStatus(quiz.id, newStatus).subscribe({
      next: (updatedQuiz) => {
        quiz.active = updatedQuiz.active;
        quiz.status = updatedQuiz.active ? 'Active' : 'Inactive';
        this.loadQuizzes();
      },
      error: (err) => {
        quiz.active = original;
        quiz.status = original ? 'Active' : 'Inactive';
        console.error('Failed to update quiz status', err);
        alert('Failed to update quiz status. Please try again.');
      },
    });
  }

  copyLink(code: string) {
    // Use current origin so link works when you serve on network IP or localhost
    const link = `${window.location.origin}/play/${code}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert('Exam Link copied to clipboard!'));
  }

  deleteQuiz(id: number) {
    if (confirm('Are you sure? This will delete the exam and all results.')) {
      this.quizService.delete(id).subscribe({
        next: () => this.loadQuizzes(),
        error: () => alert('Failed to delete quiz'),
      });
    }
  }

  // ============================================================
  // 3. REPORTS & ANALYTICS
  // ============================================================

  /**
   * Attempts to extract a meaningful numeric result id from participant row `p`.
   * Tries many common fields and nested shapes.
   */
  private resolveResultId(p: any): number | null {
    if (!p) return null;

    // candidate field names / nested shapes to try (order matters)
    const candidates: any[] = [
      p.id,
      p.resultId,
      p.quizResultId,
      p.attemptId,
      p.quizAttemptId,
      p.result_id,
      // nested objects
      p.result?.id,
      p.quizResult?.id,
      p.attempt?.id,
      p.result?.resultId,
      p.result?.quizResultId,
      // some backends may use participant.result?.id or similar
      p.participantResultId,
      p.quiz_result_id,
    ];

    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      // strings that contain numbers
      if (typeof c === 'string') {
        const trimmed = c.trim();
        if (trimmed === '') continue;
        const n = Number(trimmed);
        if (Number.isFinite(n) && n > 0) return Math.floor(n);
        // non-numeric string — skip
        continue;
      }
      if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
        return Math.floor(c);
      }
    }

    return null;
  }

  openReportModal(quizId: number, quizTitle: string) {
    this.selectedQuizId = quizId; // ✅ REQUIRED for CSV / PDF download
    this.selectedQuizTitle = quizTitle;
    this.selectedReportQuiz = quizTitle;
    this.activeFilter = 'ALL';
    this.filteredParticipants = [];

    // use the makeApiUrl helper so it works in dev (proxy) and prod
    this.http
      .get<any[]>(this.makeApiUrl(`api/results/analytics/${quizId}`))
      .subscribe({
        next: (data) => {
          console.debug('reportParticipants raw payload:', data);

          // Normalize: resolvedResultId will be numeric > 0 or null
          this.reportParticipants = (data || []).map((p, idx) => {
            const resolvedResultId = this.resolveResultId(p); // you already have resolveResultId helper
            return { ...p, resolvedResultId, _debugIndex: idx };
          });

          console.debug(
            'reportParticipants normalized:',
            this.reportParticipants,
          );

          // expose to filtered list (template will show buttons enabled for rows where resolvedResultId exists)
          this.filteredParticipants = [...this.reportParticipants];

          // Show the modal after change-detection has a chance to render the normalized data.
          const el = document.getElementById('analyticsModal');
          if (!el) {
            console.error('reportModal element not found in DOM');
            return;
          }

          setTimeout(() => {
            try {
              // @ts-ignore
              const modal =
                bootstrap.Modal && bootstrap.Modal.getOrCreateInstance
                  ? // @ts-ignore
                    bootstrap.Modal.getOrCreateInstance(el)
                  : new bootstrap.Modal(el);
              modal.show();
              console.debug('Report modal shown via bootstrap');
            } catch (err) {
              console.error('Failed to show report modal', err);
            }
          }, 0);
        },
        error: (err) => {
          console.error('Failed to load report data', err);
          alert('Failed to load report data. Check backend logs/permissions.');
        },
      });
  }

  applyFilter(type: 'ALL' | 'PASS' | 'FAIL' | 'TOP' | 'LOW') {
    this.activeFilter = type;

    let data = [...this.reportParticipants];

    // 🔍 SEARCH FILTER
    if (this.studentSearch.trim()) {
      const q = this.studentSearch.toLowerCase();
      data = data.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q),
      );
    }

    switch (type) {
      case 'PASS':
        data = data.filter((p) => p.score / p.totalQuestions >= 0.5);
        break;
      case 'FAIL':
        data = data.filter((p) => p.score / p.totalQuestions < 0.5);
        break;
      case 'TOP':
        data = [...data].sort((a, b) => b.score - a.score);
        break;
      case 'LOW':
        data = [...data].sort((a, b) => a.score - b.score);
        break;
    }

    this.filteredParticipants = data;
  }

  viewStudentAttempt(quizResultId: number | null | undefined) {
    if (!quizResultId || Number(quizResultId) <= 0) {
      console.warn(
        'Attempt to view student attempt without a valid quizResultId:',
        quizResultId,
      );
      alert(
        'Cannot open review — missing or invalid result id. Confirm backend returns a numeric result id for this participant.',
      );
      return;
    }

    console.debug('Requesting review for id:', quizResultId);
    this.selectedResultId = quizResultId; // ✅ REQUIRED

    this.http
      .get<any>(this.makeApiUrl(`api/results/review/${quizResultId}`))
      .subscribe({
        next: (data) => {
          this.answerSheet = data;
          const el = document.getElementById('answerSheetModal');
          if (!el) {
            console.error('studentReviewModal element not found in DOM');
            return;
          }
          try {
            // @ts-ignore
            const modal =
              bootstrap.Modal && bootstrap.Modal.getOrCreateInstance
                ? // @ts-ignore
                  bootstrap.Modal.getOrCreateInstance(el)
                : new bootstrap.Modal(el);
            setTimeout(() => modal.show(), 0);
          } catch (err) {
            console.error('Failed to show student review modal', err);
          }
        },
        error: (err) => {
          console.error('Failed to load student review', err);
          if (err && err.status === 404) {
            alert(
              'Student attempt not found (404). The requested result id may not exist or you do not have permission.',
            );
          } else if (err && err.status === 403) {
            alert(
              'Access denied (403). Ensure the teacher account has permission to view result details.',
            );
          } else {
            alert(
              'Could not load student details. Ensure backend permissions are set and check server logs.',
            );
          }
        },
      });
  }

  allowRetake(resultId: number) {
    if (!resultId) {
      alert('Invalid result ID');
      return;
    }

    if (!confirm('Allow this student to retake the exam?')) return;

    this.http
      .post(this.makeApiUrl(`api/results/review/${resultId}/allow-retake`), {})
      .subscribe({
        next: () => {
          alert('Retake allowed successfully');
          if (this.studentReview) {
            this.studentReview.retakeAllowed = true;
          }
        },
        error: () => alert('Failed to allow retake'),
      });
  }

  // ============================================================
  // 5. SETTINGS & UTILS
  // ============================================================

  onProfileImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedProfileImage = input.files[0];
      const reader = new FileReader();
      reader.onload = () => (this.imagePreview = reader.result as string);
      reader.readAsDataURL(this.selectedProfileImage);
    }
  }

  updateProfile() {
    if (!this.currentUser) {
      alert('User not loaded yet. Please wait.');
      return;
    }

    const name = (this.currentUser.name || '').trim();

    if (!name) {
      alert('Name cannot be empty');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);

    if (this.selectedProfileImage) {
      formData.append('profileImage', this.selectedProfileImage);
    }

    this.userService.updateProfile(formData).subscribe({
      next: () => {
        alert('Profile saved!');
        this.imagePreview = null;
        this.selectedProfileImage = null;
        this.loadUserProfile();
      },
      error: (err) => {
        console.error('Profile update failed', err);
        alert(err?.error || 'Update failed');
      },
    });
  }

  changePassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    this.userService.changePassword(this.passwordData).subscribe({
      next: () => {
        alert('Password changed!');
        this.passwordData = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        };
      },
      error: (err) => alert(err.error || 'Failed'),
    });
  }

  getPercentage(score: number, total: number): number {
    return total === 0 ? 0 : Math.round((score / total) * 100);
  }

  getAvatarColor(name: string): string {
    const colors = [
      'bg-primary',
      'bg-success',
      'bg-danger',
      'bg-warning',
      'bg-info',
      'bg-dark',
    ];
    if (!name || name.length === 0) return 'bg-primary';
    return colors[name.charCodeAt(0) % colors.length];
  }

  switchView(view: any) {
    this.currentView = view;
    window.scrollTo(0, 0);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/home']);
  }

  /** Return resolvedResultId previously set on normalized participants (safe accessor used by template) */
  getResultId(p: any): number | null {
    if (!p) return null;
    // If normalized property present use it; otherwise fallback to resolving on the fly
    if (
      p.resolvedResultId &&
      typeof p.resolvedResultId === 'number' &&
      p.resolvedResultId > 0
    )
      return p.resolvedResultId;
    return this.resolveResultId(p);
  }

  downloadAnswerSheetPdf(resultId: number) {
    if (!resultId) {
      alert('Result ID missing');
      return;
    }

    this.http
      .get(this.makeApiUrl(`api/results/review/${resultId}/download-pdf`), {
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: (res) => {
          let filename = 'answer-sheet.pdf';

          const cd = res.headers.get('content-disposition');
          if (cd) {
            const match = cd.match(/filename="(.+)"/);
            if (match && match[1]) filename = match[1];
          }

          const blob = res.body!;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
        },
        error: () => alert('PDF download failed'),
      });
  }

  // downloadReport(format: 'CSV' | 'PDF') {
  //   const url =
  //     format === 'PDF'
  //       ? this.makeApiUrl(`api/results/analytics/${this.selectedQuizId}/download-pdf`)
  //       : this.makeApiUrl(`api/results/analytics/${this.selectedQuizId}/download`);

  //   this.http.get(url, { responseType: 'blob' }).subscribe({
  //     next: (blob) => {
  //       const a = document.createElement('a');
  //       a.href = URL.createObjectURL(blob);
  //       a.download = `exam-report.${format === 'PDF' ? 'pdf' : 'csv'}`;
  //       a.click();
  //       URL.revokeObjectURL(a.href);
  //     },
  //     error: () => alert('Download failed'),
  //   });
  // }

  downloadReport(format: 'CSV' | 'PDF') {
    if (!this.selectedQuizTitle || !this.selectedQuizId) {
      alert('Exam information missing');
      return;
    }

    // 🔐 lock UI
    this.isDownloading = true;
    this.downloadProgress = 0;

    // 👥 count (filtered first, fallback to all)
    const total =
      this.filteredParticipants.length || this.reportParticipants.length || 0;

    // 🧼 safe filename
    const safeTitle = this.selectedQuizTitle
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const filename = `${safeTitle}_TotalStudents(${total}).${
      format === 'PDF' ? 'pdf' : 'csv'
    }`;

    // 📅 ADD HERE
    let params: string[] = [];

    if (this.fromDate) params.push(`from=${this.fromDate}`);
    if (this.toDate) params.push(`to=${this.toDate}`);

    const query = params.length ? `?${params.join('&')}` : '';

    // 🌐 API endpoint
    const url =
      format === 'PDF'
        ? this.makeApiUrl(
            `api/results/analytics/${this.selectedQuizId}/download-pdf${query}`,
          )
        : this.makeApiUrl(
            `api/results/analytics/${this.selectedQuizId}/download${query}`,
          );

    // ⬇️ download with progress
    this.http
      .get(url, {
        responseType: 'blob',
        observe: 'events',
        reportProgress: true,
      })
      .subscribe({
        next: (event: any) => {
          // progress
          if (event.type === 1 && event.total) {
            this.downloadProgress = Math.round(
              (event.loaded / event.total) * 100,
            );
          }

          // completed
          if (event.type === 4) {
            const blob = event.body;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);

            this.isDownloading = false;
            this.downloadProgress = 0;
          }
        },
        error: () => {
          this.isDownloading = false;
          this.downloadProgress = 0;
          alert('Download failed');
        },
      });
  }

  downloadTemplate(type: 'csv' | 'txt') {
    const url = `${this.api}/api/quizzes/templates/${type}`;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `quiz-question-template.${type}`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: () => alert('Failed to download template'),
    });
  }

  importFile: File | null = null;

  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importFile = input.files[0];
    }
  }

  answerSheet: any;

  selectedResultId!: number;

  // openDownloadModal(): void {
  //   const analyticsEl = document.getElementById('analyticsModal');
  //   if (analyticsEl) {
  //     const analyticsModal = bootstrap.Modal.getInstance(analyticsEl);
  //     analyticsModal?.hide();
  //   }

  //   // wait until analytics modal is completely removed
  //   setTimeout(() => {
  //     // 🔥 cleanup leftover backdrops
  //     document.body.classList.remove('modal-open');
  //     document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());

  //     const downloadEl = document.getElementById('downloadFormatModal');
  //     if (!downloadEl) return;

  //     const downloadModal =
  //       bootstrap.Modal.getOrCreateInstance(downloadEl);

  //     downloadModal.show();
  //   }, 350); // slightly more than bootstrap fade
  // }

  // openDownloadModal(): void {
  //   const analyticsEl = document.getElementById('analyticsModal');

  //   if (analyticsEl) {
  //     const analyticsModal = bootstrap.Modal.getInstance(analyticsEl);
  //     analyticsModal?.hide(); // ✅ CLOSE FIRST
  //   }

  //   setTimeout(() => {
  //     const downloadEl = document.getElementById('downloadFormatModal');
  //     if (!downloadEl) return;

  //     const downloadModal = new bootstrap.Modal(downloadEl, {
  //       backdrop: 'static',
  //       keyboard: false
  //     });

  //     downloadModal.show();
  //   }, 300); // wait for close animation
  // }

  openDownloadModal(): void {
    const analyticsEl = document.getElementById('analyticsModal');

    if (analyticsEl) {
      const analyticsModal = bootstrap.Modal.getInstance(analyticsEl);

      // ✅ ADD THIS BLOCK IMMEDIATELY AFTER hide()
      analyticsEl.addEventListener(
        'hidden.bs.modal',
        () => {
          const downloadEl = document.getElementById('downloadFormatModal');
          if (!downloadEl) return;

          const downloadModal = new bootstrap.Modal(downloadEl, {
            backdrop: 'static',
            keyboard: false,
          });

          downloadModal.show();
        },
        { once: true }, // 🔒 prevents duplicate listeners
      );

      analyticsModal?.hide(); // 🔥 trigger close LAST
    }
  }

  summary = { total: 0, pass: 0, fail: 0, passPercent: 0 };

  fromDate: string | null = null;
  toDate: string | null = null;

  loadAnalyticsByDate() {
    let params = [];
    if (this.fromDate) params.push(`from=${this.fromDate}`);
    if (this.toDate) params.push(`to=${this.toDate}`);

    const query = params.length ? `?${params.join('&')}` : '';

    this.http
      .get<
        any[]
      >(`${this.api}/api/results/analytics/${this.selectedQuizId}${query}`)
      .subscribe({
        next: (data) => {
          this.avgScorePercent = this.summary.passPercent;
          this.reportParticipants = data;
          this.applyFilter(this.activeFilter);
          this.summary.total = data.length;
          this.summary.pass = data.filter(
            (p) => p.score / p.totalQuestions >= 0.5,
          ).length;
          this.summary.fail = this.summary.total - this.summary.pass;
          this.summary.passPercent = this.summary.total
            ? Math.round((this.summary.pass * 100) / this.summary.total)
            : 0;
        },
        error: () => alert('Date filter failed'),
      });
  }

  resetDateFilter() {
    this.fromDate = null;
    this.toDate = null;
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.http
      .get<any[]>(`${this.api}/api/results/analytics/${this.selectedQuizId}`)
      .subscribe({
        next: (data) => {
          this.avgScorePercent = this.summary.passPercent;
          this.reportParticipants = data;
          this.filteredParticipants = data;
          this.summary.total = data.length;
          this.summary.pass = data.filter(
            (p) => p.score / p.totalQuestions >= 0.5,
          ).length;
          this.summary.fail = this.summary.total - this.summary.pass;
          this.summary.passPercent = this.summary.total
            ? Math.round((this.summary.pass * 100) / this.summary.total)
            : 0;

          const modal = new bootstrap.Modal(
            document.getElementById('analyticsModal'),
          );
          modal.show();
        },
        error: () => alert('Failed to load analytics'),
      });
  }

  // --- ANALYTICS & REPORT LOGIC ---

  openAnalyticsModal(quizId: number, title: string) {
    this.selectedQuizId = quizId;
    this.selectedQuizTitle = title;
    this.activeFilter = 'ALL';
    this.fromDate = null;
    this.toDate = null;
    this.loadAnalytics();
  }

  private normalizeAnalytics(data: any[]) {
    return (data || []).map((p) => {
      const attempted = p.correct + p.incorrect;
      return {
        ...p,
        notAttempted: Math.max(p.totalQuestions - attempted, 0),
        resolvedResultId: p.resultId ?? null,
      };
    });
  }

  // confirmDownload(format: 'CSV' | 'PDF') {
  //   const el = document.getElementById('downloadFormatModal');
  //   if (el) {
  //     const modal = bootstrap.Modal.getInstance(el);
  //     modal?.hide();
  //   }

  //   setTimeout(() => {
  //     document.body.classList.remove('modal-open');
  //     document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
  //   }, 300);

  //   this.downloadReport(format);
  // }

  confirmDownload(format: 'CSV' | 'PDF') {
    const el = document.getElementById('downloadFormatModal');
    if (el) {
      const modal = bootstrap.Modal.getInstance(el);
      modal?.hide();
    }

    this.downloadReport(format);
  }

  confirmAndRetake() {
    if (!this.selectedResultId) {
      alert('No student attempt selected');
      return;
    }

    if (!confirm('Allow this student to retake the exam?')) {
      return;
    }

    this.allowRetake(this.selectedResultId);
  }
}
