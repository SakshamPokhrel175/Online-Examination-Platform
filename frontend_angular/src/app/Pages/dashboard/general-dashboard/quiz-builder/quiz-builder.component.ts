import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizBuilderService } from '../../../../core/services/QuizBuilderService/quiz-builder.service';
import { Question } from '../../../../../../INTERFACE/question';
import { AuthService } from '../../../../core/services/AuthService/auth.service'; // ✅ Import AuthService
import { jwtDecode } from 'jwt-decode'; // ✅ Import jwt-decode

@Component({
  selector: 'app-quiz-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-builder.component.html',
  styleUrls: ['./quiz-builder.component.css']
})
export class QuizBuilderComponent implements OnInit {
    // ✅ ADD THIS LINE
  activeTab: 'QUESTIONS' | 'SETTINGS' = 'QUESTIONS';
  quizId!: number;
  questions: Question[] = [];


quiz: any = {
  title: '',
  description: '',
  totalTimeMinutes: 30,
  perQuestionTimeSeconds: null,
  autoSubmit: true,
  shuffleQuestions: true,
  proctoringEnabled: true,
  quizMode: 'GRADED'
};

  
  // Current Question Form Data
  newQuestion: Question = {
    content: '',
    type: 'MCQ',
    options: ['', '', '', ''], // Default 4 options
    correctAnswer: '',
    allowedLanguage: 'JAVA',
    sampleInput: '',
    sampleOutput: ''
  };

  isSaving = false;

  constructor(
    private route: ActivatedRoute,
    private builderService: QuizBuilderService,
    private router: Router,
    private authService: AuthService // ✅ Inject AuthService
  ) {}

ngOnInit(): void {
  this.quizId = Number(this.route.snapshot.paramMap.get('id'));

  // 🔁 Delay to ensure imported questions are committed before fetch
  setTimeout(() => {
    this.loadQuestions();
    this.loadSettings();
  }, 300);
}


  loadQuestions() {
    this.builderService.getQuestions(this.quizId).subscribe({
      next: (data) => this.questions = data,
      error: (err) => console.error(err)
    });
  }

  // Switch between MCQ and Coding tabs in the form
  // setType(type: 'MCQ' | 'CODING') {
  //   this.newQuestion.type = type;
  //   // Reset fields to avoid confusion
  //   if (type === 'MCQ') {
  //     this.newQuestion.options = ['', '', '', ''];
  //     this.newQuestion.correctAnswer = '';
  //   } else {
  //     this.newQuestion.allowedLanguage = 'JAVA';
  //   }
  // }

    setType(type: 'MCQ' | 'CODING') {
    this.newQuestion.type = type;
  }

  // Manage MCQ Options
  trackByFn(index: number, item: any) { return index; }
  
  addOption() {
    this.newQuestion.options?.push('');
  }

  removeOption(index: number) {
    if (this.newQuestion.options && this.newQuestion.options.length > 2) {
      this.newQuestion.options.splice(index, 1);
    }
  }

  // Save to Backend
  saveQuestion() {
    if (!this.newQuestion.content.trim()) {
      alert('Question text is required');
      return;
    }

    // specific validation
    if (this.newQuestion.type === 'MCQ') {
      if (!this.newQuestion.correctAnswer) {
        alert('Please select the correct answer.');
        return;
      }
      // Filter out empty options
      this.newQuestion.options = this.newQuestion.options?.filter(opt => opt.trim() !== '');
    }

    this.isSaving = true;
    this.builderService.addQuestion(this.quizId, this.newQuestion).subscribe({
      next: () => {
        this.isSaving = false;
        this.loadQuestions();
        this.resetForm();
        alert('Question Added!');
      },
      error: (err) => {
        console.error(err);
        this.isSaving = false;
      }
    });
  }

  deleteQuestion(id: number | undefined) {
    if (!id) return;
    if (confirm('Delete this question?')) {
      this.builderService.deleteQuestion(id).subscribe(() => this.loadQuestions());
    }
  }

saveSettings() {
  this.builderService
    .updateQuizSettings(this.quizId, this.quiz)
    .subscribe({
      next: () => alert('Settings saved successfully'),
      error: err => console.error('Failed to save settings', err)
    });
}


  resetForm() {
    this.newQuestion = {
      content: '',
      type: 'MCQ',
      options: ['', '', '', ''],
      correctAnswer: '',
      allowedLanguage: 'JAVA',
      sampleInput: '',
      sampleOutput: ''
    };
  }
  

  // ✅ FIX: Dynamic Redirect based on Role
// goBack() {
//   const token = this.authService.getToken();

//   if (!token) {
//     this.router.navigate(['/home']);
//     return;
//   }

//   try {
//     const decodedToken: any = jwtDecode(token);
//     const roles: string[] = decodedToken.roles || [];

//     // 🔴 ADMIN
//     if (roles.includes('ADMIN')) {
//       this.router.navigate(['/dashboard/admin']);
//       return;
//     }

//     // 🟣 POOL
//     if (roles.includes('POOL_USER')) {
//       this.router.navigate(['/pool/dashboard']);
//       return;
//     }

//     // 🟡 TEACHER (Faculty)
//     if (roles.includes('TEACHER')) {
//       this.router.navigate(['/dashboard/teacher']);
//       return;
//     }

//     // 🔵 STUDENT
//     if (roles.includes('STUDENT')) {
//       this.router.navigate(['/dashboard/student']);
//       return;
//     }

//     // 🟢 GENERAL
//     if (roles.includes('GENERAL_USER')) {
//       this.router.navigate(['/dashboard/general']);
//       return;
//     }

//     // fallback
//     this.router.navigate(['/home']);

//   } catch (e) {
//     console.error("Failed to decode token for redirect:", e);
//     this.router.navigate(['/home']);
//   }
// }


goBack() {
  const user = this.authService.getCurrentUser();

  if (!user) {
    this.router.navigate(['/home']);
    return;
  }

  if (user.roles?.includes('POOL_USER')) {
    this.router.navigate(['/pool/dashboard']);
    return;
  }

  if (user.roles?.includes('ADMIN')) {
    this.router.navigate(['/dashboard/admin']);
    return;
  }

  if (user.roles?.includes('TEACHER')) {
    this.router.navigate(['/dashboard/teacher']);
    return;
  }

  if (user.roles?.includes('STUDENT')) {
    this.router.navigate(['/dashboard/student']);
    return;
  }

  this.router.navigate(['/dashboard/general']);
}



loadSettings() {
  this.builderService.getQuizSettings(this.quizId).subscribe({
    next: data => this.quiz = data,
    error: () => {
      console.warn('Settings unavailable, continuing without them');
    }
  });
}


}
