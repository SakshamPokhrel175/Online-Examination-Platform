// src/app/Pages/dashboard/student-dashboard/student-dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { UserService } from '../../../core/services/UserService/user.service';
import { InstitutionService } from '../../../core/services/InstitutionService/institution.service';
import { QuizService } from '../../../core/services/QuizService/quiz.service';
import { QuizHistory } from '../../../../../INTERFACE/quiz-history';
import { InstitutionDataType } from '../../../../../INTERFACE/institution';
import { Quiz } from '../../../../../INTERFACE/quiz';

import { Subject, interval, of, combineLatest } from 'rxjs';
import { takeUntil, startWith, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { LoggedInUser } from '../../../core/services/AuthService/auth.service';


declare var bootstrap: any;

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  // Normalized API base (removes trailing slash). Empty string = dev proxy (relative paths)
  private api = environment.apiBase ? environment.apiBase.replace(/\/+$/, '') : '';

  // UI state
  currentView: 'dashboard' | 'results' | 'settings' = 'dashboard';

  // profile & institution (explicit safe defaults)
currentUser: LoggedInUser & {
  name?: string;
  profileImageUrl?: string | null;
} | null = null;


  institutionDetails: InstitutionDataType = {
    id: 0,
    instituteName: 'My Institution',
    instituteImage: null,
    instituteLocation: ''
  };

  // quiz / history state
  examCode: string = '';
  historyList: QuizHistory[] = [];
  filteredHistory: QuizHistory[] = [];
  stats = { totalTests: 0, avgScore: 0, passed: 0, failed: 0 };

  // ============================
// ANSWER SHEET MODAL (NEW)
// ============================
answerSheet: any = null;
selectedResultId!: number;


  // quizzes
  activeQuizzes: Quiz[] = [];
  upcomingQuizzes: Quiz[] = [];

  // review modal payload
  reviewData: any = null;

  // profile editing
  passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
  selectedProfileImage: File | null = null;
  imagePreview: string | null = null;

  // filters/search
  historySearch: string = '';

  // lifecycle / polling
  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    public router: Router,
    private userService: UserService,
    private institutionService: InstitutionService,
    private quizService: QuizService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.auth.user$
  .pipe(takeUntil(this.destroy$))
  .subscribe(user => {
    if (!user) return;

    this.currentUser = user;

    // Load institution details ONLY ONCE
    if (user.institutionId) {
      this.loadInstitution(user.institutionId);
    }
  });

    // initial load (will also be refreshed by poll immediately)
    this.loadUserProfile();
    this.loadAvailableQuizzes();
    this.loadHistory();

    // subscribe to explicit refresh triggers from services (if emitted elsewhere)
    this.quizService.refreshNeeded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadAvailableQuizzes();
        this.loadHistory();
      });

    // Combined polling: refresh profile, quizzes, history every 15s (start immediately)
interval(15000)
  .pipe(
    startWith(0),
    takeUntil(this.destroy$),
    switchMap(() =>
      combineLatest([
        this.quizService.getAll().pipe(catchError(() => of([] as Quiz[]))),
        this.quizService.getHistory().pipe(catchError(() => of([] as QuizHistory[])))
      ])
    )
  )
  .subscribe(([quizzes, history]) => {
    if (Array.isArray(quizzes)) this.applyIncomingQuizzes(quizzes);
    if (Array.isArray(history)) this.applyIncomingHistory(history);
  });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================
  // Small helper to build URLs that work in dev (proxy) and prod
  // path can be like 'api/users/me' or '/api/users/me'
  // ============================
  private makeApiUrl(path: string) {
    const p = String(path).replace(/^\/+/, '');
    return this.api ? `${this.api}/${p}` : `/${p}`;
  }

  // ============================
  // PROFILE & INSTITUTION
  // ============================
