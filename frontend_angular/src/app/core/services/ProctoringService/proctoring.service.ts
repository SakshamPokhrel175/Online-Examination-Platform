import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CaptureListItem {
  user: string;
  files: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProctoringService {
  // use environment.apiBase so dev -> '' (relative) and prod can set a host
  private base = `${environment.apiBase}/api/proctor`.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  listCaptures(user?: string, quizCode?: string): Observable<CaptureListItem[]> {
    const params: any = {};
    if (user) params.user = user;
    if (quizCode) params.quizCode = quizCode;
    return this.http.get<CaptureListItem[]>(`${this.base}/list`, { params });
  }

  getFile(user: string, name: string): Observable<Blob> {
    const params = { user, name };
    // Angular's HttpClient uses responseType:'blob' (typed as any), cast to Observable<Blob>
    return this.http.get(`${this.base}/file`, { params, responseType: 'blob' }) as Observable<Blob>;
  }
}