// src/app/Pages/auth/institution-users/faculty-auth/faculty-auth.component.ts
import { Component } from '@angular/core';
import { InstitutionSelectionComponent } from "../institution-selector/institution-selector.component";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstitutionDataType } from '../../../../../../INTERFACE/institution';
import { AuthService } from '../../../../core/services/AuthService/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-faculty-auth',
  standalone: true,
  imports: [InstitutionSelectionComponent, CommonModule, FormsModule],
  templateUrl: './faculty-auth.component.html',
  styleUrls: ['./faculty-auth.component.css']
})
export class FacultyAuthComponent {
  selectedInstitution: InstitutionDataType | null = null;
  loginData = { userId: '', password: '' };
  signupData = { email: '', name: '', password: '', confirmPassword: '' };
  loading = false;
  error = '';
  showSignup = false;

  constructor(private auth: AuthService, private router: Router) {}

  onInstitutionSelected(inst: InstitutionDataType | null): void {
    this.selectedInstitution = inst;
    this.error = '';
    this.showSignup = false;
  }

  toggleSignup(show: boolean) {
    this.showSignup = show;
    this.error = '';
  }

  login(): void {
    this.error = '';
    const userId = (this.loginData.userId || '').trim();
    const password = (this.loginData.password || '').trim();

    if (!userId || !password) {
      this.error = 'Please enter credentials';
      Swal.fire({ icon: 'warning', title: 'Missing fields', text: this.error });
      return;
    }

    // If institution selected, verify membership first
    const selectedInstId = this.selectedInstitution ? Number((this.selectedInstitution as any).id) : null;

    // Show global loading modal
    Swal.fire({
      title: 'Signing in...',
      html: 'Please wait while we sign you in.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    this.loading = true;

    const doPerformLogin = () => {
      // perform login request
      this.auth.loginFaculty(userId, password)
.subscribe({
        next: (res: any) => {
          this.loading = false;
          try { Swal.close(); } catch (e) {}
          if (res?.token && typeof this.auth.saveToken === 'function') {
            try { this.auth.saveToken(res.token); } catch (e) { console.warn('saveToken failed', e); }
          }
          Swal.fire({
            icon: 'success',
            title: 'Welcome',
            text: 'Redirecting to your dashboard...',
            timer: 1000,
            showConfirmButton: false,
            willClose: () => this.router.navigateByUrl('/dashboard/teacher')
          });
        },
        error: (err: any) => {
          this.loading = false;
          try { Swal.close(); } catch (e) {}
          console.error('Faculty login error', err);
          this.error = err?.error?.message || 'Login failed';
          Swal.fire({ icon: 'error', title: 'Login failed', text: this.error });
        }
      });
    };

    if (selectedInstId) {
      // verify association with institution first
      this.auth.verifyInstitution(userId, selectedInstId).subscribe({
        next: (resp: any) => {
          if (resp?.ok) {
            // proceed to actual login
            doPerformLogin();
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
      // no institution selected — just login
      doPerformLogin();
    }
  }

  signup(): void {
    this.error = '';
    const email = (this.signupData.email || '').trim();
    const name = (this.signupData.name || '').trim();
    const password = (this.signupData.password || '').trim();
    const confirm = (this.signupData.confirmPassword || '').trim();

    if (!email || !password) {
      this.error = 'Email and password required';
      Swal.fire({ icon: 'warning', title: 'Missing fields', text: this.error });
      return;
    }
    if (password !== confirm) {
      this.error = 'Passwords do not match';
      Swal.fire({ icon: 'warning', title: 'Passwords', text: this.error });
      return;
    }
    if (!this.selectedInstitution) {
      this.error = 'Select your institution first';
      Swal.fire({ icon: 'warning', title: 'Institution', text: this.error });
      return;
    }

    this.loading = true;
    Swal.fire({
      title: 'Registering...',
      html: 'Please wait while we create your account.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const instId: number = Number((this.selectedInstitution as any).id);

    const payload = {
      email,
      name,
      password,
roles: ['TEACHER'],
userType: 'FACULTY',
      institutionId: instId
    };

    this.auth.register(payload).subscribe({
      next: (_: any) => {
        this.loading = false;
        try { Swal.close(); } catch (e) {}
        Swal.fire({ icon: 'success', title: 'Registration successful', text: 'Please login to continue' });
        this.showSignup = false;
        this.loginData.userId = email;
      },
      error: (err: any) => {
        this.loading = false;
        try { Swal.close(); } catch (e) {}
        this.error = err?.error?.message || 'Registration failed';
        console.error('Faculty signup error', err);
        Swal.fire({ icon: 'error', title: 'Registration failed', text: this.error });
      }
    });
  }

  getBackendUrl(path: string | null | undefined): string {
    if (!path) return 'assets/img/default-institution.png';
    const cleaned = String(path).replace(/^\/+/, '');
    const base = (window && (window as any).API_BASE) ? (window as any).API_BASE.replace(/\/+$/, '') : '';
    return base ? `${base}/${cleaned}` : `/${cleaned}`;
  }

  onImageError(event: Event) {
    const img = event?.target as HTMLImageElement | null;
    if (img) {
      img.src = 'assets/img/default-institution.png';
    }
  }
}
