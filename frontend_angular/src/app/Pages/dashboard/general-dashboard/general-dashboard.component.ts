import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // ✅ Required for Analytics
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { QuizService } from '../../../core/services/QuizService/quiz.service';
import { UserService } from '../../../core/services/UserService/user.service';
import { Quiz } from '../../../../../INTERFACE/quiz';
import { QuizHistory } from '../../../../../INTERFACE/quiz-history';
import { environment } from '../../../../environments/environment';

declare var bootstrap: any;

@Component({
  selector: 'app-general-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './general-dashboard.component.html',
  styleUrl: './general-dashboard.component.css',
})
export class GeneralDashboardComponent implements OnInit {
  // Base API (removes trailing slash if present)
  private api = environment.apiBase.replace(/\/+$/, '');

  // --- STATE MANAGEMENT ---
  currentView: 'dashboard' | 'library' | 'history' | 'settings' = 'dashboard';

  importedQuestionFile: File | null = null;
  isCreatingQuiz = false;

  // User Data
  currentUser: any = {
    name: 'Player',
    email: '',
    profileImageUrl: null,
  };

  institutionDetails = {
  instituteName: 'General',
  instituteLocation: 'Public',
};


  // Settings Data
  passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
  selectedProfileImage: File | null = null;
  imagePreview: string | null = null;

  // Quiz Data
  joinCode: string = '';
  myQuizzes: Quiz[] = [];
  newQuiz = { title: '', description: '' };

  // History Data
  // ================= DASHBOARD METRICS =================
  attemptedCount = 0;
  avgScorePercent = 0;
  historyList: QuizHistory[] = [];
  filteredHistory: QuizHistory[] = [];
  historySearch: string = '';

  // ✅ ANALYTICS DATA
  reportParticipants: any[] = [];
  filteredParticipants: any[] = [];
  selectedReportQuiz: string = '';
  activeFilter: 'ALL' | 'PASS' | 'FAIL' | 'TOP' | 'LOW' = 'ALL';
  // 📅 Date Filters
  fromDate: string | null = null;
  toDate: string | null = null;

  // Track quizId for reloads
  selectedQuizId!: number;

  isDownloading = false;
downloadProgress = 0;

  studentSearch: string = '';

  trackByQuizId = (_: number, q: any) => q.id;
  trackByResultId = (_: number, r: any) => r.id;

  constructor(
    private auth: AuthService,
    private router: Router,
    private quizService: QuizService,
    private userService: UserService,
    private http: HttpClient, // ✅ Injected for Analytics API
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadQuizzes();
    this.loadHistory();

    // Auto-refresh data when changes happen (Create/Delete)
    this.quizService.refreshNeeded$.subscribe(() => {
      this.loadQuizzes();
      this.loadHistory();
    });
  }

  // --- VIEW NAVIGATION ---
  switchView(view: 'dashboard' | 'library' | 'history' | 'settings') {
    this.currentView = view;
    window.scrollTo(0, 0);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/home']);
  }

  // --- API & DATA LOADING ---
  /* ================= PROFILE ================= */
  loadUserProfile() {
    this.userService.getMe().subscribe({
next: (data) => {
  this.currentUser = {
    ...data,
    userType: (data?.userType || 'GENERAL').toUpperCase(),
  };

  if (
    this.currentUser.profileImageUrl &&
    !this.currentUser.profileImageUrl.startsWith('http')
  ) {
    this.currentUser.profileImageUrl =
      `${this.api}/${this.currentUser.profileImageUrl}`;
  }
},

      error: (err) => console.error('Failed to load profile', err),
    });
  }

  /* ================= QUIZZES ================= */

  loadQuizzes() {
    this.quizService.getAll().subscribe({
      next: (data) => (this.myQuizzes = data),
      error: (err) => console.error('Failed to load quizzes', err),
    });
  }

  /* ================= HISTORY ================= */
  loadHistory() {
    this.quizService.getHistory().subscribe({
      next: (data) => {
        // 🔥 Latest attempt first
        this.historyList = data.sort(
          (a, b) =>
            new Date(b.dateAttempted).getTime() -
            new Date(a.dateAttempted).getTime(),
        );
        this.filterHistory();
        // 🔥 REAL-TIME dashboard update
        this.calculateDashboardStats();
      },
      error: () => alert('Failed to load history'),
    });
  }

  filterHistory() {
    if (!this.historySearch) {
      this.filteredHistory = [...this.historyList];
      return;
    }

    const term = this.historySearch.toLowerCase();
    this.filteredHistory = this.historyList.filter(
      (h) =>
        h.quizTitle.toLowerCase().includes(term) ||
        h.quizCode.toLowerCase().includes(term),
    );
  }

  // Helper for progress bars (used in History & Analytics)
  getPercentage(score: number, total: number): number {
    return total === 0 ? 0 : Math.round((score / total) * 100);
  }

