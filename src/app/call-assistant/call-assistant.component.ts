import { Component, OnDestroy, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Device as TwilioDevice, Call } from '@twilio/voice-sdk';

@Component({
  selector: 'app-call-assistant',
  templateUrl: './call-assistant.component.html',
  styleUrls: ['./call-assistant.component.css']
})
export class CallAssistantComponent implements OnInit, OnDestroy, OnChanges {
  @Input() role: 'agent' | 'supplier' | null = null; // NEW - role from parent

  callSubmitted = false;
  callStatus = 'Ready to receive calls...';
  errorMessage = '';
  isMuted = false;
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

  // NEW for incoming call handling
  incomingCall: any = null;
  showIncomingPanel = false;
  // add these (paste near other private props)
  private identity: string = '';      // identity assigned when device is created
  incomingCaller: string = '';       // friendly name shown in incoming panel

  private device?: TwilioDevice;
  private activeCall?: Call;

  private BASE = 'twillio-chatgpt-wrapper-production.up.railway.app';

  constructor(private http: HttpClient) { }

  async ngOnInit() {
    try {
      const cfg: any = await firstValueFrom(this.http.get(`${this.BASE}/api/config`));
      this.displayNumber = cfg.targetNumber || cfg.twilioNumber || 'Your Twilio Number';
    } catch {
      // fallback text
    }

    // If role is agent and call-assistant loaded, pre-init device so agent can receive calls
    if (this.role === 'agent') {
      console.log('[agent] pre-initializing device on ngOnInit');

      // show friendly ready text immediately (centered via CSS change below)
      this.callStatus = 'Ready to receive calls...';

      // initialize device in background (do not await to avoid UI block)
      this.ensureDeviceReady('agent').catch(() => { /* silence */ });
    }
  }


  ngOnDestroy() {
    this.teardown();
  }

  ngOnChanges(changes: SimpleChanges) {
    // If role input becomes 'agent', ensure device is ready to receive
    if (changes['role'] && this.role === 'agent' && !this.device) {
      console.log('[agent] role changed to agent — initializing device...');
      this.ensureDeviceReadyForRole('agent').catch(err => {
        console.error('[agent] ensureDeviceReady error', err);
        this.errorMessage = err?.message || 'Device init error';
      });
    }
  }

  // NEW: wrapper to allow parent to request initialization for a role
  async ensureDeviceReadyForRole(role: 'agent' | 'supplier') {
    // pass role so we request token with incoming=true for agent
    await this.ensureDeviceReady(role);
  }

  // Updated ensureDeviceReady to accept role and identity
  private async ensureDeviceReady(role: 'agent' | 'supplier' = 'supplier'): Promise<void> {
    if (this.device) return;

    this.isInitializing = true;
    try {
      const identity = role === 'agent' ? 'agent' : `supplier-${Math.floor(Math.random() * 10000)}`;
      this.identity = identity; // save for later use when dialing

      console.log(`[client] requesting token for identity=${identity}`);

      const res: any = await firstValueFrom(
        this.http.get(`${this.BASE}/api/token?identity=${identity}`)
      );

      console.log('[client] /api/token response:', res);

      const token = res.token;
      if (!token) {
        throw new Error('No token returned from server');
      }

      this.device = new TwilioDevice(token, {
        logLevel: 'info',
        allowIncomingWhileBusy: true
      });

      // register device so Twilio knows this client is online
      try {
        // register returns a promise in SDK V2
        // await ensures registration attempt happens before we rely on "ready"
        // If register is not available in your SDK version, remove await and call it without awaiting.
        // (Some versions auto-register on device creation.)
        await (this.device as any).register?.();
      } catch (regErr) {
        // not fatal — device might auto-register depending on SDK version
        console.warn('[client] device.register() failed or not present:', regErr);
      }

      this.device.on('ready', () => {
        console.log(`[client] Device ready — registered as identity=${identity}`);
        // show pleasant message for agents
        this.callStatus = role === 'agent' ? 'Ready to receive calls...' : 'Device ready';
      });

      this.device.on('error', (err: any) => {
        console.error('[client] Device error', err);
        this.errorMessage = err?.message || 'Device error';
        this.callStatus = 'Error';
      });

      this.device.on('incoming', (incoming: any) => {
        console.log('[client] Incoming call event', incoming);

        // try lots of places the caller identity might live
        const fromParam =
          incoming?.parameters?.From ||
          incoming?.parameters?.from ||
          incoming?.from ||
          incoming?.caller ||
          incoming?.args?.From ||
          '';

        this.incomingCaller = fromParam || 'Unknown';

        // Save incoming call object and show panel
        this.incomingCall = incoming;
        this.showIncomingPanel = true;
        this.callStatus = 'Incoming call';

        // 👇 NEW: handle caller cancelling before agent accepts
        incoming.on('cancel', () => {
          console.log('[client] Incoming call cancelled by caller');
          this.incomingCall = null;
          this.showIncomingPanel = false;
          this.callStatus = 'Call Cancelled';
          setTimeout(() => {
            this.callStatus = 'Ready to receive calls...';
          }, 2000);
        });

        // 👇 NEW: handle early disconnect before accept
        incoming.on('disconnect', () => {
          console.log('[client] Incoming call disconnected before answer');
          this.incomingCall = null;
          this.showIncomingPanel = false;
          this.callStatus = 'Call Ended';
        });
      });


      this.device.on('tokenWillExpire', async () => {
        console.log('[client] tokenWillExpire — refreshing token for', identity);
        const refreshed: any = await firstValueFrom(
          this.http.get(`${this.BASE}/api/token?identity=${identity}`)
        );
        await this.device?.updateToken(refreshed.token);
      });
    } finally {
      this.isInitializing = false;
    }
  }





