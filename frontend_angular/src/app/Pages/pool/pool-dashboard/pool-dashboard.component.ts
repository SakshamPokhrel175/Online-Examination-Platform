import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { environment } from '../../../../environments/environment';

declare var bootstrap: any;

@Component({
  selector: 'app-pool-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pool-dashboard.component.html',
  styleUrl: './pool-dashboard.component.css'
})
export class PoolDashboardComponent implements OnInit {

  private api = environment.apiBase.replace(/\/+$/, '');

  currentUser: any = {};
  myQuizzes: any[] = [];
  newQuiz = { title: '', description: '' };
  importFile: File | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadQuizzes();
  }

  loadUser() {
    this.currentUser = this.auth.getCurrentUser();
  }

  loadQuizzes() {
    this.http.get<any[]>(`${this.api}/api/pool/quizzes`)
.subscribe({
      next: (data) => this.myQuizzes = data,
      error: () => alert('Failed to load quizzes')
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/pool']);
  }

  openCreateModal() {
    const modal = new bootstrap.Modal(
      document.getElementById('createPoolQuizModal')
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

this.http.post(`${this.api}/api/pool/create-with-import`, formData)
      .subscribe({
        next: (quiz: any) => {
          bootstrap.Modal.getInstance(
            document.getElementById('createPoolQuizModal')!
          )?.hide();

          this.router.navigate(['/quiz-builder', quiz.id]);
        },
        error: () => alert('Failed to create quiz')
      });
  }

  startLive(quizId: number) {
    this.router.navigate(['/pool/host'], { queryParams: { quizId } });
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