private applyIncomingUser(data: any) {
  if (!this.currentUser) return;

  let imageUrl = data?.profileImageUrl ?? this.currentUser.profileImageUrl;

  // ✅ CRITICAL FIX: normalize relative image paths
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl =
      (this.api ? `${this.api}/` : '/') +
      imageUrl.replace(/^\/+/, '');
  }

  this.currentUser = {
    ...this.currentUser,
    name: data?.name ?? this.currentUser.name,
    profileImageUrl: imageUrl
  };
}



  loadUserProfile() {
    this.userService.getMe()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.applyIncomingUser(data),
        error: (err) => console.error('Failed to load profile', err)
      });
  }

  loadInstitution(id: number) {
    if (!id) return;
    this.institutionService.getInstituteById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const incoming = (data && typeof data === 'object') ? data : {};
          this.institutionDetails = { ...this.institutionDetails, ...incoming };

          if (this.institutionDetails.instituteImage && typeof this.institutionDetails.instituteImage === 'string' &&
              !this.institutionDetails.instituteImage.startsWith('http')) {
            this.institutionDetails.instituteImage = (this.api ? `${this.api}/` : '/') + this.institutionDetails.instituteImage.replace(/^\/+/, '');
          }
        },
        error: (err) => console.error('Failed to load institution', err)
      });
  }

  onProfileImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      this.selectedProfileImage = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result as string;
      reader.readAsDataURL(this.selectedProfileImage);
    }
  }

updateProfile() {
  if (!this.currentUser) {
    console.warn('No current user loaded, aborting profile update');
    return;
  }

  const formData = new FormData();
  formData.append('name', this.currentUser.name ?? '');

  if (this.selectedProfileImage) {
    formData.append('profileImage', this.selectedProfileImage);
  }

  this.userService.updateProfile(formData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        alert('Profile saved!');
        this.imagePreview = null;
        this.selectedProfileImage = null;
        this.loadUserProfile(); // refresh editable fields only
      },
      error: (err) => {
        console.error('Update failed', err);
        alert(err?.error || 'Profile update failed');
      }
    });
}


  changePassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    this.userService.changePassword(this.passwordData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('Password changed!');
          this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
        },
        error: (err) => {
          console.error('Password change failed', err);
          alert(err?.error || 'Failed to change password');
        }
      });
  }

  // ============================
  // QUIZZES (active / upcoming)
  // ============================
  private applyIncomingQuizzes(data: Quiz[]) {
    const now = new Date();
    const upcoming: Quiz[] = [];
    const active: Quiz[] = [];

    (data || []).forEach(q => {
      const scheduled = (q as any)?.scheduledDate ? new Date((q as any).scheduledDate) : null;
      if ((q as any)?.active) {
        if (scheduled && scheduled > now) {
          upcoming.push(q);
        } else {
          active.push(q);
        }
      }
    });

    upcoming.sort((a, b) => {
      const da = (a as any)?.scheduledDate ? new Date((a as any).scheduledDate).getTime() : 0;
      const db = (b as any)?.scheduledDate ? new Date((b as any).scheduledDate).getTime() : 0;
      return da - db;
    });

    // update only when changed to minimize UI churn
    this.activeQuizzes = active;
    this.upcomingQuizzes = upcoming;
  }

  loadAvailableQuizzes() {
    this.quizService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Quiz[]) => this.applyIncomingQuizzes(data || []),
        error: (err) => console.error('Failed to load quizzes', err)
      });
  }

  copyLink(code: string) {
    if (!code) return;
    // Use current origin so link works when you serve on network IP or localhost
    const link = `${window.location.origin}/play/${code}`;
    navigator.clipboard.writeText(link).then(() => alert('Exam link copied to clipboard'));
  }

  // ============================
  // HISTORY / RESULTS
  // ============================

  // helper: sort history list by dateAttempted descending (latest first)
  private sortHistoryByDate(list: QuizHistory[]) {
    return list.sort((a, b) => {
      const ta = a?.dateAttempted ? new Date(a.dateAttempted).getTime() : 0;
      const tb = b?.dateAttempted ? new Date(b.dateAttempted).getTime() : 0;
      return tb - ta; // latest first
    });
  }

  // apply incoming history and keep it sorted newest-first
  private applyIncomingHistory(data: QuizHistory[]) {
    this.historyList = Array.isArray(data) ? data.slice() : [];
    // sort newest first
    this.sortHistoryByDate(this.historyList);
    // update filteredHistory to reflect sorted order (latest first)
    this.filteredHistory = [...this.historyList];
    this.calculateStats();
  }

  loadHistory() {
    this.quizService.getHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.applyIncomingHistory(data || []),
        error: (err) => console.error('Failed to load history', err)
      });
  }

  calculateStats() {
    if (!this.historyList || this.historyList.length === 0) {
      this.stats = { totalTests: 0, avgScore: 0, passed: 0, failed: 0 };
      return;
    }
    this.stats.totalTests = this.historyList.length;
    let totalPct = 0;
    this.stats.passed = 0;
    this.stats.failed = 0;

    this.historyList.forEach(h => {
      const pct = h.totalQuestions ? (h.score / h.totalQuestions) * 100 : 0;
      totalPct += pct;
      if (pct >= 50) this.stats.passed++; else this.stats.failed++;
    });

    this.stats.avgScore = Math.round(totalPct / this.stats.totalTests);
  }

  // filter uses already-sorted historyList so filteredHistory keeps newest-first ordering
  filterHistory() {
    const source = [...this.historyList]; // already sorted newest-first
    if (!this.historySearch || !this.historySearch.trim()) {
      this.filteredHistory = source;
      return;
    }
    const term = this.historySearch.toLowerCase();
    this.filteredHistory = source.filter(h =>
      (h.quizTitle || '').toLowerCase().includes(term) ||
      (h.quizCode || '').toLowerCase().includes(term)
    );
  }

