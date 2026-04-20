import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
private sounds: Record<string, HTMLAudioElement> = {};
  private vibrate(pattern: number | number[]) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }


  private playSound(file: string) {
    if (!this.sounds[file]) {
      const audio = new Audio(`assets/sounds/${file}.mp3`);
      audio.volume = 0.6;
      this.sounds[file] = audio;
    }

    const audio = this.sounds[file];
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

playTick() {
  this.playSound('tick');
  this.vibrate(30); // light tick
}

playAnswer() {
  this.playSound('answer');
  this.vibrate(80); // confirm answer
}

playWin() {
  this.playSound('win');
  this.vibrate([200, 100, 200, 100, 300]); // celebration
}

}