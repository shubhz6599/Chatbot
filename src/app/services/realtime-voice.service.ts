// realtime-voice.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RealtimeVoiceService {

  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;

  private controlSubject = new Subject<any>();
  private audioChunkSubject = new Subject<Uint8Array>();

  constructor(private ngZone: NgZone) { }

  onControl(): Observable<any> {
    return this.controlSubject.asObservable();
  }

  closeSocketIfOpen() {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.close();
  }
}


  onAudioChunk(): Observable<Uint8Array> {
    return this.audioChunkSubject.asObservable();
  }

  connect(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);

      this.ws.onmessage = (evt) => {
        if (typeof evt.data === "string") {
          try {
            const msg = JSON.parse(evt.data);
            this.controlSubject.next(msg);
          } catch {
            console.warn("Invalid JSON:", evt.data);
          }
        } else {
          // raw PCM16
          this.ngZone.run(() =>
            this.audioChunkSubject.next(new Uint8Array(evt.data))
          );
        }
      };

      this.ws.onclose = () => {
        this.cleanup();
      };
    });
  }

  async startStreamingAudio() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
      throw new Error("WS not connected");

    this.audioContext = new AudioContext({ sampleRate: 24000 });
    await this.audioContext.audioWorklet.addModule("assets/pcm-worklet-processor.js");

    // old code
    // this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // new code
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 24000
  }
});


    const src = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.worklet = new AudioWorkletNode(this.audioContext, "pcm-worklet");

    // PCM buffer from microphone
    this.worklet.port.onmessage = (e) => {
      const pcm = e.data;   // ArrayBuffer PCM16
      if (this.ws?.readyState === WebSocket.OPEN)
        this.ws.send(pcm);  // ✔ send raw PCM just like your React code
    };

    src.connect(this.worklet);

    console.log("Mic streaming started");
  }

  stopStreamingAudio() {
    try {
      if (this.worklet) {
        this.worklet.disconnect();
        this.worklet = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
      }

      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      // DO NOT send "conversation.reset" → your backend doesn't support it
    } catch (e) {
      console.warn("stopStreaming error", e);
    }
  }

  private cleanup() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }
  private textSubject = new Subject<string>();
  onText(): Observable<string> {
    return this.textSubject.asObservable();
  }

}