  getStatus(score: number, total: number): 'Pass' | 'Fail' {
  if (total === 0) return 'Fail'; // 🔥 IMPORTANT FIX
  return (score / total) >= 0.5 ? 'Pass' : 'Fail';
}


  // ================= DASHBOARD STATS =================
// ================= DASHBOARD STATS =================
calculateDashboardStats(): void {
  this.attemptedCount = this.historyList.length;

  if (this.historyList.length === 0) {
    this.avgScorePercent = 0;
    return;
  }

  const totalScore = this.historyList.reduce(
    (sum, h) => sum + h.score,
    0
  );

  const totalQuestions = this.historyList.reduce(
    (sum, h) => sum + h.totalQuestions,
    0
  );

  this.avgScorePercent = totalQuestions
    ? Math.round((totalScore / totalQuestions) * 100)
    : 0;
}


  // --- ANALYTICS & REPORT LOGIC ---

  openAnalyticsModal(quizId: number, title: string) {
    this.selectedQuizId = quizId;
    this.selectedReportQuiz = title;
    this.activeFilter = 'ALL';
    this.fromDate = null;
    this.toDate = null;
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.http
      .get<any[]>(`${this.api}/api/results/analytics/${this.selectedQuizId}`)
      .subscribe({
        next: (data) => {
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
  applyFilter(type: 'ALL' | 'PASS' | 'FAIL' | 'TOP' | 'LOW') {
    this.activeFilter = type;

    let data = [...this.reportParticipants];

    // Pass / Fail
    if (type === 'PASS') {
      data = data.filter((p) => p.score / p.totalQuestions >= 0.5);
    }
    if (type === 'FAIL') {
      data = data.filter((p) => p.score / p.totalQuestions < 0.5);
    }

    // Sorting
    if (type === 'TOP') data.sort((a, b) => b.score - a.score);
    if (type === 'LOW') data.sort((a, b) => a.score - b.score);

    // 🔍 Student search
    if (this.studentSearch) {
      const term = this.studentSearch.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term),
      );
    }

    this.filteredParticipants = data;
  }

  summary = { total: 0, pass: 0, fail: 0, passPercent: 0 };

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

  getAvatarColor(name: string): string {
    const colors = [
      'bg-primary',
      'bg-success',
      'bg-danger',
      'bg-warning',
      'bg-info',
      'bg-dark',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  answerSheet: any;

  openAnswerSheet(resultId: number) {
    this.selectedResultId = resultId;

    this.http
  .get(`${this.api}/api/results/review/${resultId}`)
  .subscribe({

      next: (data) => {
        this.answerSheet = data;

        const modal = new bootstrap.Modal(
          document.getElementById('answerSheetModal')!,
        );
        modal.show();
      },
      error: () => alert('Failed to load answer sheet'),
    });
  }

  // --- QUIZ ACTIONS ---

  joinQuiz() {
    if (!this.joinCode.trim()) {
      alert('Enter code!');
      return;
    }
    this.router.navigate(['/play', this.joinCode]);
  }

  openCreateModal() {
    this.newQuiz = { title: '', description: '' };
    const modal = new bootstrap.Modal(
      document.getElementById('createQuizModal'),
    );
    modal.show();
  }

  importFile: File | null = null;

  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importFile = input.files[0];
    }
  }

  createQuiz() {
    if (!this.newQuiz.title.trim()) return;

    const formData = new FormData();
    formData.append('title', this.newQuiz.title);
    formData.append('description', this.newQuiz.description || '');

    if (this.importFile) {
      formData.append('file', this.importFile);
    }

    this.http
      .post(`${this.api}/api/quizzes/create-with-import`, formData)
      .subscribe({
        next: (quiz: any) => {
          bootstrap.Modal.getInstance(
            document.getElementById('createQuizModal')!,
          )?.hide();

          // 🔥 redirect to quiz builder WITH imported questions
          this.router.navigate(['/quiz-builder', quiz.id]);
        },
        error: () => alert('Failed to create quiz'),
      });
  }

  // Share quiz link
  copyLink(code: string) {
    const link = `${window.location.origin}/play/${code}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert('Copied link to clipboard!'));
  }

  deleteQuiz(id: number) {
    if (confirm('Are you sure you want to delete this quiz?')) {
      this.quizService.delete(id).subscribe();
    }
  }

  // --- PROFILE SETTINGS ACTIONS ---

  openProfileModal() {
    this.switchView('settings');
  }

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
    const formData = new FormData();
    formData.append('name', this.currentUser.name);
    if (this.selectedProfileImage) {
      formData.append('profileImage', this.selectedProfileImage);
    }

    this.userService.updateProfile(formData).subscribe({
      next: () => {
        alert('Profile updated successfully!');
        this.loadUserProfile();
      },
      error: () => alert('Update failed'),
    });
  }

  changePassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    this.userService.changePassword(this.passwordData).subscribe({
      next: () => {
        alert('Password changed successfully!');
        this.passwordData = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        };
      },
      error: (err) => alert(err.error || 'Password change failed'),
    });
  }

  downloadReport() {
    let params = [];
    if (this.fromDate) params.push(`from=${this.fromDate}`);
    if (this.toDate) params.push(`to=${this.toDate}`);

    const query = params.length ? `?${params.join('&')}` : '';
    const url = `${this.api}/api/results/analytics/${this.selectedQuizId}/download${query}`;

    this.http.get(url, { responseType: 'blob' }).subscribe((blob) => {
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = 'quiz-report.csv';
      a.click();
    });
  }

openDownloadModal(): void {
  const analyticsEl = document.getElementById('analyticsModal');
  if (!analyticsEl) return;

  const analyticsModal = bootstrap.Modal.getInstance(analyticsEl);

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
    { once: true }
  );

  analyticsModal?.hide();
}


confirmDownload(format: 'CSV' | 'PDF') {
  if (!this.selectedQuizId || !this.selectedReportQuiz) {
    alert('Exam info missing');
    return;
  }

  this.isDownloading = true;
  this.downloadProgress = 0;

  const total =
    this.filteredParticipants.length ||
    this.reportParticipants.length ||
    0;

  const safeTitle = this.selectedReportQuiz
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const filename = `${safeTitle}_TotalStudents(${total}).${
  format === 'PDF' ? 'pdf' : 'csv'
}`;

// ✅ ADD THIS BLOCK
let params: string[] = [];

if (this.fromDate) params.push(`from=${this.fromDate}`);
if (this.toDate) params.push(`to=${this.toDate}`);

const query = params.length ? `?${params.join('&')}` : '';

// ✅ MODIFY URL TO INCLUDE QUERY
const url =
  format === 'PDF'
    ? `${this.api}/api/results/analytics/${this.selectedQuizId}/download-pdf${query}`
    : `${this.api}/api/results/analytics/${this.selectedQuizId}/download${query}`;
  this.http
    .get(url, {
      responseType: 'blob',
      observe: 'events',
      reportProgress: true,
    })
    .subscribe({
      next: (event: any) => {
        if (event.type === 1 && event.total) {
          this.downloadProgress = Math.round(
            (event.loaded / event.total) * 100
          );
        }

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

getResultId(p: any): number {
  return p.resultId;
}




  // downloadAnswerSheetPdf() {
  //   if (!this.answerSheet?.resultId) {
  //     alert('Result ID missing');
  //     return;
  //   }

  //   const url = `${this.api}/api/results/review/${this.answerSheet.resultId}/download-pdf`;

  //   this.http.get(url, { responseType: 'blob' }).subscribe({
  //     next: (blob) => {
  //       const a = document.createElement('a');
  //       a.href = window.URL.createObjectURL(blob);
  //       a.download = `answer-sheet-${this.answerSheet.quizCode}.pdf`;
  //       a.click();
  //       window.URL.revokeObjectURL(a.href);
  //     },
  //     error: () => alert('Failed to download PDF')
  //   });
  // }

  selectedResultId!: number;

  downloadAnswerSheetPdf(resultId: number) {
    const url = `${this.api}/api/results/review/${resultId}/download-pdf`;

    this.http
      .get(url, {
        responseType: 'blob',
        observe: 'response', // 👈 IMPORTANT
      })
      .subscribe({
        next: (res) => {
          // 🔥 Extract filename from backend header
          const contentDisposition = res.headers.get('content-disposition');

          let filename = 'answer-sheet.pdf';

          if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match && match[1]) {
              filename = match[1];
            }
          }

          const blob = res.body!;
          const a = document.createElement('a');
          a.href = window.URL.createObjectURL(blob);
          a.download = filename; // ✅ backend filename
          a.click();

          window.URL.revokeObjectURL(a.href);
        },
        error: () => alert('PDF download failed'),
      });
  }

  confirmAndRetake() {
    if (!confirm('Allow this person to retake the quiz?')) return;

    this.http
      .post(
        `${this.api}/api/results/review/${this.selectedResultId}/allow-retake`,
        {},
      )
      .subscribe({
        next: () => {
          this.answerSheet.retakeAllowed = true;
          this.loadHistory(); // 🔥 refresh student dashboard
        },

        error: () => alert('Failed to allow retake'),
      });
  }
  retakeQuiz() {
    if (!this.answerSheet?.retakeAllowed) {
      alert('Retake not allowed yet');
      return;
    }
    this.router.navigate(['/play', this.answerSheet.quizCode]);
  }

  retakeFromHistory(h: QuizHistory) {
    this.router.navigate(['/play', h.quizCode]);
  }

  onQuestionFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importedQuestionFile = input.files[0];
    }
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
}
