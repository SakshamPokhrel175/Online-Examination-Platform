import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PoolService } from '../../../core/services/PoolService/pool.service';
import confetti from 'canvas-confetti';
import { SoundService } from '../../../core/services/PoolService/sound.service';



@Component({
  selector: 'app-pool-scoreboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pool-scoreboard.component.html',
})
export class PoolScoreboardComponent implements OnInit, OnDestroy {

  players: any[] = [];
  topThree: any[] = [];
  others: any[] = [];

gameEnded = false;
private confettiFired = false;

  private subs: Subscription[] = [];

constructor(
  private poolService: PoolService,
  private sound: SoundService
) {}

  ngOnInit(): void {

    // 📊 Live scoreboard
    this.subs.push(
      this.poolService.scoreboard$.subscribe((data) => {
        if (data && data.players) {
          const sorted = [...data.players].sort(
            (a, b) => b.score - a.score
          );

          this.players = sorted;

// Always prepare leaderboard
this.topThree = sorted.slice(0, 3);
this.others = sorted.slice(3);

        }
      })
    );

    // ⛔ Game end signal
    this.subs.push(
      this.poolService.endGame$.subscribe((ended) => {
if (ended && !this.confettiFired) {
  this.gameEnded = true;
  this.topThree = this.players.slice(0, 3);
  this.others = this.players.slice(3);

  this.fireConfetti();
  this.sound.playWin();

  this.confettiFired = true;
}

      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }


  private fireConfetti() {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
  });

  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.4 },
    });
  }, 400);
}

}
