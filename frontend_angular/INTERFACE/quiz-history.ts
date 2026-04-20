export interface QuizHistory {
  id: number;
  quizTitle: string;
  quizCode: string;

  // ✅ NEW
  createdByName: string;
  createdByEmail: string;

  score: number;
  totalQuestions: number;
  status: string;
  dateAttempted: string;

  retakeAllowed: boolean;
  attemptNumber: number;
}
