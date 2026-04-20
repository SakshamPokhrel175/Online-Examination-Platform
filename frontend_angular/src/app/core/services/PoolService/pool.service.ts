export interface PoolLiveQuestion {
  questionId: number;
  content: string;
  options: string[];
  questionNumber: number;
  totalQuestions: number;
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root',
})
export class PoolService {

  // ✔ API base
  private baseUrl = `${environment.apiBase}/api/pool`.replace(/\/+$/, '');
  private stompClient: Client | null = null;

  // 🔴 Live streams
  scoreboard$ = new BehaviorSubject<any>(null);
  nextQuestion$ = new BehaviorSubject<boolean>(false);
  currentQuestion$ = new BehaviorSubject<PoolLiveQuestion | null>(null);
  endGame$ = new BehaviorSubject<boolean>(false);
  timer$ = new BehaviorSubject<number>(0);
  result$ = new BehaviorSubject<string | null>(null);




  constructor(private http: HttpClient) {}

  // =========================
  // REST APIs
  // =========================

startGame(quizId: number) {
  return this.http.post(`${environment.apiBase}/api/pool/start/${quizId}`, {});
}


  joinGame(gamePin: string, nickname: string) {
    return this.http.post<any>(`${this.baseUrl}/join`, {
      gamePin,
      nickname,
    });
  }

  getPlayers(gamePin: string) {
    return this.http.get<any[]>(`${this.baseUrl}/players/${gamePin}`);
  }

  // =========================
  // WEBSOCKET
  // =========================

  connect(gamePin: string) {
    // Reset streams on fresh connect
    this.scoreboard$.next(null);
    this.currentQuestion$.next(null);
    this.nextQuestion$.next(false);
    this.endGame$.next(false);

    this.stompClient = new Client({
webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      debug: () => {}, // silence logs
    });

    this.stompClient.onConnect = () => {

      // 📊 Live scoreboard
      this.stompClient!.subscribe(
        `/topic/pool/${gamePin}/scoreboard`,
        (message: IMessage) => {
          this.scoreboard$.next(JSON.parse(message.body));
        }
      );

      // ❓ Live question
      this.stompClient!.subscribe(
        `/topic/pool/${gamePin}/question`,
        (message: IMessage) => {
          this.currentQuestion$.next(JSON.parse(message.body));
        }
      );

      // ➡️ Next question signal (optional)
      this.stompClient!.subscribe(
        `/topic/pool/${gamePin}/next`,
        () => {
          this.nextQuestion$.next(true);
        }
      );

      // ⛔ Game ended
      this.stompClient!.subscribe(
        `/topic/pool/${gamePin}/end`,
        () => {
          this.endGame$.next(true);
        }
      );
      //timer

      // ⏱ Timer
this.stompClient!.subscribe(
  `/topic/pool/${gamePin}/timer`,
  (message: IMessage) => {
    this.timer$.next(Number(message.body));
  }
);

this.stompClient!.subscribe(
  `/topic/pool/${gamePin}/result`,
  (message: IMessage) => {
    this.result$.next(message.body);
  }
);


    };

    this.stompClient.activate();
  }

  sendAnswer(payload: {
    gamePin: string;
    nickname: string;
    questionId: number;
    selectedAnswer: string;
  }) {
    if (!this.stompClient?.connected) return;

    this.stompClient.publish({
      destination: '/app/pool/answer',
      body: JSON.stringify(payload),
    });
  }

  nextQuestion(gamePin: string) {
    if (!this.stompClient?.connected) return;

    this.stompClient.publish({
      destination: '/app/pool/next-question',
      body: gamePin,
    });
  }

  // =========================
  // END GAME (HOST → WS)
  // =========================
  endGameWS(gamePin: string) {
    if (!this.stompClient?.connected) return;

    this.stompClient.publish({
      destination: '/app/pool/end',
      body: gamePin,
    });
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
  }

  restartGameWS(gamePin: string) {
  if (!this.stompClient?.connected) return;

  this.stompClient.publish({
    destination: '/app/pool/restart',
    body: gamePin,
  });
}

}
