import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { environment } from '../../../../environments/environment';

declare var bootstrap: any;

@Component({
  selector: 'app-pool-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pool-dashboard.component.html',
  styleUrl: './pool-dashboard.component.css',
})
export class PoolDashboardComponent implements OnInit {
  private api = environment.apiBase.replace(/\/+$/, '');

  currentUser: any = {};
  myQuizzes: any[] = [];

  newQuiz = { title: '', description: '' };
  importFile: File | null = null;

  editQuizData: any = {
    id: null,
    title: '',
    description: '',
    questions: [], // 🔥 ADD THIS
  };

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadQuizzes();
  }

  loadUser() {
    this.currentUser = this.auth.getCurrentUser();
  }

  loadQuizzes() {
    this.http.get<any[]>(`${this.api}/api/pool/quizzes`).subscribe({
      next: (data) => (this.myQuizzes = data),
      error: () => alert('Failed to load quizzes'),
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/pool']);
  }

  // ================= CREATE =================

  openCreateModal() {
    const modal = new bootstrap.Modal(
      document.getElementById('createPoolQuizModal'),
    );
    modal.show();
  }

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
    formData.append('description', this.newQuiz.description);

    if (this.importFile) {
      formData.append('file', this.importFile);
    }

    this.http
      .post(`${this.api}/api/pool/create-with-import`, formData)
      .subscribe({
        next: () => {
          bootstrap.Modal.getInstance(
            document.getElementById('createPoolQuizModal')!,
          )?.hide();

          // reset
          this.newQuiz = { title: '', description: '' };
          this.importFile = null;

          this.loadQuizzes(); // ✅ refresh
        },
        error: () => alert('Failed to create quiz'),
      });
  }

  // ================= START =================

  startLive(quizId: number | string) {
    this.router.navigate(['/pool/host'], { queryParams: { quizId } });
  }

  // ================= EDIT =================

  openEditModal(quiz: any) {
    const quizId = quiz.id || quiz._id;

    this.http.get(`${this.api}/api/pool/${quizId}`).subscribe({
      next: (data: any) => {
        this.editQuizData = {
          id: quizId,
          title: data.title,
          description: data.description,
          questions: (data.questions || []).map((q: any) => ({
            content: q.content || '',
            options: q.options || ['', '', '', ''],
            correctAnswer: q.correctAnswer || '',
          })),
        };

        const modal = new bootstrap.Modal(
          document.getElementById('editPoolQuizModal'),
        );
        modal.show();
      },
    });
  }

  updateQuiz() {
    if (!this.editQuizData.title?.trim()) {
      alert('Title is required');
      return;
    }

    this.http
      .put(`${this.api}/api/pool/${this.editQuizData.id}`, this.editQuizData)
      .subscribe({
        next: () => {
          bootstrap.Modal.getInstance(
            document.getElementById('editPoolQuizModal')!,
          )?.hide();

          this.loadQuizzes();
        },
        error: () => alert('Failed to update quiz'),
      });
  }

  // ================= DELETE =================

  deleteQuiz(id: number | string) {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    this.http
      .delete(`${this.api}/api/pool/delete/${id}`, {
        responseType: 'text', // 🔥 IMPORTANT FIX
      })
      .subscribe({
        next: () => {
          // ✅ instant UI update (no refresh needed)
          this.myQuizzes = this.myQuizzes.filter((q) => (q.id || q._id) !== id);
        },
        error: (err) => {
          console.error('Delete error:', err);
          alert('Failed to delete quiz');
        },
      });
  }

  // ================= TEMPLATE DOWNLOAD =================

  downloadTemplate(type: 'csv' | 'txt') {
    const url = `${this.api}/api/quizzes/templates/${type}`;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `quiz-template.${type}`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: () => alert('Failed to download template'),
    });
  }

  addQuestion() {
    this.editQuizData.questions.push({
      content: '',
      options: ['', '', '', ''],
      correctAnswer: '',
    });
  }

  removeQuestion(index: number) {
    if (this.editQuizData.questions?.length > index) {
      this.editQuizData.questions.splice(index, 1);
    }
  }

  addOption(qIndex: number) {
    if (!this.editQuizData.questions[qIndex].options) {
      this.editQuizData.questions[qIndex].options = [];
    }

    this.editQuizData.questions[qIndex].options.push('');
  }

  removeOption(qIndex: number, optIndex: number) {
    this.editQuizData.questions[qIndex].options.splice(optIndex, 1);
  }
}
