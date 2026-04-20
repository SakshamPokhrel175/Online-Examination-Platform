import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ProctoringSocketService {

  private client: Client | null = null;

  connect(quizCode: string, onMessage: (data: any) => void) {

    this.client = new Client({
  webSocketFactory: () => new SockJS(`${environment.apiBase}/ws-proctor`),
  reconnectDelay: 5000,
  debug: (msg) => console.log('[WS]', msg)
});

    this.client.onConnect = () => {
      console.log('✅ Connected to Proctor WebSocket');

      this.client?.subscribe(`/topic/proctor/${quizCode}`, (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log('📩 Proctor Alert:', data);
          onMessage(data);
        } catch (e) {
          console.error('❌ Error parsing message', e);
        }
      });
    };

    this.client.onStompError = (frame) => {
      console.error('❌ Broker error:', frame.headers['message']);
    };

    this.client.activate();
  }
    // ✅ ADD THIS METHOD
  send(message: any) {
    this.client?.publish({
      destination: '/app/proctor/alert',
      body: JSON.stringify(message)
    });
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      console.log('🔌 Proctor WebSocket disconnected');
    }
  }
}