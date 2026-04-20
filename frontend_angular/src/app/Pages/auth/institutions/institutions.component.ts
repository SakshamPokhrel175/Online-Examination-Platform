// src/app/Pages/auth/institutions/institutions.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstitutionService } from '../../../core/services/InstitutionService/institution.service';
import { InstitutionDataType } from './../../../../../INTERFACE/institution';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-institutions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './institutions.component.html',
  styleUrls: ['./institutions.component.css'],
})
export class InstitutionsComponent implements OnInit {
  public institutions: InstitutionDataType[] = [];
  public filteredInstitutions: InstitutionDataType[] = [];
  
  @Output() listUpdated = new EventEmitter<number>();

  public searchText = '';
  public showForm = false;
  
  // ✅ FIX: Initialized correctly without 'name'/'image' errors
  public InstitutionData: InstitutionDataType = {
    id: 0,
    instituteName: '',
    instituteLocation: '',
    instituteImage: ''
  };

  public selectedFile: File | null = null;
  public previewUrl: string | ArrayBuffer | null = null;
  public errorMessage = '';
  public isEditMode = false;
  public selectedInstitutionToDelete: InstitutionDataType | null = null;
  // =======================
// Allowed Email Domains
// =======================
public domains: string[] = [];
public newDomain: string = '';


  constructor(private institutionService: InstitutionService) {}

  ngOnInit(): void {
    this.getInstitutions();
    this.institutionService.refreshNeeded$.subscribe(() => {
      this.getInstitutions();
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
  }

  getInstitutions(): void {
    this.institutionService.getInstitutionList().subscribe({
      next: (data) => {
        this.institutions = data || [];
        this.applyFilter();
        this.listUpdated.emit(this.institutions.length);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to load institutions.';
        Swal.fire({ icon: 'error', title: 'Load error', text: this.errorMessage });
      }
    });
  }

  applyFilter() {
    if (!this.searchText) {
      this.filteredInstitutions = [...this.institutions];
    } else {
      const term = this.searchText.toLowerCase();
      this.filteredInstitutions = this.institutions.filter(i => 
        (i.instituteName || '').toLowerCase().includes(term) || 
        (i.instituteLocation || '').toLowerCase().includes(term)
      );
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.previewUrl = reader.result;
      reader.readAsDataURL(this.selectedFile);
    }
  }

onSubmit(): void {
  const name = this.InstitutionData.instituteName?.trim();
  const location = this.InstitutionData.instituteLocation?.trim();

  if (!name || !location) {
    Swal.fire({ icon: 'warning', title: 'Validation', text: 'Name and Location are required.' });
    return;
  }

  if (this.domains.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Domains required',
      text: 'Please add at least one institutional email domain.'
    });
    return;
  }

  const formData = new FormData();
  formData.append('institute_name', name);
  formData.append('institute_location', location);
  if (this.selectedFile) {
    formData.append('institute_image', this.selectedFile);
  }

  Swal.fire({
    title: this.isEditMode ? 'Updating institution...' : 'Creating institution...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  if (this.isEditMode) {
    // ✅ UPDATE FLOW
    this.institutionService.updateInstitution(this.InstitutionData.id, formData).subscribe({
      next: () => {
        // ✅ SAVE DOMAINS AFTER UPDATE
        this.institutionService
          .updateDomains(this.InstitutionData.id, this.domains)
          .subscribe({
            next: () => {
              Swal.close();
              this.handleSuccess('Updated successfully!');
            },
            error: () => {
              Swal.close();
              Swal.fire({
                icon: 'error',
                title: 'Domain save failed',
                text: 'Institution updated, but domains could not be saved.'
              });
            }
          });
      },
      error: (err) => {
        Swal.close();
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Update failed', text: 'Institution update failed.' });
      }
    });

  } else {
    // ✅ CREATE FLOW
    this.institutionService.createInstitution(formData).subscribe({
      next: (created: any) => {
        const institutionId = created?.id;
        if (!institutionId) {
          Swal.close();
          Swal.fire({ icon: 'error', title: 'Error', text: 'Institution ID not returned.' });
          return;
        }

        // ✅ SAVE DOMAINS AFTER CREATE
        this.institutionService
          .updateDomains(institutionId, this.domains)
          .subscribe({
            next: () => {
              Swal.close();
              this.handleSuccess('Created successfully!');
            },
            error: () => {
              Swal.close();
              Swal.fire({
                icon: 'error',
                title: 'Domain save failed',
                text: 'Institution created, but domains could not be saved.'
              });
            }
          });
      },
      error: (err) => {
        Swal.close();
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Creation failed', text: 'Institution creation failed.' });
      }
    });
  }
}


  handleSuccess(msg: string) {
    this.getInstitutions();
    this.resetForm();
    this.showForm = false;

    // Use SweetAlert success notice and emit the updated count once user closes
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: msg,
      timer: 1500,
      showConfirmButton: false
    }).then(() => {
      this.listUpdated.emit(this.institutions.length);
    });
  }

