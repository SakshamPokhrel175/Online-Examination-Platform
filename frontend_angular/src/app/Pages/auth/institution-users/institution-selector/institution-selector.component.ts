// src/app/Pages/auth/institution-users/institution-selector/institution-selector.component.ts
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { InstitutionDataType } from '../../../../../../INTERFACE/institution';
import { InstitutionService } from '../../../../core/services/InstitutionService/institution.service';
import { AuthService } from '../../../../core/services/AuthService/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-institution-selector',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './institution-selector.component.html',
  styleUrls: ['./institution-selector.component.css']
})
export class InstitutionSelectionComponent implements OnInit {

  public institutions: InstitutionDataType[] = [];
  public filteredInstitutions: InstitutionDataType[] = [];
  public searchText = '';
  public selectedInstitution: InstitutionDataType | null = null;
  public showLoginSuccess = false;

  public loginData = {
    userId: '',
    password: ''
  };

  public loading = false;
  public error = '';

  @Output() public institutionSelected = new EventEmitter<InstitutionDataType | null>();

  constructor(
    private institutionService: InstitutionService,
    private auth: AuthService,
    private router: Router
  ) {}

  public ngOnInit(): void {
    this.fetchInstitutions();
  }

  public fetchInstitutions(): void {
    this.institutionService.getInstitutionList().subscribe({
      next: (data: InstitutionDataType[]) => {
        this.institutions = data || [];
        this.filteredInstitutions = [...this.institutions];
      },
      error: (err: any) => {
        console.error('Failed to load institutions', err);
        this.institutions = [];
        this.filteredInstitutions = [];
      }
    });
  }

  // called from template (typed)
  public onSearch(): void {
    const term = (this.searchText || '').trim().toLowerCase();
    if (term.length >= 3) {
      this.filteredInstitutions = this.institutions.filter(inst => {
        const name = (inst.instituteName || '').toString().toLowerCase();
        return name.includes(term);
      });
    } else {
      this.filteredInstitutions = [];
    }
  }

  public selectInstitution(inst: InstitutionDataType): void {
    this.selectedInstitution = inst;
    this.institutionSelected.emit(inst);
    // reset any previous login state
    this.loginData = { userId: '', password: '' };
    this.error = '';
  }

  public clearInstitution(): void {
    this.selectedInstitution = null;
    this.searchText = '';
    this.loginData = { userId: '', password: '' };
    this.filteredInstitutionListReset();
    this.institutionSelected.emit(null);
    this.error = '';
  }

  private filteredInstitutionListReset(): void {
    this.filteredInstitutions = [...this.institutions];
  }

  /**
   * Main login flow:
   *  - Validate fields
   *  - Show SweetAlert loading
   *  - If institution selected -> call auth.verifyInstitution(userId, instId)
   *  - On verify success -> call auth.login(userId, password)
   *  - On login success -> save token and show success SweetAlert -> redirect
   *  - On any failure -> show error SweetAlert and set inline error
   */
  public login(): void {
    this.error = '';
    const userId = (this.loginData.userId || '').trim();
    const password = (this.loginData.password || '').trim();

    if (!userId || !password) {
      this.error = 'Please enter credentials';
      Swal.fire({ icon: 'warning', title: 'Missing fields', text: this.error });
      return;
    }

    // Show global loading modal
    Swal.fire({
      title: 'Signing in...',
      html: 'Please wait while we sign you in.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.loading = true;

    const instId = this.selectedInstitution ? Number((this.selectedInstitution as any).id) : null;

    const doLogin = () => {
      this.auth.login(userId, password).subscribe({
        next: (res: any) => {
          this.loading = false;
          try { Swal.close(); } catch (e) {}
          // Save token if present
          if (res?.token && typeof this.auth.saveToken === 'function') {
            try { this.auth.saveToken(res.token); } catch (e) { console.warn('saveToken failed', e); }
          }
          this.showLoginSuccess = true;

          Swal.fire({
            icon: 'success',
            title: 'Signed in',
            text: 'Redirecting to dashboard...',
            timer: 1000,
            showConfirmButton: false,
            willClose: () => {
              // Redirect to teacher dashboard by default (matches faculty flow)
              this.router.navigateByUrl('/dashboard/teacher');
            }
          });
        },
        error: (err: any) => {
          this.loading = false;
          try { Swal.close(); } catch (e) {}
          console.error('Login error', err);
          if (err?.error?.message) {
            this.error = err.error.message;
          } else if (err?.status === 0) {
            this.error = 'Network error — backend unreachable';
          } else if (err?.status === 401) {
            this.error = 'Invalid credentials';
          } else {
            this.error = 'Login failed. Please try again.';
          }
          Swal.fire({ icon: 'error', title: 'Login failed', text: this.error });
        }
      });
    };

    if (instId) {
      // Verify association with selected institution first
      this.auth.verifyInstitution(userId, instId).subscribe({
        next: (resp: any) => {
          if (resp?.ok) {
            doLogin();
          } else {
            this.loading = false;
            try { Swal.close(); } catch (e) {}
            const msg = resp?.message ?? 'This account is not registered with the selected institute.';
            this.error = msg;
            Swal.fire({ icon: 'error', title: 'Verification Failed', text: msg });
          }
        },
        error: (err: any) => {
          this.loading = false;
          try { Swal.close(); } catch (e) {}
          console.error('verifyInstitution error', err);
          this.error = 'Unable to verify institution at the moment. Please try again later.';
          Swal.fire({ icon: 'error', title: 'Verification Error', text: this.error });
        }
      });
    } else {
      // no institution selected -> just login
      doLogin();
    }
  }

  /**
   * Convert a backend-relative path (e.g. 'uploads/foo.jpg' or 'institutions/1.png')
   * to an absolute URL in production, or a relative URL in dev so the Angular dev-server proxy handles it.
   */
  getBackendUrl(path: string | null | undefined): string {
    if (!path) return '/assets/img/default-avatar.png';
    const cleaned = String(path).replace(/^\/+/, ''); // remove leading slash(es)
    const base = (environment && environment.apiBase) ? environment.apiBase.replace(/\/+$/, '') : '';
    return base ? `${base}/${cleaned}` : `/${cleaned}`;
  }

  /** Angular image error handler — fall back to default avatar */
  onImageError(event: Event) {
    const img = event?.target as HTMLImageElement | null;
    if (img) img.src = '/assets/img/default-avatar.png';
  }

  /** Build a shareable play link that uses current origin (works on LAN IPs) */
  buildPlayLink(code: string): string {
    return `${window.location.origin}/play/${code}`;
  }

}
