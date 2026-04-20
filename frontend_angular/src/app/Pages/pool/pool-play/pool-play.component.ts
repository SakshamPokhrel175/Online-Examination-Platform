import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { PoolService } from '../../../core/services/PoolService/pool.service';
import { PoolLiveQuestion } from '../../../core/services/PoolService/pool.service';
import { PoolScoreboardComponent } from '../pool-scoreboard/pool-scoreboard.component';
import { SoundService } from '../../../core/services/PoolService/sound.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-pool-play',
  standalone: true,
imports: [CommonModule, PoolScoreboardComponent],
  templateUrl: './pool-play.component.html',
})
export class PoolPlayComponent implements OnInit, OnDestroy {

  gamePin!: string;
  nickname!: string;
  timeLeft = 0;

  
  correctAnswer: string | null = null;
showResultPhase = false;


  // 🔥 Dynamic question from backend
  currentQuestion: PoolLiveQuestion | null = null;

  answered = false;

  gameEnded = false;

  private subs: Subscription[] = [];
    private fullscreenExitListener!: () => void;
    private popStateHandler!: () => void;
private beforeUnloadHandler!: (event: BeforeUnloadEvent) => void;

  fullscreenBlocked = false;

    // 👀 Tab / app switch detection
  tabSwitchCount = 0;
  maxTabSwitchAllowed = 3;

  awardedPoints = 0;
showPointsAnimation = false;
fastBonus = false;
private currentScore = 0;





constructor(
  private poolService: PoolService,
  private sound: SoundService,
  private router: Router

) {}

  ngOnInit(): void {
const storedPin = localStorage.getItem('poolGamePin');
const storedNick = localStorage.getItem('poolNickname');

if (!storedPin || !storedNick) {
  this.router.navigate(['/']);
  return;
}

this.gamePin = storedPin;
this.nickname = storedNick;


    // 🔌 Connect to WebSocket
    this.poolService.connect(this.gamePin);

    // 📥 Receive live questions
    this.subs.push(
  this.poolService.currentQuestion$.subscribe(
    (q: PoolLiveQuestion | null) => {
if (q) {
  this.currentQuestion = q;
  this.answered = false;
  this.timeLeft = 0;

  this.correctAnswer = null;
  this.showResultPhase = false;
}

    }
  )
);


    // (Optional) reset UI when host moves next
    this.subs.push(
      this.poolService.nextQuestion$.subscribe(() => {
        this.answered = false;
      })
    );

this.subs.push(
  this.poolService.timer$.subscribe(t => {
    this.timeLeft = t;

    // 🔊 Tick sound in last 5 seconds
    if (t > 0 && t <= 5) {
      this.sound.playTick();
    }

    // 📳 Strong vibration in last 3 seconds
    if (t > 0 && t <= 3) {
      this.vibrate(200);
    }
  })
);


// ⛔ Game ended → redirect player to home
this.subs.push(
  this.poolService.endGame$.subscribe(ended => {
    if (ended) {

      this.gameEnded = true;

      // 🛑 Stop everything immediately
      this.currentQuestion = null;
      this.timeLeft = 0;
      this.answered = false;

      // 🔓 Exit fullscreen safely
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      // 🧹 Clear storage
      localStorage.removeItem('poolGamePin');
      localStorage.removeItem('poolNickname');

      // 🛑 Disconnect socket
      this.poolService.disconnect();

      // 🛑 Remove back/refresh blockers BEFORE redirect
      if (this.popStateHandler) {
        window.removeEventListener('popstate', this.popStateHandler);
      }

      if (this.beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      }

      // ✅ Proper Angular redirect
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 500);
    }
  })
);




this.subs.push(
  this.poolService.result$.subscribe(correct => {

  if (correct) {
    this.correctAnswer = correct;
    this.showResultPhase = true;
    this.timeLeft = 0;
    this.answered = true;

    this.vibrate([150, 100, 150]);

    // 🔥 AUTO SWITCH TO LEADERBOARD AFTER 3 SEC
    setTimeout(() => {
      this.currentQuestion = null;
    }, 3000);
  }
})
);

// 🎯 Speed scoring animation
this.subs.push(
  this.poolService.scoreboard$.subscribe(data => {
    if (data && data.players) {

      const me = data.players.find(
        (p: any) => p.nickname === this.nickname
      );

      if (me) {

const previousScore = this.currentScore;
const newScore = me.score;

const diff = newScore - previousScore;

this.currentScore = newScore;


        if (diff > 0) {

          this.awardedPoints = diff;
          if (this.showPointsAnimation) return;
          this.showPointsAnimation = true;

          // 🔥 Fast bonus detection
          if (diff > 150) {
            this.fastBonus = true;
          }

          setTimeout(() => {
            this.showPointsAnimation = false;
            this.fastBonus = false;
          }, 2000);
        }
      }
    }
  })
);






// 🔒 Enforce fullscreen on entry
setTimeout(() => {
  this.enterFullscreen();
  this.watchFullscreenExit();
}, 300);

// 👀 Monitor tab/app switching
this.watchTabVisibility();
// 🚫 Block browser back button
this.lockBackNavigation();


  }

