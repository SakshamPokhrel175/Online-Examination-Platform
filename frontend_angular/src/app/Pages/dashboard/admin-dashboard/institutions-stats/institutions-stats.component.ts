import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, InstitutionStat } from '../../../../core/services/AdminService/admin.service';
import { InstitutionService } from '../../../../core/services/InstitutionService/institution.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-institutions-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './institutions-stats.component.html',
  styleUrls: ['./institutions-stats.component.css']
})
export class InstitutionsStatsComponent implements OnInit, OnDestroy {

  stats: InstitutionStat[] = [];
  loading = true;
  refreshSubscription!: Subscription;

  constructor(
    private adminService: AdminService,
    private institutionService: InstitutionService // Injected to listen for changes
  ) {}

  ngOnInit(): void {
    this.loadStats();

    // ✅ REAL-TIME: Listen for changes made in the other component
    this.refreshSubscription = this.institutionService.refreshNeeded$.subscribe(() => {
      this.loadStats();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadStats(): void {
    this.loading = true;
    this.adminService.fetchInstitutionStats().subscribe({
      next: (data) => {
        this.stats = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Stats error', err);
        this.stats = [];
        this.loading = false;
      }
    });
  }

  animateCount(value: number): number {
  return value; // placeholder (Angular handles change detection)
}
openInstitution(inst: any) {
  console.log('Institution clicked:', inst);
  // later: route or modal
}


}