editInstitution(inst: InstitutionDataType) {
  this.InstitutionData = { ...inst };

  // Load domains if present
  this.domains = (inst as any).allowedDomains
    ? [...(inst as any).allowedDomains]
    : [];

  // Auto-suggest if empty
  if (this.domains.length === 0 && inst.instituteName) {
    this.newDomain = this.suggestDomainFromName(inst.instituteName);
  }

  this.previewUrl = inst.instituteImage
    ? this.getBackendUrl(inst.instituteImage)
    : null;

  this.selectedFile = null;
  this.isEditMode = true;
  this.showForm = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


  openDeleteModal(inst: InstitutionDataType) {
    // Use SweetAlert confirmation instead of bootstrap modal for clarity
    Swal.fire({
      title: `Delete "${inst.instituteName}"?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        // perform delete
        this.institutionService.deleteInstitution(inst.id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Deleted', text: 'Institution removed.' });
            this.getInstitutions();
            this.listUpdated.emit(this.institutions.length);
          },
          error: (err) => {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'Delete failed', text: 'Could not delete institution.' });
          }
        });
      }
    });
  }

  // kept for compatibility with template; not used for delete flow anymore
  confirmDelete() {
    if (this.selectedInstitutionToDelete) {
      this.institutionService.deleteInstitution(this.selectedInstitutionToDelete.id).subscribe({
        next: () => {
          this.getInstitutions();
          const el = document.getElementById('deleteModal');
          if(el) bootstrap.Modal.getInstance(el)?.hide();
        },
        error: (err) => {
          console.error(err);
          Swal.fire({ icon: 'error', title: 'Delete failed', text: 'Could not delete institution.' });
        }
      });
    }
  }

resetForm() {
  this.InstitutionData = { id: 0, instituteName: '', instituteLocation: '', instituteImage: '' };
  this.selectedFile = null;
  this.previewUrl = null;
  this.isEditMode = false;
  this.errorMessage = '';
  this.domains = [];
  this.newDomain = '';
}


  /** Convert backend-relative path to absolute or relative depending on environment */
  getBackendUrl(path: string | null | undefined): string {
    if (!path) return '';
    const cleaned = String(path).replace(/^\/+/, '');
    const base = environment.apiBase?.replace(/\/+$/, '') || '';
    return base ? `${base}/${cleaned}` : `/${cleaned}`;
  }

  /** Image error handler — replace broken image with default */
  onImageError(event: Event) {
    const img = event?.target as HTMLImageElement | null;
    if (!img) return;
    // try to use a local default image (keeps UI neat)
    img.src = 'assets/img/default.png';
  }

  // =======================
// Domain helpers
// =======================
addDomain(): void {
  const value = this.newDomain.trim().toLowerCase();
  if (!value) return;

  if (!this.domains.includes(value)) {
    this.domains.push(value);
  }
  this.newDomain = '';
}

removeDomain(domain: string): void {
  this.domains = this.domains.filter(d => d !== domain);
}

// Auto-suggest domain from institution name
suggestDomainFromName(name: string): string {
  if (!name) return '';

  const base = name
    .toLowerCase()
    .replace(/university|college|institute|of|technology|school/g, '')
    .replace(/[^a-z]/g, '')
    .trim();

  return base ? `${base}.ac.in` : '';
}

}
