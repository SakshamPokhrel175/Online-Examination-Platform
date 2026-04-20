import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/AuthService/auth.service';
import { HttpResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-auth.component.html',
  styleUrls: ['./admin-auth.component.css']
})
export class AdminAuthComponent {
  adminLoginData = { email: '', password: '' };
  loginError = false;
  loading = false;
  errorMessage = '';

  constructor(private router: Router, private auth: AuthService) {}

  onAdminLogin(): void {
    this.loginError = false;
    this.errorMessage = '';

    const email = (this.adminLoginData.email || '').trim();
    const password = (this.adminLoginData.password || '').trim();

    if (!email || !password) {
      this.loginError = true;
      this.errorMessage = 'Email and password are required.';
      // show immediate sweet alert for form validation
      Swal.fire({
        icon: 'warning',
        title: 'Missing fields',
        text: this.errorMessage
      });
      return;
    }

    // Show SweetAlert loading modal
    Swal.fire({
      title: 'Logging in...',
      html: 'Please wait while we sign you in.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.loading = true;

    // Debug payload
    console.debug('Admin login payload:', { email });

    // Use loginWithResponse to inspect status/headers/body
this.auth.loginAdmin(email, password).subscribe({
  next: (body: any) => {
    this.loading = false;
    try { Swal.close(); } catch {}

    if (body?.token) {
      this.auth.saveToken(body.token);
    }

    const roles: string[] = body?.roles ?? [];

    if (roles.includes('ADMIN')) {
      Swal.fire({
        icon: 'success',
        title: 'Welcome back!',
        text: 'Redirecting to admin dashboard...',
        timer: 1100,
        showConfirmButton: false,
        willClose: () => {
          this.router.navigateByUrl('/dashboard/admin');
        }
      });
    } else {
      this.auth.logout();
      Swal.fire({
        icon: 'error',
        title: 'Access denied',
        text: 'You do not have admin privileges.'
      });
    }
  },
  error: (err: any) => {
    this.loading = false;
    try { Swal.close(); } catch {}

    this.errorMessage =
      err?.error?.message ||
      (err?.status === 401 ? 'Invalid credentials' : 'Login failed');

    Swal.fire({
      icon: 'error',
      title: 'Login failed',
      text: this.errorMessage
    });
  }
});

  }
}
