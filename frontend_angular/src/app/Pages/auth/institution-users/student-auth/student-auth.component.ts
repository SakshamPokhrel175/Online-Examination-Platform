// src/app/Pages/auth/institution-users/student-auth/student-auth.component.ts
import { Component } from '@angular/core';
import { InstitutionSelectionComponent } from "../institution-selector/institution-selector.component";
import { InstitutionDataType } from '../../../../../../INTERFACE/institution';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/AuthService/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-student-auth',
  standalone: true,
  imports: [InstitutionSelectionComponent, CommonModule, FormsModule],
  templateUrl: './student-auth.component.html',
  styleUrls: ['./student-auth.component.css']
})
export class StudentAuthComponent {
  selectedInstitution: InstitutionDataType | null = null;
  loginData = { email: '', password: '' };
  signupData = { email: '', name: '', password: '', confirmPassword: '', institutionId: null as number | null };
  isLogin = true;
  loading = false;
  error = '';
  returnUrl: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || null;
  }

  onInstitutionSelected(inst: InstitutionDataType | null): void {
    this.selectedInstitution = inst;
    this.error = '';
    if (inst && (inst as any).id != null) {
      this.signupData.institutionId = Number((inst as any).id);
    } else {
      this.signupData.institutionId = null;
    }
  }

  toggleMode(loginMode: boolean) {
    this.isLogin = loginMode;
    this.error = '';
  }

  async onLogin() {
    this.error = '';
    const email = (this.loginData.email || '').trim();
    const password = (this.loginData.password || '').trim();

    if (!email || !password) {
      this.error = 'Email & password required';
      Swal.fire({ icon: 'warning', title: 'Missing fields', text: this.error });
      return;
    }

    // Show loading SweetAlert
    Swal.fire({
      title: 'Signing in...',
      html: 'Please wait while we sign you in.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    this.loading = true;

    const selectedInstId = this.selectedInstitution ? Number((this.selectedInstitution as any).id) : null;

    const doLogin = () => {
      this.auth.loginStudent(email, password)
.subscribe({
        next: (res: any) => {
          this.loading = false;
          try { Swal.close(); } catch (e) {}
          if (res?.token && typeof this.auth.saveToken === 'function') {
            try { this.auth.saveToken(res.token); } catch (e) { console.warn('saveToken failed', e); }
          }
          Swal.fire({
            icon: 'success',
            title: 'Signed in',
            text: 'Redirecting...',
            timer: 1000,
            showConfirmButton: false,
            willClose: () => {
              const dest = this.returnUrl || '/dashboard/student';
              this.router.navigateByUrl(dest);
            }
          });
        },
        error: (err: any) => {
          this.loading = false;
          try { Swal.close(); } catch (e) {}
          console.error('Student login error', err);
          if (err?.error?.message) {
            this.error = err.error.message;
          } else if (err?.status === 0) {
            this.error = 'Network error — backend unreachable';
          } else if (err?.status === 401) {
            this.error = 'Invalid credentials';
          } else {
            this.error = 'Login failed';
          }
          Swal.fire({ icon: 'error', title: 'Login failed', text: this.error });
        }
      });
    };

    if (selectedInstId) {
      // Verify membership first
      this.auth.verifyInstitution(email, selectedInstId).subscribe({
        next: (resp: any) => {
          if (resp?.ok) {
            doLogin();
          } else {
            this.loading = false;
            try { Swal.close(); } catch (e) {}
            const msg = resp?.message ?? 'This account is not registered with the selected institute.';
            this.error = msg;
            Swal.fire({ icon: 'error', title: 'Verification failed', text: msg });
          }
        },
        error: (err: any) => {
          this.loading = false;
          try { Swal.close(); } catch (e) {}
          console.error('verifyInstitution error', err);
          this.error = 'Unable to verify institution at the moment. Please try again later.';
          Swal.fire({ icon: 'error', title: 'Verification error', text: this.error });
        }
      });
    } else {
      doLogin();
    }
  }

  onSignup() {
    this.error = '';
    const email = (this.signupData.email || '').trim();
    const name = (this.signupData.name || '').trim();
    const password = (this.signupData.password || '').trim();
    const confirm = (this.signupData.confirmPassword || '').trim();

    if (!email || !password) {
      this.error = 'Email & password required';
      Swal.fire({ icon: 'warning', title: 'Missing fields', text: this.error });
      return;
    }
    if (password !== confirm) {
      this.error = 'Passwords do not match';
      Swal.fire({ icon: 'warning', title: 'Passwords', text: this.error });
      return;
    }

    const instIdCandidate = this.signupData.institutionId ?? (this.selectedInstitution ? (this.selectedInstitution as any).id : null);
    const instId = instIdCandidate != null ? Number(instIdCandidate) : null;

    if (!instId) {
      this.error = 'Choose your institution';
      Swal.fire({ icon: 'warning', title: 'Institution', text: this.error });
      return;
    }

    // Show loading
    Swal.fire({
      title: 'Registering...',
      html: 'Please wait while we create your account.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    this.loading = true;

    const payload = {
      email,
      name,
      password,
roles: ['STUDENT'],
userType: 'STUDENT'
,
      institutionId: instId
    };

    this.auth.register(payload).subscribe({
      next: (_: any) => {
        this.loading = false;
        try { Swal.close(); } catch (e) {}
        Swal.fire({ icon: 'success', title: 'Registration successful', text: 'Please login to continue' });
        this.isLogin = true;
        this.loginData.email = email;
      },
      error: (err: any) => {
        this.loading = false;
        try { Swal.close(); } catch (e) {}
        console.error('Student signup error', err);
        this.error = err?.error?.message || 'Registration failed';
        Swal.fire({ icon: 'error', title: 'Registration failed', text: this.error });
      }
    });
  }

  getBackendUrl(path: string | null | undefined): string {
    if (!path) return '/assets/img/default-avatar.png';
    const cleaned = String(path).replace(/^\/+/, '');
    const base = environment.apiBase?.replace(/\/+$/, '') || '';
    return base ? `${base}/${cleaned}` : `/${cleaned}`;
  }

  onImageError(event: Event) {
    const img = event?.target as HTMLImageElement | null;
    if (img) img.src = '/assets/img/default-avatar.png';
  }
}
