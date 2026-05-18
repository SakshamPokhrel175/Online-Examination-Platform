import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PoolService } from '../../../core/services/PoolService/pool.service';
import { Subscription } from 'rxjs';
import { PoolLiveQuestion } from '../../../core/services/PoolService/pool.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-pool-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pool-host.component.html',
  styleUrl: './pool-host.component.css'
})
export class PoolHostComponent implements OnInit, OnDestroy {

  gamePin = '';

  currentQuestion: PoolLiveQuestion | null = null;
  quizEnded = false;
  isLobby = true;
isLive = false;
playerCount = 0;
timeLeft = 0;


players: any[] = [];
showLeaderboard = false;
autoNextTimer: any;

quizId!: number;



  private subs: Subscription[] = [];

constructor(
  private poolService: PoolService,
  private route: ActivatedRoute
) {}

// ngOnInit(): void {

//   this.quizId = Number(this.route.snapshot.queryParamMap.get('quizId'));

//   if (!this.quizId) {
//     alert('Quiz ID missing');
//     return;
//   }

//   // 🚀 CALL BACKEND TO START GAME
//   this.poolService.startGame(this.quizId).subscribe({
//     next: (res: any) => {

//       this.gamePin = res.gamePin;

//       // Save for safety
//       localStorage.setItem('poolGamePin', this.gamePin);

//       // 🔌 Connect WS
//       this.poolService.connect(this.gamePin);

//       // 🔥 Fetch existing lobby players immediately
// this.poolService.getPlayers(this.gamePin).subscribe(players => {
//   this.players = players;
//   this.playerCount = players.length;
// });



//       // Subscribe streams
// this.subs.push(
//   this.poolService.currentQuestion$.subscribe(q => {
//     this.currentQuestion = q;

//     if (q) {
//       this.isLobby = false;
//       this.isLive = true;
//     }
//   })
// );


//       this.subs.push(
//         this.poolService.endGame$.subscribe(ended => {
//           if (ended) {
//   this.quizEnded = true;
//   document.exitFullscreen?.();

//   setTimeout(() => {
//     window.location.href = '/pool/dashboard';
//   }, 2000);
// }

//         })
//       );

// this.subs.push(
//   this.poolService.scoreboard$.subscribe(data => {
//     if (data && data.players) {

//       // 🔥 Sort by score
//       this.players = [...data.players].sort(
//         (a, b) => b.score - a.score
//       );

//       this.playerCount = this.players.length;

//       // 🏆 Show leaderboard
//       this.showLeaderboard = true;
//       this.isLive = false;
//       this.currentQuestion = null;
//       this.timeLeft = 0;

//       // 🧹 Clear old timer
//       if (this.autoNextTimer) {
//         clearTimeout(this.autoNextTimer);
//       }

//       // ⏳ Auto next after 5 sec (if not ended)
//       this.autoNextTimer = setTimeout(() => {

//         if (!this.quizEnded) {
//           this.showLeaderboard = false;
//           this.poolService.nextQuestion(this.gamePin);
//         }

//       }, 5000);
//     }
//   })
// );



// this.subs.push(
//   this.poolService.timer$.subscribe(t => {
//     this.timeLeft = t;
//   })
// );



//     },
//     error: () => {
//       alert('Failed to start Pool game');
//     }
//   });
// }

ngOnInit(): void {

  this.quizId = Number(this.route.snapshot.queryParamMap.get('quizId'));

  if (!this.quizId) {
    alert('Quiz ID missing');
    return;
  }

  // ✅ CREATE SESSION (ONLY PIN, NO START)
  this.poolService.startGame(this.quizId).subscribe({
    next: (res: any) => {

      this.gamePin = res.gamePin;
      localStorage.setItem('poolGamePin', this.gamePin);

      // 🔌 connect WS
      this.poolService.connect(this.gamePin);

      // 👥 load players
      this.poolService.getPlayers(this.gamePin).subscribe(players => {
        this.players = players;
        this.playerCount = players.length;
      });

      // ✅ STAY IN LOBBY (IMPORTANT)
      this.isLobby = true;
      this.isLive = false;

      // ✅ ONLY subscriptions (NO nextQuestion here)
      this.subs.push(
        this.poolService.currentQuestion$.subscribe(q => {
          this.currentQuestion = q;

          if (q) {
            this.isLobby = false;
            this.isLive = true;
          }
        })
      );

      this.subs.push(
        this.poolService.endGame$.subscribe(ended => {
          if (ended) {
            this.quizEnded = true;
            document.exitFullscreen?.();

            setTimeout(() => {
              window.location.href = '/pool/dashboard';
            }, 2000);
          }
        })
      );

      this.subs.push(
        this.poolService.scoreboard$.subscribe(data => {
          if (data && data.players) {

            this.players = [...data.players].sort(
              (a, b) => b.score - a.score
            );

            this.playerCount = this.players.length;

            this.showLeaderboard = true;
            this.isLive = false;
            this.currentQuestion = null;
            this.timeLeft = 0;

            if (this.autoNextTimer) {
              clearTimeout(this.autoNextTimer);
            }

            this.autoNextTimer = setTimeout(() => {
              if (!this.quizEnded) {
                this.showLeaderboard = false;
                this.poolService.nextQuestion(this.gamePin);
              }
            }, 5000);
          }
        })
      );

      this.subs.push(
        this.poolService.timer$.subscribe(t => {
          this.timeLeft = t;
        })
      );

    },
    error: () => {
      alert('Failed to create session');
    }
  });
}

  // ➡️ Next question
nextQuestion(): void {
  if (!this.gamePin || this.quizEnded) return;

  this.showLeaderboard = false;
  this.isLive = true;

  this.poolService.nextQuestion(this.gamePin);
}



  // ⛔ End game
endGame(): void {
  if (!this.gamePin || this.quizEnded) return;

  this.poolService.endGameWS(this.gamePin);

  setTimeout(() => {
    window.location.href = '/pool/dashboard';
  }, 500);
}


  // 🔁 Restart (same PIN)
  restartGame(): void {
    if (!this.gamePin) return;

    this.quizEnded = false;
    this.currentQuestion = null;

    this.poolService.restartGameWS(this.gamePin);
  }

ngOnDestroy(): void {
  this.subs.forEach(s => s.unsubscribe());

  if (this.autoNextTimer) {
    clearTimeout(this.autoNextTimer);
  }

  this.poolService.disconnect();
}


// startGameLive(): void {

//   if (!this.quizId) return;

//   this.poolService.startGame(this.quizId).subscribe({
//     next: (res: any) => {

//       this.gamePin = res.gamePin;
//       localStorage.setItem('poolGamePin', this.gamePin);

//       // 🔌 connect WS
//       this.poolService.connect(this.gamePin);

//       // 👥 load players
//       this.poolService.getPlayers(this.gamePin).subscribe(players => {
//         this.players = players;
//         this.playerCount = players.length;
//       });

//       // 🎯 NOW start quiz
//       this.isLobby = false;
//       this.isLive = true;

//       this.poolService.nextQuestion(this.gamePin);
//     },
//     error: () => {
//       alert('Failed to start game');
//     }
//   });
// }

startGameLive(): void {

  if (!this.gamePin) return;   // ✅ use gamePin NOT quizId

  this.isLobby = false;
  this.isLive = true;

  // ✅ ONLY start first question
  this.poolService.nextQuestion(this.gamePin);
}

}
