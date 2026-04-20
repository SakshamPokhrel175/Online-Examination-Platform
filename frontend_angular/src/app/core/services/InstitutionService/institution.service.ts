import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { InstitutionDataType } from '../../../../../INTERFACE/institution';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InstitutionService {
  private baseUrl = `${environment.apiBase}/api/institutions`.replace(/\/+$/, '');

  // ✅ REAL-TIME SYNC: Subject to notify components to refresh data
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor(private http: HttpClient) {}

  getInstitutionList(): Observable<InstitutionDataType[]> {
    return this.http.get<InstitutionDataType[]>(this.baseUrl);
  }

  getInstituteById(id: number): Observable<InstitutionDataType> {
    return this.http.get<InstitutionDataType>(`${this.baseUrl}/${id}`);
  }
  
  createInstitution(formData: FormData): Observable<any> {
    return this.http.post<any>(this.baseUrl, formData).pipe(
      tap(() => {
        // Notify subscribers to refresh
        this._refreshNeeded$.next();
      })
    );
  }

  updateInstitution(id: number, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, formData).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  deleteInstitution(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  // =======================
// Update allowed email domains
// =======================
updateDomains(id: number, domains: string[]): Observable<any> {
  return this.http.put<any>(
    `${this.baseUrl}/${id}/domains`,
    domains
  ).pipe(
    tap(() => {
      // notify dashboards / stats to refresh if needed
      this._refreshNeeded$.next();
    })
  );
}

}