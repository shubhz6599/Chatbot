// // To Handle everything from UI
// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root'
// })
// export class TextToSpeechService {
//   private availableVoices: SpeechSynthesisVoice[] = [];

//   constructor() {
//     if ('speechSynthesis' in window) {
//       window.speechSynthesis.onvoiceschanged = () => {
//         this.availableVoices = window.speechSynthesis.getVoices();
//         console.log(
//           'Loaded voices:',
//           this.availableVoices.map(v => `${v.name} (${v.lang})`)
//         );
//       };

//       // trigger load
//       this.availableVoices = window.speechSynthesis.getVoices();
//     }
//   }

//   speak(
//     text: string,
//     onStart?: () => void,
//     onEnd?: () => void,
//     onError?: () => void,
//     onProgress?: (spoken: string, pending: string) => void
//   ) {
//     if (!text) return;

//     // Convert any HTML to visible plain text
//     const plain = this.extractVisibleText(text);

//         // If nothing meaningful left after stripping HTML, skip speaking
//     if (!plain || !plain.trim()) {
//       console.log('TTS: nothing to speak after stripping HTML');
//       return;
//     }

//     if ('speechSynthesis' in window) {
//       this.stop(); // cancel any ongoing speech

//       const utterance = new SpeechSynthesisUtterance(plain);
//       const lang = this.detectLanguage(plain);
//       utterance.lang = lang;

//       const voice = this.getIndianVoice(lang);
//       if (voice) {
//         utterance.voice = voice;
//         console.log('Using voice:', voice.name, voice.lang);
//       } else {
//         console.warn('⚠️ No Indian voice found, using browser default');
//       }

//       utterance.pitch = 1;
//       utterance.rate = 1;
//       utterance.volume = 1;

//       utterance.onstart = () => onStart?.();
//       utterance.onend = () => onEnd?.();
//       utterance.onerror = () => onError?.();

//           // Track progress
//       utterance.onboundary = (event: SpeechSynthesisEvent) => {
//             // event.charIndex gives the current character index
//         if (typeof event.charIndex === 'number') {
//           const spoken = plain.substring(0, event.charIndex);
//           const pending = plain.substring(event.charIndex);
//           onProgress?.(spoken, pending);
//         }
//       };

//       window.speechSynthesis.speak(utterance);
//     }
//   }

//   stop() {
//     if ('speechSynthesis' in window) {
//       window.speechSynthesis.cancel();
//     }
//   }

//   /** Prioritize Indian voices if available */
// /** Try to pick the best Indian voice available */
// private getIndianVoice(lang: string): SpeechSynthesisVoice | null {
//   if (!this.availableVoices.length) {
//     this.availableVoices = window.speechSynthesis.getVoices();
//   }

//   // Try exact match
//   let voice = this.availableVoices.find(v => v.lang === lang);
//   if (voice) return voice;

//   // Hindi voices
//   if (lang === 'hi-IN') {
//     voice =
//       this.availableVoices.find(v => v.name.includes('Google हिन्दी')) ||
//       this.availableVoices.find(v => v.lang.startsWith('hi'));
//     if (voice) return voice;
//   }

//   // Marathi voices
//   if (lang === 'mr-IN') {
//     voice =
//       this.availableVoices.find(v => v.name.includes('Marathi')) ||
//       this.availableVoices.find(v => v.lang.startsWith('mr'));
//     if (voice) return voice;
//   }

//   // English (India)
//   if (lang === 'en-IN') {
//     voice =
//       // this.availableVoices.find(v => v.name.includes('Ravi')) ||
//       // this.availableVoices.find(v => v.name.includes('Heera')) ||
//       this.availableVoices.find(v => v.lang.startsWith('en-IN'));
//     if (voice) return voice;
//   }

//   // Fallback → English
//   return this.availableVoices.find(v => v.lang.startsWith('en')) || null;
// }



//   /** Detect language based on script */
// private detectLanguage(text: string): string {
//   if (!text) return 'en-IN';

//   // Devanagari script → Hindi or Marathi
//   if (/[\u0900-\u097F]/.test(text)) {
//     if (text.includes('अहे') || text.includes('करतो') || text.includes('माझं')) {
//       return 'mr-IN'; // Marathi
//     }
//     return 'hi-IN'; // Hindi
//   }

