// src/app/core/services/AuthService/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';


export interface LoggedInUser {
  email: string;
  roles: string[];
  userType: string;
  institutionId?: number | null;
  institutionName?: string | null;
}
export interface LoginResponse {
  token: string;
  email: string;
  roles: string[];
  userType: string;
  institutionId?: number | null;
  institutionName?: string | null;
}


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Use environment.apiBase so dev uses '' (relative) and prod can use a host if needed.
  // .replace removes any trailing slash so we don't end up with '//' when building URLs.
  private baseUrl = `${environment.apiBase}/api/auth`.replace(/\/+$/, '');

  private loggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isLoggedIn$ = this.loggedInSubject.asObservable();

  private userSubject = new BehaviorSubject<LoggedInUser | null>(this.getStoredUser());
public user$ = this.userSubject.asObservable();


  constructor(private http: HttpClient) {}

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * Login: sends credentials, on success will automatically extract a token
   * from the response body (if present) and persist it via saveToken().
   *
   * Returns the full HttpResponse (same as before).
   */
  login(email: string, password: string): Observable<HttpResponse<any>> {
    const url = `${this.baseUrl}/login`;
    console.log('AuthService.login -> url', url);
    console.log('AuthService.login -> payload', { email, password });

    return this.http.post<any>(url, { email, password }, { observe: 'response' }).pipe(
      tap({
        next: resp => {
          console.log('login success (full response):', resp);

          // Defensive extraction: backend might use 'token', 'accessToken', 'authToken', etc.
          const body = resp?.body ?? {};
          const token =
            body?.token ??
            body?.accessToken ??
            body?.authToken ??
            body?.access_token ?? // some backends use underscore
            null;

          if (token) {
  this.saveToken(token);

  const user = {
    email: body.email,
    roles: body.roles ?? [],
    userType: body.userType,
    institutionId: body.institutionId ?? null,
    institutionName: body.institutionName ?? null
  };

  localStorage.setItem('user', JSON.stringify(user));
  this.userSubject.next(user);

  console.log('AuthService: token & user profile saved', user);
}
else {
            // No token in body — log full body for debugging
            console.warn('AuthService.login: no token found in response body:', body);
          }
        },
        error: err => {
          console.error('login error (full):', err);
          // show server-provided body if present
          try { console.log('server error body:', err.error); } catch(e){ /* ignore */ }
        }
      })
    );
  }

  /**
   * Alternative method which explicitly returns HttpResponse (unchanged).
   * Kept for compatibility — will NOT auto-save token (use login() above for auto-save).
   */
  loginWithResponse(email: string, password: string): Observable<HttpResponse<any>> {
    const url = `${this.baseUrl}/login`;
    return this.http.post<any>(url, { email, password }, { observe: 'response' });
  }

  register(payload: {
    email: string;
    name: string;
    password: string;
    roles: string[];
    userType: string;
    institutionId?: number | null;
  }): Observable<any> {
    const url = `${this.baseUrl}/register`;
    return this.http.post(url, payload);
  }

    /**
   * New: Verify that the given email belongs to the given institution.
   * Backend contract: POST /api/auth/verify-institution { email, institutionId }
   * Response: { ok: boolean, message?: string, institutionName?: string }
   */
  verifyInstitution(email: string, institutionId: number | string) {
    const url = `${this.baseUrl}/verify-institution`;
    return this.http.post<{ ok: boolean; message?: string; institutionName?: string }>(url, { email, institutionId });
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
    this.loggedInSubject.next(true);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  this.userSubject.next(null);
  this.loggedInSubject.next(false);
}


  isLoggedIn(): boolean {
    return this.hasToken();
  }

  getCurrentUser(): LoggedInUser | null {
  return this.userSubject.value;
}

private getStoredUser(): LoggedInUser | null {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

loginGeneral(email: string, password: string) {
  return this.loginWithRole('/login/general', email, password);
}

loginStudent(email: string, password: string) {
  return this.loginWithRole('/login/student', email, password);
}

loginFaculty(email: string, password: string) {
  return this.loginWithRole('/login/faculty', email, password);
}
loginAdmin(email: string, password: string) {
  return this.http.post(
    `${this.baseUrl}/login/admin`,
    { email, password }
  );
}
loginPool(email: string, password: string) {
  return this.http.post<LoginResponse>(
    `${this.baseUrl}/login/pool`,   // ✅ FIXED URL
    { email, password }
  ).pipe(
    tap(res => {
      // 🔐 Save token
      localStorage.setItem('token', res.token);

      // ✅ Save full user (same format as others)
      const user: LoggedInUser = {
        email: res.email,
        roles: res.roles,
        userType: res.userType,
        institutionId: res.institutionId ?? null,
        institutionName: res.institutionName ?? null
      };

      localStorage.setItem('user', JSON.stringify(user));
      this.userSubject.next(user);
      this.loggedInSubject.next(true);
    })
  );
}





/* 🔒 Internal helper — SAME behavior as login() */
private loginWithRole(
  endpoint: string,
  email: string,
  password: string
): Observable<HttpResponse<any>> {
  const url = `${this.baseUrl}${endpoint}`;

  return this.http.post<any>(url, { email, password }, { observe: 'response' })
    .pipe(
      tap(resp => {
        const body = resp?.body ?? {};
        const token = body?.token;

        if (token) {
          this.saveToken(token);

          const user = {
            email: body.email,
            roles: body.roles ?? [],
            userType: body.userType,
            institutionId: body.institutionId ?? null,
            institutionName: body.institutionName ?? null
          };

          localStorage.setItem('user', JSON.stringify(user));
          this.userSubject.next(user);
        }
      })
    );
}




}
