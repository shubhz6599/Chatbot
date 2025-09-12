import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Device as TwilioDevice, Call } from '@twilio/voice-sdk';

@Component({
  selector: 'app-call-assistant',
  templateUrl: './call-assistant.component.html',
  styleUrls: ['./call-assistant.component.css']
})
export class CallAssistantComponent implements OnInit, OnDestroy {
  callSubmitted = false;
  callStatus = 'Ready';
  errorMessage = '';
  isMuted = false;
  // showKeypad = false;
  // dialedNumbers: string = '';
  isInitializing = false;
  displayNumber = 'Calling...';
  queueNumber: number = 0;
  queueMessages: string[] = [
    "Happiness is not by chance, but by choice—choose to make today a good day.",
    "No matter how hard yesterday was, today is a new chance to shine.",
    "Start the day with a smile, and the whole world will smile with you.",
    "Good days don’t just happen, they’re created by the way you look at life.",
    "A little progress each day adds up to big results—make today count.",
    "Be the reason someone smiles today, and your day will be good too.",
    "Today is not just another day, it’s a chance to make your dreams come true."
  ];
  currentMessage: string = '';
  queueInterval?: any;
  inQueue: boolean = false;
  callDuration: string = '00:00';
  private callStartTime?: number;
  private durationInterval?: any;


  private device?: TwilioDevice;
  private activeCall?: Call;

  private BASE = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  async ngOnInit() {
    try {
      const cfg: any = await firstValueFrom(this.http.get(`${this.BASE}/api/config`));
      this.displayNumber = cfg.targetNumber || cfg.twilioNumber || 'Your Twilio Number';
    } catch {
      // fallback text
    }
  }

  ngOnDestroy() {
    this.teardown();
  }

  private async ensureDeviceReady(): Promise<void> {
    if (this.device) return;

    this.isInitializing = true;
    try {
      const res: any = await firstValueFrom(this.http.get(`${this.BASE}/api/token`));
      const token = res.token;

      this.device = new TwilioDevice(token, { logLevel: 'info' });

      this.device.on('ready', () => this.callStatus = 'Device ready');
      this.device.on('error', (err: any) => {
        console.error('Device error', err);
        this.errorMessage = err?.message || 'Device error';
        this.callStatus = 'Error';
      });

      this.device.on('tokenWillExpire', async () => {
        const refreshed: any = await firstValueFrom(this.http.get(`${this.BASE}/api/token`));
        await this.device?.updateToken(refreshed.token);
      });
    } finally {
      this.isInitializing = false;
    }
  }

  async startBrowserCall() {
    this.errorMessage = '';
    this.inQueue = true;        // only show queue
    this.callSubmitted = false; // hide call screen

    // random queue start between 1 and 5
    this.queueNumber = Math.floor(Math.random() * 5) + 1;
    this.updateQueueMessage();

    this.queueInterval = setInterval(() => {
      this.queueNumber--;
      this.updateQueueMessage();

      if (this.queueNumber <= 1) {
        clearInterval(this.queueInterval);
        this.inQueue = false;
        this.startTwilioCall();
      }
    }, 2500); // 2.5s per step

  }

  private async startTwilioCall() {
    try {
      this.callStatus = 'Initializing…';
      await this.ensureDeviceReady();

      this.activeCall = await this.device!.connect();

      this.callSubmitted = true;
      this.callStatus = 'Ringing…';

      // Start timer ONLY when remote accepts
      this.activeCall.on('accept', () => {
        if (this.activeCall?.status() === Call.State.Open) {
          this.callStatus = 'In Call';
          this.startTimer();
        }
      });

      this.activeCall.on('disconnect', () => this.endCall());
      this.activeCall.on('error', (err: any) => {
        console.error('Call error', err);
        this.errorMessage = err?.message || 'Call error';
        this.callStatus = 'Error';
      });
    } catch (err: any) {
      console.error(err);
      this.errorMessage = err?.message || 'Failed to start call';
      this.callStatus = 'Error';
    }
  }


  private updateQueueMessage() {
    const randomIndex = Math.floor(Math.random() * this.queueMessages.length);
    this.currentMessage = this.queueMessages[randomIndex];
  }



  endCall() {
    if (this.activeCall) {
      this.activeCall.disconnect();
      this.activeCall = undefined;
    }
    this.stopTimer();
    this.callSubmitted = false;
    this.callStatus = 'Call Ended';
    this.isMuted = false;
    // this.showKeypad = false;
    // this.dialedNumbers = '';
  }



  private startTimer() {
    this.callStartTime = Date.now();
    this.durationInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.callStartTime!) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      this.callDuration = `${minutes}:${seconds}`;
    }, 1000);
  }

  private stopTimer() {
    clearInterval(this.durationInterval);
    this.callDuration = '00:00';
  }



  toggleMute() {
    if (this.activeCall) {
      this.isMuted = !this.isMuted;
      this.activeCall.mute(this.isMuted);
    }
  }

  // closeKeypad() {
  //   this.showKeypad = false;
  //   this.dialedNumbers = ''; // reset entered numbers
  // }

  // sendDigit(digit: string) {
  //   this.activeCall?.sendDigits(digit);
  //   this.dialedNumbers += digit;
  // }
  // eraseDigit() {
  //   this.dialedNumbers = this.dialedNumbers.slice(0, -1);
  // }


  private teardown() {
    try {
      this.activeCall?.disconnect();
      this.device?.destroy();
      this.activeCall = undefined;
      this.device = undefined;
    } catch { }
  }
}
