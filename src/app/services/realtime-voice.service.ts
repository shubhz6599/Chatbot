import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RealtimeVoiceService {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;

  // Stream of transcribed text (if backend sends text events) - optional
  private textSubject = new Subject<string>();
  private controlSubject = new Subject<any>();
  private audioContext: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;

  // add this public method for components to subscribe
  onControl(): Observable<any> {
    return this.controlSubject.asObservable();
  }


  // Emits when we receive binary audio chunk to play
  private audioChunkSubject = new Subject<ArrayBuffer>();

  constructor(private ngZone: NgZone) { }

  connect(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer'; // IMPORTANT: receive binary as ArrayBuffer

      this.ws.onopen = () => {
        console.log('[RealtimeVoice] WS open');
        console.log('[RealtimeVoice] ws.binaryType=', this.ws?.binaryType);
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('[RealtimeVoice] WS error', err);
        reject(err);
      };

      this.ws.onmessage = (evt) => {
        // Messages might be JSON text events or binary audio chunks (ArrayBuffer)
        if (typeof evt.data === 'string') {
          try {
            const obj = JSON.parse(evt.data);
            if (obj.type === 'transcript' && obj.text) {
              this.ngZone.run(() => this.textSubject.next(obj.text));
            } else {
              // pass other control messages to controlSubject (openai.closed etc)
              this.ngZone.run(() => this.controlSubject.next(obj));
            }
          } catch (e) {
            console.warn('[RealtimeVoice] unexpected text message', evt.data);
          }

        } else if (evt.data instanceof ArrayBuffer) {
          // Received binary audio chunk (ArrayBuffer)
          this.ngZone.run(() => this.audioChunkSubject.next(evt.data));
        } else if ((evt.data as any).byteLength) {
          // some browsers may give a Blob-like object
          const reader = new FileReader();
          reader.onload = () => {
            const ab = reader.result as ArrayBuffer;
            this.ngZone.run(() => this.audioChunkSubject.next(ab));
          };
          (evt.data as Blob).arrayBuffer ?
            (evt.data as Blob).arrayBuffer().then(ab => this.ngZone.run(() => this.audioChunkSubject.next(ab))) :
            reader.readAsArrayBuffer(evt.data as any);
        }
      };

      this.ws.onclose = () => {
        console.log('[RealtimeVoice] WS closed');
        this.cleanupMedia();
      };
    });
  }

  disconnect() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) { }
      this.ws = null;
    }
    this.cleanupMedia();
  }

  // Start sending audio to server: starts microphone and streams chunks via WS
  // ------------------- startStreamingAudio (replace existing) -------------------
  async startStreamingAudio() {

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    this.ws.send(JSON.stringify({ type: "response.cancel" }));


    // 1. Init AudioContext at 24kHz
    this.audioContext = new AudioContext({ sampleRate: 24000 });

    // 2. Load the PCM worklet
    await this.audioContext.audioWorklet.addModule("assets/pcm-worklet-processor.js");

    // 3. Get microphone stream
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }
    });

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 4. Create the PCM worklet node
    this.worklet = new AudioWorkletNode(this.audioContext, "pcm-worklet");

    // 5. On PCM chunk ready
    this.worklet.port.onmessage = (e) => {
      const buffer = e.data; // ArrayBuffer of PCM16
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(buffer); // send raw PCM to server
      }
    };

    // 6. Connect mic -> worklet
    source.connect(this.worklet);

    console.log("[RealtimeVoice] PCM streaming started");
  }


  // ------------------- stopStreamingAudio (replace existing) -------------------
  stopStreamingAudio() {
    console.log("[RealtimeVoice] Stopping PCM capture…");

    try {
      // 1. Stop AudioWorklet
      if (this.worklet) {
        this.worklet.port.onmessage = null;
        this.worklet.disconnect();
        this.worklet = null;
      }

      // 2. Stop Mic
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }

      // 3. Close AudioContext
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      // 4. Tell backend/AI to stop the conversation
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: "conversation.reset"
        }));
      }

      // 5. Finally close WebSocket completely
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

    } catch (e) {
      console.warn("[RealtimeVoice] stopStreamingAudio error", e);
    }
  }



  private cleanupMedia() {
    if (this.mediaRecorder) {
      try { this.mediaRecorder.ondataavailable = null; } catch (e) { }
      try { if (this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop(); } catch (e) { }
      this.mediaRecorder = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }

  // Observables to subscribe in component
  onTranscript(): Observable<string> {
    return this.textSubject.asObservable();
  }
  onAudioChunk(): Observable<ArrayBuffer> {
    return this.audioChunkSubject.asObservable();
  }

  // helper: pick best supported mime type
  private getSupportedMimeType() {
    const options = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav'
    ];
    for (const t of options) {
      try {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
      } catch (e) { }
    }
    return 'audio/webm';
  }
}
