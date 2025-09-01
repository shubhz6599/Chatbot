import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TextToSpeechService {

  speak(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-UK';   // you can change language
      utterance.pitch = 1;        // 0 to 2
      utterance.rate = 1;         // 0.1 to 10
      utterance.volume = 1;       // 0 to 1
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Text-to-speech not supported in this browser.');
    }
  }

  stop() {
    window.speechSynthesis.cancel();
  }
}
