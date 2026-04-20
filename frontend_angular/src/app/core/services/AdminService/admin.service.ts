import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { InstitutionDataType } from '../../../../../INTERFACE/institution';
import { environment } from '../../../../environments/environment';

export interface InstitutionStat {
  institutionId: number;
  name: string;
  studentCount: number;
  facultyCount: number;
}


@Injectable({
  providedIn: 'root'
})
export class AdminService {
  // Use environment.apiBase so dev uses '' (relative) and prod can use a real host if needed
  private baseInstitutions = `${environment.apiBase}/api/institutions`.replace(/\/+$/, '');
  private baseStats = `${environment.apiBase}/api/stats/institutions`.replace(/\/+$/, '');
    private baseStatsRoot = `${environment.apiBase}/api/stats`.replace(/\/+$/, '');


  private institutionsSubject = new BehaviorSubject<InstitutionDataType[]>([]);
  public institutions$ = this.institutionsSubject.asObservable();

  constructor(private http: HttpClient) {
    // initial load
    this.loadInstitutions();

    // polling to keep list fresh every 10s
    interval(10000).pipe(
      switchMap(() => this.fetchInstitutions()),
      catchError(err => {
        console.error('Institutions poll failed', err);
        return of([]);
      })
    ).subscribe(list => this.institutionsSubject.next(list || []));
  }

  // HTTP wrappers
  fetchInstitutions(): Observable<InstitutionDataType[]> {
    return this.http.get<InstitutionDataType[]>(this.baseInstitutions);
  }

  getInstitution(id: number): Observable<InstitutionDataType> {
    return this.http.get<InstitutionDataType>(`${this.baseInstitutions}/${id}`);
  }

  createInstitution(formData: FormData): Observable<any> {
    return this.http.post<any>(this.baseInstitutions, formData).pipe(
      tap(() => this.loadInstitutions())
    );
  }

  updateInstitution(id: number, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.baseInstitutions}/${id}`, formData).pipe(
      tap(() => this.loadInstitutions())
    );
  }

  deleteInstitution(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseInstitutions}/${id}`).pipe(
      tap(() => this.loadInstitutions())
    );
  }

  // stats
  fetchInstitutionStats(): Observable<InstitutionStat[]> {
    return this.http.get<InstitutionStat[]>(this.baseStats);
  }

  // helpers
  loadInstitutions(): void {
    this.fetchInstitutions().subscribe({
      next: list => this.institutionsSubject.next(list || []),
      error: err => console.error('Failed load institutions', err)
    });
  }

  // manual push (for optimistic updates if needed)
  pushLocalInstitutions(list: InstitutionDataType[]) {
    this.institutionsSubject.next(list);
  }
  getGeneralUsersCount(): Observable<number> {
  return this.http.get<number>(`${this.baseStatsRoot}/general-users`);
}


}