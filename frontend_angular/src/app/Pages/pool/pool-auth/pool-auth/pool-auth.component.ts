import { Component } from '@angular/core';
import { AuthService } from '../../../../core/services/AuthService/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-pool-auth',
  imports: [FormsModule,NgIf],
  templateUrl: './pool-auth.component.html',
  styleUrl: './pool-auth.component.css'
})
export class PoolAuthComponent {
// ================= UI STATE =================
  isLoginSelected = true;
  loading = false;
  error: string | null = null;

  // ================= FORM MODELS =================
  loginData = {
    email: '',
    password: '',
  };

  signupData = {
    email: '',
    password: '',
    confirmPassword: '',
  };

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  // ================= UI TOGGLES =================
  toggleForm(isLogin: boolean) {
    this.isLoginSelected = isLogin;
    this.error = null;
  }

  // ================= LOGIN =================
  onLogin() {
  this.error = null;

  const email = this.loginData.email.trim();
  const password = this.loginData.password.trim();

  if (!email || !password) {
    this.error = 'Email and password are required';
    return;
  }

  this.loading = true;

  // ✅ CORRECT: Pool-only login
  this.auth.loginPool(email, password).subscribe({
    next: (resp) => {
      this.loading = false;

      // 🔐 Token is already saved by AuthService (via interceptor/tap)
this.router.navigate(['/pool/dashboard']);
    },
    error: (err) => {
      this.loading = false;
      this.error =
        err?.error?.message ||
        'Invalid Pool credentials or wrong login type';
    },
  });
}


  // ================= SIGNUP =================
onSignup() {
  this.error = null;

  const email = this.signupData.email.trim();
  const password = this.signupData.password.trim();
  const confirm = this.signupData.confirmPassword.trim();

  if (!email || !password) {
    this.error = 'Email and password are required';
    return;
  }

  if (password !== confirm) {
    this.error = 'Passwords do not match';
    return;
  }

  this.loading = true;

  // ✅ POOL-ONLY ACCOUNT
  this.auth.register({
    email,
    name: 'Pool Host',
    password,
    roles: ['POOL_USER'],
    userType: 'POOL',
  }).subscribe({
    next: () => {
      this.loading = false;
      this.isLoginSelected = true;
      this.error = 'Pool account created. Please log in.';
    },
    error: (err) => {
      this.loading = false;
      this.error =
        err?.error?.message ||
        'Signup failed. Please try again.';
    },
  });
}


  onForgotPassword(event: Event) {
    event.preventDefault();
    alert('Forgot password flow will be added later');
  }
}