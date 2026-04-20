import { Component, OnInit } from '@angular/core';
import { InstitutionsComponent } from '../../auth/institutions/institutions.component';
import { InstitutionsStatsComponent } from './institutions-stats/institutions-stats.component';
import { AuthService } from '../../../core/services/AuthService/auth.service';
import { Router } from '@angular/router';
import { AdminService } from '../../../core/services/AdminService/admin.service';


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    InstitutionsComponent,
    InstitutionsStatsComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  totalInstitutions = 0;
  generalUsersCount = 0;

constructor(
  private auth: AuthService,
  private router: Router,
  private adminService: AdminService
) {}


  ngOnInit(): void {
    this.loadGeneralUsers();
  }

loadGeneralUsers(): void {
  this.adminService.getGeneralUsersCount()
    .subscribe({
      next: count => this.generalUsersCount = count,
      error: err => {
        console.error('Failed to load general users', err);
        this.generalUsersCount = 0;
      }
    });
}


  logout() {
    this.auth.logout();
    this.router.navigate(['/home']);
  }

  updateCount(count: number) {
    this.totalInstitutions = count;
  }
}
