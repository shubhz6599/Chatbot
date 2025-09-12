import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TextToSpeechService {

speak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void,
  onProgress?: (spoken: string, pending: string) => void
) {
  if ('speechSynthesis' in window) {
    this.stop(); // cancel any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-UK';
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onError?.();

    // 👇 Track progress word by word
    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word' || event.name === 'text') {
        const spoken = text.substring(0, event.charIndex);
        const pending = text.substring(event.charIndex);
        onProgress?.(spoken, pending);

        console.log('✅ Spoken so far:', spoken);
        console.log('⏳ Pending:', pending);
      }
    };

    // this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } else {
    console.error('Text-to-speech not supported in this browser.');
  }
}


  stop() {
    window.speechSynthesis.cancel();
  }
}
