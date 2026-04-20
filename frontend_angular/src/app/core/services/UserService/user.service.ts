import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  // Use apiBase so Angular proxy handles backend calls safely
  private baseUrl = `${environment.apiBase}/api/users`.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  // Get current user details
  getMe(): Observable<any> {
    return this.http.get(`${this.baseUrl}/me`);
  }

  // Update Profile (FormData for image)
  updateProfile(formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/me`, formData);
  }

  // Change Password
  changePassword(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/change-password`, payload, { responseType: 'text' });
  }
}