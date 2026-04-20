import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoolService } from '../../../core/services/PoolService/pool.service';

@Component({
  selector: 'app-pool-join',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pool-join.component.html',
})
export class PoolJoinComponent {

  gamePin = '';
  nickname = '';
  loading = false;
  errorMessage = '';

  constructor(
    private poolService: PoolService,
    private router: Router
  ) {}

  joinGame() {
    this.errorMessage = '';

    if (!this.gamePin || !this.nickname) {
      this.errorMessage = 'Please enter Game PIN and Nickname';
      return;
    }

    this.loading = true;

    this.poolService.joinGame(this.gamePin, this.nickname).subscribe({
      next: () => {
        localStorage.setItem('poolGamePin', this.gamePin);
        localStorage.setItem('poolNickname', this.nickname);
        this.router.navigate(['/pool/play']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Unable to join game';
      }
    });
  }
}