  // startBrowserCall now accepts optional role (keeps default behavior when not provided)
  async startBrowserCall(role: 'agent' | 'supplier' | null = null) {
    // if role passed explicitly (from parent) set local role
    if (role) this.role = role;

    this.errorMessage = '';
    // If the user is agent and they press call button — we can show a message (agents typically receive)
    // But if supplier then keep existing queue+call flow
    if (this.role === 'agent') {
      // Agents usually wait for incoming; initialize device and return
      this.inQueue = false;
      this.callSubmitted = false;
      try {
        debugger
        await this.ensureDeviceReady('agent');
        this.callStatus = 'Ready to receive calls...';
      } catch (err: any) {
        console.error(err);
        this.errorMessage = err?.message || 'Initialization failed';
      }
      return;
    }

    // supplier / caller flow (existing "queue" behavior preserved)
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
        // start Twilio call as supplier
        this.startTwilioCall();
      }
    }, 2500); // 2.5s per step
  }

  private async startTwilioCall() {
    try {
      this.callStatus = 'Initializing…';
      await this.ensureDeviceReady(this.role === 'agent' ? 'agent' : 'supplier');

      if (this.role === 'supplier' || !this.role) {
        // pass To param so TwiML app will dial a client identity (web -> web)
        this.activeCall = await this.device!.connect({
          params: { To: 'agent', From: this.identity || 'supplier' }
        });
      } else {
        // for other roles fallback to default connect (keeps PSTN behavior)
        this.activeCall = await this.device!.connect();
      }

      this.callSubmitted = true;
      this.callStatus = 'Ringing…';

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


  // NEW: accept incoming call (agent)
  acceptIncoming() {
    if (!this.incomingCall) return;
    try {
      this.incomingCall.accept();
      // set as active call and show call UI
      this.activeCall = this.incomingCall;
      this.incomingCall = null;
      this.showIncomingPanel = false;
      this.callSubmitted = true;
      this.callStatus = 'In Call';
      this.startTimer();
    } catch (err: any) {
      console.error('accept error', err);
      this.errorMessage = err?.message || 'Failed to accept';
    }
  }

  // NEW: reject incoming call (agent)
  rejectIncoming() {
    if (!this.incomingCall) return;
    try {
      this.incomingCall.reject();
    } catch (err) {
      console.error('reject error', err);
    } finally {
      this.incomingCall = null;
      this.showIncomingPanel = false;
      this.callStatus = 'Ready to receive calls...';
    }
  }

  private updateQueueMessage() {
    const randomIndex = Math.floor(Math.random() * this.queueMessages.length);
    this.currentMessage = this.queueMessages[randomIndex];
  }

  endCall() {
    if (this.activeCall) {
      try {
        this.activeCall.disconnect();
      } catch { }
      this.activeCall = undefined;
    }

    this.stopTimer();
    this.callSubmitted = false;
    // show temporary "Call Ended" message
    this.callStatus = 'Call Ended';
    this.isMuted = false;
    this.incomingCall = null;
    this.showIncomingPanel = false;

    // After 2 seconds, revert to appropriate ready message
    setTimeout(() => {
      if (!this.callSubmitted) {
        this.callStatus = this.role === 'agent' ? 'Ready to receive calls...' : 'Ready';
        // clear incomingCaller after updating status
        this.incomingCaller = '';
      }
    }, 2000);
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
      try {
        this.activeCall.mute(this.isMuted);
      } catch (err) {
        console.warn('mute failed', err);
      }
    }
  }

  private teardown() {
    try {
      this.activeCall?.disconnect();
      this.device?.destroy();
      this.activeCall = undefined;
      this.device = undefined;
    } catch { }
  }
}