openAnswerSheet(resultId: number) {
  if (!resultId) return;

  this.selectedResultId = resultId;
  this.answerSheet = null;

  this.http
    .get<any>(this.makeApiUrl(`api/results/review/${resultId}`))
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.answerSheet = data;

        const modalEl = document.getElementById('answerSheetModal');
        if (modalEl) {
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        }
      },
      error: (err) => {
        console.error('Failed to load answer sheet', err);
        alert('Could not load answer sheet.');
      }
    });
}


  // ============================
  // NAV & UTILS
  // ============================
  switchView(view: 'dashboard' | 'results' | 'settings') {
    this.currentView = view;
    window.scrollTo(0,0);
  }

  joinExam() {
    if (!this.examCode || !this.examCode.trim()) {
      alert('Please enter an exam code');
      return;
    }
    this.router.navigate(['/play', this.examCode.trim().toUpperCase()]);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/home']);
  }

  getPercentage(score: number, total: number): number {
    return total === 0 ? 0 : Math.round((score / total) * 100);
  }

  getAvatarColor(name: string): string {
    const colors = ['bg-primary', 'bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'bg-dark'];
    if (!name || name.length === 0) return 'bg-primary';
    return colors[name.charCodeAt(0) % colors.length];
  }

  formatDateShort(s: any): string {
    if (!s) return '';
    try {
      const d = new Date(s);
      return d.toLocaleDateString();
    } catch {
      return String(s);
    }
  }

  // small helper: compute a progress width percentage for UI (example usage)
  getProgressWidth(totalTests: number): number {
    const width = totalTests ? (totalTests / 10) * 100 : 0;
    return width > 100 ? 100 : width;
  }


retakeFromHistory(h: QuizHistory) {
  if (!h.retakeAllowed) {
    alert('Retake not allowed for this exam');
    return;
  }
  this.router.navigate(['/play', h.quizCode]);
}

downloadAnswerSheetPdf(resultId: number) {
  if (!resultId) {
    alert('Result ID missing');
    return;
  }

  const url = this.makeApiUrl(
    `api/results/review/${resultId}/download-pdf`
  );

  this.http
    .get(url, {
      responseType: 'blob',
      observe: 'response'
    })
    .subscribe({
      next: (res) => {
        const contentDisposition = res.headers.get('content-disposition');
        let filename = 'answer-sheet.pdf';

        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match?.[1]) filename = match[1];
        }

        const blob = res.body!;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: () => alert('PDF download failed')
    });
}



}