answer(option: string): void {
  if (this.answered || !this.currentQuestion) return;

  this.answered = true;
  this.sound.playAnswer();

  // 📳 Short confirmation vibration
  this.vibrate(80);

  this.poolService.sendAnswer({
    gamePin: this.gamePin,
    nickname: this.nickname,
    questionId: this.currentQuestion.questionId,
    selectedAnswer: option,
  });
}


  // 📳 Mobile vibration helper
private vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// 🔒 Force fullscreen
private enterFullscreen() {
  const el = document.documentElement as any;

  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  }
}

// 🚨 Detect fullscreen exit
private watchFullscreenExit() {
  this.fullscreenExitListener = () => {
    if (!document.fullscreenElement) {
      this.fullscreenBlocked = true;
      alert('⚠ Fullscreen is required to continue the quiz.');
    }
  };

  document.addEventListener(
    'fullscreenchange',
    this.fullscreenExitListener
  );
}


// 👀 Detect tab / app switch
private watchTabVisibility() {
  document.addEventListener('visibilitychange', () => {
if (document.hidden && !this.gameEnded && this.currentQuestion){
      this.tabSwitchCount++;

      // 📳 strong vibration on violation
      this.vibrate([200, 100, 200]);

      if (this.tabSwitchCount <= this.maxTabSwitchAllowed) {
        alert(
          `⚠ You switched tabs/app!\n` +
          `Warning ${this.tabSwitchCount}/${this.maxTabSwitchAllowed}`
        );
      } else {
        alert(
          '🚫 Too many tab switches detected.\nQuiz integrity violated.'
        );

        // 🔥 HARD STOP (frontend only for now)
        this.currentQuestion = null;
        this.timeLeft = 0;
      }
    }
  });
}

// 🚫 Prevent Back Navigation
private lockBackNavigation() {

  // Push fake history state
  history.pushState(null, '', location.href);

  this.popStateHandler = () => {
    if (!this.gameEnded) {
      history.pushState(null, '', location.href);
      alert('⚠ You cannot leave during the quiz!');
    }
  };

  window.addEventListener('popstate', this.popStateHandler);

  // 🚫 Prevent refresh / close
  this.beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    if (!this.gameEnded) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', this.beforeUnloadHandler);
}



ngOnDestroy(): void {
  this.subs.forEach(s => s.unsubscribe());
  this.poolService.disconnect();

  if (this.fullscreenExitListener) {
    document.removeEventListener(
      'fullscreenchange',
      this.fullscreenExitListener
    );
  }

  if (this.popStateHandler) {
  window.removeEventListener('popstate', this.popStateHandler);
}

if (this.beforeUnloadHandler) {
  window.removeEventListener('beforeunload', this.beforeUnloadHandler);
}

}

}