//   // Hinglish detection → Hindi typed in English letters
//   const hinglishKeywords = [
//     'aap', 'hai', 'nahi', 'kyun', 'kyun', 'kya', 'kaise',
//     'main', 'mera', 'tum', 'bhai', 'dost', 'acha', 'theek',
//     'samajh', 'pyar', 'shukriya'
//   ];
//   if (hinglishKeywords.some(word => text.toLowerCase().includes(word))) {
//     return 'hi-IN';
//   }

//   // Default English (India)
//   return 'en-IN';
// }



//   private extractVisibleText(input: string): string {
//     if (!input) return '';

//     const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(input);

//     if (looksLikeHtml && typeof DOMParser !== 'undefined') {
//       try {
//         const parser = new DOMParser();
//         const doc = parser.parseFromString(input, 'text/html');
//         doc.querySelectorAll('script, style, noscript').forEach(n => n.remove());
//         let visible = doc.body ? doc.body.textContent || '' : '';
//         visible = this.decodeHtmlEntities(visible);
//         visible = visible.replace(/\s+/g, ' ').trim();
//         return visible;
//       } catch (err) {
//         console.warn('DOMParser failed, fallback to regex strip', err);
//       }
//     }

//     let text = input.replace(/<\/?[^>]+(>|$)/g, '');
//     text = this.decodeHtmlEntities(text);
//     text = text.replace(/\s+/g, ' ').trim();
//     return text;
//   }

//   private decodeHtmlEntities(str: string): string {
//     if (!str) return '';
//     const textarea = document.createElement('textarea');
//     textarea.innerHTML = str;
//     return textarea.value;
//   }
// }

// // To Handle everything from Backend
// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';

// @Injectable({
//   providedIn: 'root'
// })
// export class TextToSpeechService {
//   private audio?: HTMLAudioElement;
//   private isPlaying = false;

//   constructor(private http: HttpClient) {}

//   /** Start speaking text via backend Node.js TTS */
// async speak(
//   text: string,
//   onStart?: () => void,
//   onEnd?: () => void,
//   onError?: () => void,
//   onProgress?: (spoken: string, pending: string) => void
// ) {
//   try {
//     onStart?.();
//     onProgress?.('', text); // fake progress

//     const audioBlob: any = await this.http
//       .post('http://localhost:3000/api/tts', { text }, { responseType: 'blob' })
//       .toPromise();

//     this.audio = new Audio(URL.createObjectURL(audioBlob));

//     this.audio.onended = () => {
//       this.isPlaying = false;
//       onEnd?.();
//     };

//     this.audio.onerror = () => {
//       this.isPlaying = false;
//       onError?.();
//     };

//     await this.audio.play();
//     this.isPlaying = true; // ✅ mark as playing
//   } catch (err) {
//     console.error(err);
//     this.isPlaying = false;
//     onError?.();
//   }
// }

// stop() {
//   if (this.audio && this.isPlaying) {
//     this.audio.pause();
//     this.audio.currentTime = 0;
//     this.isPlaying = false;
//   }
// }

// }

// ChatGpt Model
import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class TextToSpeechService {
  private audio?: HTMLAudioElement;
  private stop$ = new Subject<void>();

  constructor(private http: HttpClient, private ngZone: NgZone) {}

  /**
   * Speak text by calling backend TTS API
   */
  async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: () => void
  ) {
    if (!text) return;

    try {
      // Stop any previous audio
      this.stop();

      // 🔹 Fetch audio as ArrayBuffer
      const audioBuffer = await firstValueFrom(
        this.http.post<ArrayBuffer>(
          // 'http://localhost:3000/api/tts-gemini',
          // 'http://localhost:3000/api/ttss',
          'https://twillio-chatgpt-wrapper-production.up.railway.app/api/ttss',
          // 'http://localhost:3000/api/tts-eleven',
          { text },
          { responseType: 'arraybuffer' as 'json' }
        ).pipe(takeUntil(this.stop$))
      );

      // 🔹 Convert ArrayBuffer → Blob → Audio
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      this.audio = new Audio(URL.createObjectURL(blob));

      // 🔹 Hook events
      this.audio.onplay = () => this.ngZone.run(() => onStart?.());
      this.audio.onended = () => this.ngZone.run(() => onEnd?.());
      this.audio.onerror = () => this.ngZone.run(() => onError?.());

      await this.audio.play();
    } catch (err) {
      console.error('TTS Error:', err);
      this.ngZone.run(() => onError?.());
    }
  }

  /**
   * Stop playback + cancel request
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = undefined;
    }
    this.stop$.next(); // cancels pending HTTP
  }
}
