import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { FeatureComponent } from "../feature/feature.component";
import { RemoteProctoringComponent } from "../remote-proctoring/remote-proctoring.component";
import { PlanComponent } from "../plan/plan.component";
import { HelpComponent } from "../help/help.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FeatureComponent, RemoteProctoringComponent, PlanComponent, HelpComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(private router: Router) {}

  openRoleModal(): void {
    Swal.fire({
      title: '<span class="role-title">Choose your role</span>',
      html: `
        <div class="d-grid gap-2 d-sm-flex justify-content-center align-items-stretch flex-column flex-sm-row" style="gap:12px;">
          <button id="swal-pool" class="btn swal-btn-general w-100 mb-2 mb-sm-0">Pool</button>
          <button id="swal-general" class="btn swal-btn-general w-100 mb-2 mb-sm-0">General</button>
          <button id="swal-student" class="btn swal-btn-student w-100 mb-2 mb-sm-0">Student</button>
          <button id="swal-faculty" class="btn swal-btn-faculty w-100">Faculty</button>
        </div>
      `,
      showCancelButton: true,
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6b7280',
      focusConfirm: false,
      showConfirmButton: false,
      customClass: {
        popup: 'swal-role-popup'
      },
      width: 'min(92%, 540px)',
      didOpen: () => {
        const pol = document.getElementById('swal-pool');
        const gen = document.getElementById('swal-general');
        const stu = document.getElementById('swal-student');
        const fac = document.getElementById('swal-faculty');

        const closeAndNavigate = (path: string) => {
          Swal.close();
          setTimeout(() => this.router.navigate([path]), 120);
        };

        if (pol) pol.addEventListener('click', () => closeAndNavigate('/pool'));
        if (gen) gen.addEventListener('click', () => closeAndNavigate('/auth/general'));
        if (stu) stu.addEventListener('click', () => closeAndNavigate('/auth/student'));
        if (fac) fac.addEventListener('click', () => closeAndNavigate('/auth/faculty'));
      }
    });
  }
}
