export interface Quiz {
  id: number;
  title: string;
  description?: string;
  code: string;
  active: boolean;
  questionsCount: number;
  createdDate: string;

  // ⏱ Timer
  totalTimeMinutes?: number;
  perQuestionTimeSeconds?: number;

  // ⚙ Behavior
  autoSubmit?: boolean;
  shuffleQuestions?: boolean;
  proctoringEnabled?: boolean;

  // 🎓 Mode
  quizMode?: 'PRACTICE' | 'GRADED';
}
