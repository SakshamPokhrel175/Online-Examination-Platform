export interface Question {
    id?: number;
    content: string;
    type: 'MCQ' | 'CODING';
    
    // MCQ
    options?: string[];
    correctAnswer?: string;

    // Coding
    allowedLanguage?: string;
    sampleInput?: string;
    sampleOutput?: string;
}