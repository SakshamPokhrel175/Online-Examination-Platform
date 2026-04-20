import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Question } from '../../../../../INTERFACE/question';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuizBuilderService {

  // Question-related APIs
  private questionBaseUrl = `${environment.apiBase}/api/questions`.replace(/\/+$/, '');

  // Quiz-related APIs (for settings)
  private quizBaseUrl = `${environment.apiBase}/api/quizzes`.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  // ---------------- QUESTIONS ----------------

  getQuestions(quizId: number): Observable<Question[]> {
    return this.http.get<Question[]>(`${this.questionBaseUrl}/quiz/${quizId}`);
  }

  addQuestion(quizId: number, question: Question): Observable<Question> {
    return this.http.post<Question>(`${this.questionBaseUrl}/quiz/${quizId}`, question);
  }

  deleteQuestion(id: number): Observable<any> {
    return this.http.delete(`${this.questionBaseUrl}/${id}`);
  }

  // ---------------- QUIZ SETTINGS ----------------

  updateQuizSettings(quizId: number, settings: any): Observable<any> {
    return this.http.put(
      `${this.quizBaseUrl}/${quizId}/settings`,
      settings
    );
  }

  getQuizSettings(quizId: number): Observable<any> {
  return this.http.get(
    `${this.quizBaseUrl}/${quizId}/settings`
  );
}

}
