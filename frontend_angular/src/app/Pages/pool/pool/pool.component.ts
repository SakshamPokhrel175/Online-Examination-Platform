import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pool',
  imports: [],
  templateUrl: './pool.component.html',
  styleUrl: './pool.component.css'
})
export class PoolComponent {

  constructor(private router: Router) {}

  goToAuth() {
    this.router.navigate(['/pool/auth']);
  }

  joinPool() {
    this.router.navigate(['/pool/join']);
  }
}