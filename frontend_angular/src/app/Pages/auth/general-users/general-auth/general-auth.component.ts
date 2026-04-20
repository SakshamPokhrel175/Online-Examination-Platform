// src/app/Pages/auth/general-users/general-auth/general-auth.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/AuthService/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-general-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './general-auth.component.html',
  styleUrls: ['./general-auth.component.css'],
})
export class GeneralAuthComponent {
  loginData = { email: '', password: '' };
  signupData = { email: '', password: '', confirmPassword: '' };
  isLoginSelected = true;

  loading = false;
  error = '';
  returnUrl: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Capture returnUrl query param if present
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || null;
  }

  toggleForm(isLogin: boolean) {
    this.isLoginSelected = isLogin;
    this.error = '';
  }

  onLogin() {
    this.error = '';

    const email = (this.loginData.email || '').trim();
    const password = (this.loginData.password || '').trim();

    if (!email || !password) {
      this.error = 'Email and password are required';
      // show immediate SweetAlert
      Swal.fire({ icon: 'warning', title: 'Missing fields', text: this.error });
      return;
    }

    this.loading = true;

    // Show SweetAlert loading modal
    Swal.fire({
      title: 'Signing in...',
      html: 'Please wait while we log you in.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Call your AuthService login (assumes it returns an Observable)
this.auth.loginGeneral(email, password).subscribe({
      next: (res: any) => {
        this.loading = false;
        // close loading modal
        try { Swal.close(); } catch (e) {}

        // If token present, save it (preserve your existing AuthService API)
        if (res?.token && typeof this.auth.saveToken === 'function') {
          try { this.auth.saveToken(res.token); } catch (e) { console.warn('saveToken failed', e); }
        }

        // Success toast/modal then redirect
        Swal.fire({
          icon: 'success',
          title: 'Signed in',
          text: 'Redirecting...',
          timer: 1000,
          showConfirmButton: false,
          willClose: () => {
            // If returnUrl is present go there, else default dashboard
            if (this.returnUrl) {
              this.router.navigateByUrl(this.returnUrl);
            } else {
              this.router.navigate(['/dashboard/general']);
            }
          }
        });
      },
      error: (err: any) => {
        this.loading = false;
        // close loading modal
        try { Swal.close(); } catch (e) {}

        console.error('General login error:', err);

        // Friendly message
        if (err?.error?.message) {
          this.error = err.error.message;
        } else if (err?.status === 0) {
          this.error = 'Network error — backend unreachable';
        } else if (err?.status === 401) {
          this.error = 'Invalid credentials';
        } else {
          this.error = 'Login failed. Please try again.';
        }

        // Show SweetAlert error and keep inline error for accessibility
        Swal.fire({
          icon: 'error',
          title: 'Login failed',
          text: this.error
        });
      }
    });
  }

  onSignup() {
    this.error = '';

    const email = (this.signupData.email || '').trim();
    const password = (this.signupData.password || '').trim();
    const confirm = (this.signupData.confirmPassword || '').trim();

    if (!email || !password) {
      this.error = 'Email and password are required';
      Swal.fire({ icon: 'warning', title: 'Missing fields', text: this.error });
      return;
    }
    if (password !== confirm) {
      this.error = 'Passwords do not match';
      Swal.fire({ icon: 'warning', title: 'Passwords', text: this.error });
      return;
    }

    this.loading = true;
    // Create payload as before
    const payload = {
      email,
      name: '',
      password,
      roles: ['GENERAL_USER'],
      userType: 'GENERAL'
    };

    this.auth.register(payload).subscribe({
      next: (_: any) => {
        this.loading = false;
        Swal.fire({
          icon: 'success',
          title: 'Registration successful',
          text: 'Please login to continue'
        });
        this.isLoginSelected = true;
      },
      error: (err: any) => {
        this.loading = false;
        if (err.status === 403) {
          this.error = 'Registration is currently unavailable due to server restrictions.';
        } else {
          this.error = err?.error?.message || 'Registration failed. Please try again.';
        }
        console.error('General signup error:', err);
        Swal.fire({ icon: 'error', title: 'Registration failed', text: this.error });
      }
    });
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    Swal.fire({ icon: 'info', title: 'Pending', text: 'Forgot password functionality to be implemented.' });
  }
}
