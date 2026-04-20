import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap, map, catchError, of } from 'rxjs';
import { Quiz } from '../../../../../INTERFACE/quiz';
import { QuizHistory } from '../../../../../INTERFACE/quiz-history';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuizService {

  // Use environment.apiBase and strip any trailing slash
  private baseUrl = `${environment.apiBase}/api/quizzes`.replace(/\/+$/, '');
  private resultUrl = `${environment.apiBase}/api/results`.replace(/\/+$/, '');

  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor(private http: HttpClient) {}

  // Get Quiz by code and extract creator's userType
getQuizCreatorTypeByCode(code: string): Observable<string | null> {
  // NOTE: path must match your backend controller: /api/quizzes/code/{code}/creator-type
  return this.http.get<any>(`/api/quizzes/code/${encodeURIComponent(code)}/creator-type`).pipe(
    tap(resp => console.log('QuizService.getQuizCreatorTypeByCode response for', code, resp)),
    map(resp => {
      if (resp == null) return null;

      // If backend returns plain string like "GENERAL"
      if (typeof resp === 'string') {
        return resp.toLowerCase();
      }

      // If backend returns an object, prefer resp.creatorType then other candidates
      const creatorTypeCandidate = resp?.creatorType ?? resp?.type ?? resp?.creator?.type ?? resp ?? null;
      if (creatorTypeCandidate == null) return null;

      return String(creatorTypeCandidate).toLowerCase();
    }),
    // If backend responds 404 or other error, return null so guard will route to student by your current fallback.
    // You can change to of('general') if you prefer to default to general on error.
    catchError(err => {
      console.error('QuizService.getQuizCreatorTypeByCode error for', code, err);
      return of(null);
    })
  );
}


  // Get all quizzes
  getAll(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(this.baseUrl);
  }

  // Update quiz active status
  updateStatus(id: number, active: boolean): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.baseUrl}/${id}/status`, { active }).pipe(
      tap(() => this._refreshNeeded$.next())
    );
  }

  // Get quiz by join code
  getByCode(code: string): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.baseUrl}/code/${code}`);
  }

  // Participation History
  getHistory(): Observable<QuizHistory[]> {
    return this.http.get<QuizHistory[]>(`${this.resultUrl}/history`);
  }

  // Create new quiz
  create(title: string, description: string): Observable<Quiz> {
    return this.http.post<Quiz>(this.baseUrl, { title, description }).pipe(
      tap(() => this._refreshNeeded$.next())
    );
  }

  // Delete quiz
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(
      tap(() => this._refreshNeeded$.next())
    );
  }


  createWithImport(formData: FormData): Observable<Quiz> {
  return this.http.post<Quiz>(
    `${this.baseUrl}/create-with-import`,
    formData
  ).pipe(
    tap(() => this._refreshNeeded$.next())
  );
}

}