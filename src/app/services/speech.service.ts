// speech.service.ts (updated)
import { Injectable } from '@angular/core';
import { Observable, Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private recognition: any;
  private speechSubject = new Subject<string>();
  private isListening = false;
  private stopListening$ = new Subject<void>();

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    // Check if the browser supports the Web Speech API
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition() || new (window as any).SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          } else {
            // Interim results
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          this.speechSubject.next(transcript);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        this.isListening = false;
        this.speechSubject.error(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.speechSubject.complete();
      };
    } else {
      console.error('Web Speech API is not supported in this browser.');
    }
  }

  startListening(): Observable<string> {
    if (this.recognition && !this.isListening) {
      // Reset the recognition service
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors if not started
      }

      // Reinitialize the recognition
      this.initSpeechRecognition();
      this.recognition.start();
      this.isListening = true;

    return this.speechSubject.asObservable();
    }
    return this.speechSubject.asObservable();
  }

  stopListening() {
    this.stopListening$.next();
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isListeningNow(): boolean {
    return this.isListening;
  }

  // Reset the speech recognition completely
  reset() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors
      }
      this.isListening = false;
      this.speechSubject = new Subject<string>();
      this.stopListening$ = new Subject<void>();
      this.initSpeechRecognition();
    }
  }
}
