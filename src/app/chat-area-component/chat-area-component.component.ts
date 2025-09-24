import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, OnChanges, NgZone } from '@angular/core';
import { SpeechService } from '../services/speech.service';
import { Subscription } from 'rxjs';
import { ValidationService } from '../services/validation.service';
import * as XLSX from 'xlsx';
import { ChatService } from '../services/chat.service';
import { TextToSpeechService } from '../services/text-to-speech.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SessionResetService } from '../services/session-reset.service';
@Component({
  selector: 'app-chat-area-component',
  templateUrl: './chat-area-component.component.html',
  styleUrls: ['./chat-area-component.component.css']
})
export class ChatAreaComponentComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isListening: boolean = false;
  @Input() session: any = null;
  @Output() startListening = new EventEmitter<void>();
  @Output() stopListening = new EventEmitter<void>();
  @Output() sessionUpdated = new EventEmitter<any>();
  @Output() startCall = new EventEmitter<void>();

  messages: any[] = [];
  userInput: string = '';
  uploadedFiles: File[] = [];
  showVoiceAnim: boolean = false;
  showVolume: boolean = true;
  vendorCode: string = '';
  downloadLinks: { [fileName: string]: string } = {};
  // animation / cancellation helpers
  currentBotInterval: any = null;
  currentBotMessageIndex: number | null = null;
  cancelAnimationRequested: boolean = false;

  // quick suggestions
  initialQuestions = [
    'How can I change my email/Phone',
    'How can I reset my password?',
    'How can I validate asn file',
    // 'What is your pricing?'
  ];
  likedMessages: { [index: number]: 'like' | 'dislike' | null } = {};

  // dynamic suggestions (speech)
  dynamicSuggestions: string[] = [];
  isProcessingSpeech: boolean = false;
  isWaitingForBot: boolean = false; // controls disabling while bot “types”
  interimSpeechText: string = '';
  showTooltip: boolean = true;
  errorMessage: string = '';
  // suggestion bank
  allQuestions: string[] = [
    'How to reset password for Msetu?',
    'How to resolve NO SCHEDULE LINE AVAILABLE?',
    'How to resolve CCK NOT MAINTAIN?',
    'How to resolve SBU/AFS PLANT DELIVERY TIME error?',
    'How to resolve PO STATUS NEW/WRONG ITEM/ITEM CANCEL error?',
    'How to resolve BSP ERROR/WARNING MESSAGE?',
    'How to resolve VENDOR/MAHINDRA GSTN ERROR?',
    'How to resolve PLANT EXTENSION ACTIVITY error?',
    'How to resolve ASN NOT AVAILABLE FOR PCS/ASN TRACE?',
    'How to resolve PO TRIGGER issue?',
    'How to resolve SHIPMENT CREATED AGAINST ASN?',
    'How to resolve ASN DOES NOT EXIST IN BUYER SYSTEM?',
    'How to resolve ASN DELETION error?',
    'How to resolve RETRO NO PROVISION ERROR?',
    'How to resolve RETRO RATE MISMATCH ERROR?',
    'How to resolve RETRO DATA NOT REPLICATING issue?'

  ];


  // action buttons keywords
  private questionsWithActions = ['password', 'reset', 'pricing', 'services', 'contact', 'support'];

  private speechSubscription: Subscription | null = null;

  constructor(private speechService: SpeechService, private validationService: ValidationService, private chatService: ChatService, private tts: TextToSpeechService,
    private sanitizer: DomSanitizer, private sessionReset: SessionResetService, private ngZone: NgZone
  ) { }

  ngOnInit() {
    if (this.session && this.session.messages) {
      this.messages = [...this.session.messages];
    } else {
      this.messages = [
        { sender: 'bot', text: 'Hello! How can I assist you today?', timestamp: new Date() }
      ];
      this.createNewSession();
    }
    this.updateSession();
    // this.sessionReset.init();
  }

  ngOnChanges() {
    if (this.session?.messages) {
      this.messages = [...this.session.messages];
    }
  }

  ngOnDestroy() {
    if (this.speechSubscription) this.speechSubscription.unsubscribe();
    this.speechService.reset();
  }

  createNewSession() {
    const newSession = {
      id: Date.now(),
      title: 'New Chat',
      messages: [...this.messages],
      date: new Date(),
      lastUpdated: new Date()
    };
    this.sessionUpdated.emit(newSession);
  }

  updateSession() {
    if (this.session) {
      const updated = { ...this.session, messages: [...this.messages], lastUpdated: new Date() };
      this.sessionUpdated.emit(updated);
    }
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private shouldHaveActions(message: string): boolean {
    const lower = message.toLowerCase();
    return this.questionsWithActions.some(k => lower.includes(k));
  }

  private getActionsForMessage(message: string): any[] {
    const lower = message.toLowerCase();
    if (lower.includes('password') || lower.includes('reset')) {
      return [
        { text: 'Reset Password', action: 'reset' },
        { text: 'Contact Support', action: 'support' },
        { text: 'Account Recovery', action: 'recovery' }
      ];
    } else if (lower.includes('pricing')) {
      return [
        { text: 'View Basic Plan', action: 'basic' },
        { text: 'View Premium Plan', action: 'premium' },
        { text: 'Contact Sales', action: 'sales' }
      ];
    } else if (lower.includes('service')) {
      return [
        { text: 'Web Development', action: 'web' },
        { text: 'Mobile Apps', action: 'mobile' },
        { text: 'Consultation', action: 'consult' }
      ];
    } else if (lower.includes('contact') || lower.includes('support')) {
      return [
        { text: 'Call Support', action: 'call' },
        { text: 'Email Us', action: 'email' },
        { text: 'Live Chat', action: 'chat' }
      ];
    }
    return [
      { text: 'Learn More', action: 'more' },
      { text: 'Contact Us', action: 'contact' },
      { text: 'Documentation', action: 'docs' }
    ];
  }

  handleAction(action: string, messageText: string) {
    switch (action) {
      case 'reset': this.userInput = 'I need to reset my password'; break;
      case 'support': this.userInput = 'I want to contact support'; break;
      case 'basic': this.userInput = 'Tell me about your basic plan'; break;
      case 'premium': this.userInput = 'Tell me about your premium plan'; break;
      default:
        this.messages.push({
          sender: 'bot',
          text: `You selected: ${action}. How can I help you with this?`,
          timestamp: new Date().toISOString()
        });
        this.updateSession();
        return;
    }
    this.sendMessage();
  }

  selectSuggestion(q: string) {
    this.userInput = q;
    this.sendMessage();
  }

  // speech
  onStartListening() {
    this.showVoiceAnim = true
    this.errorMessage = '';
    this.speechService.reset();
    this.startListening.emit();
    this.isProcessingSpeech = true;
    this.interimSpeechText = 'Listening...';
    this.dynamicSuggestions = [];

    this.speechSubscription = this.speechService.startListening().subscribe(
      (text: string) => {
        console.log(text);

        this.interimSpeechText = text;
        this.userInput = text;
        // this.generateDynamicSuggestions(text);
      },
      (error: any) => {
        // if (error === 'Timeout: No speech detected') {
        //   this.showError('Unable to recognize speech. Please try again.');
        // } else {
        //   this.showError('Speech recognition error. Please try again.');
        // }
        this.isProcessingSpeech = false;
        this.interimSpeechText = '';
        this.onStopListening();
      },
      () => {
        this.isProcessingSpeech = false;
        this.userInput = this.interimSpeechText;
        this.interimSpeechText = '';
        this.onStopListening();
      }
    );
  }

  onStopListening() {
    this.showVoiceAnim = false
    console.log(this.stopListening);

    if (this.speechSubscription) {
      this.speechSubscription.unsubscribe();
      this.speechSubscription = null;
    }
    this.speechService.stopListening();
    this.stopListening.emit();
    // ✅ Always restore mic state correctly
    if (this.interimSpeechText && this.interimSpeechText !== 'Listening...') {
      this.userInput = this.interimSpeechText;
    }
    if (this.userInput.trim()) {
      // mark this as mic-based input
      this.sendMessage(true);  // 👈 pass a flag (isFromMic = true)
    }
    // this.userInput = '';
    this.interimSpeechText = '';
    this.isProcessingSpeech = false;
    this.isListening = false;
  }

  showError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => (this.errorMessage = ''), 3000);
  }

  generateDynamicSuggestions(text: string) {
    const lower = text.toLowerCase().trim();

    if (!lower) {
      this.dynamicSuggestions = [];
      return;
    }

    // filter all matching questions
    this.dynamicSuggestions = this.allQuestions.filter(q =>
      q.toLowerCase().includes(lower)
    );
  }

  // Convert plain text to HTML with clickable links
  formatMessage(text: string, isHtml: boolean = false): SafeHtml {
    if (!text) return '';

    if (isHtml) {
      return this.sanitizer.bypassSecurityTrustHtml(text);
    }

    // fallback → detect URLs and convert to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const html = text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${url}</a>`;
    });
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  handleHtmlClick(event: Event) {
    const target = event.target as HTMLElement;

    if (target.tagName.toLowerCase() === 'button') {
      // Find parent .message-content div
      const parentDiv = target.closest('.message-content') as HTMLElement;
      if (parentDiv) {
        // Disable all buttons inside this message
        const buttons = parentDiv.querySelectorAll('button');
        buttons.forEach(btn => {
          // Using property directly
          (btn as HTMLButtonElement).disabled = true;
          // Add class for styling
          btn.classList.add('disabled-btn');
          // Optional: disable pointer events
          btn.style.pointerEvents = 'none';
          btn.style.opacity = '0.6'; // visual feedback
        });
      }

      // Execute action
      switch (target.id) {
        case 'callAgent':
          this.triggerCall();
          break;
        case 'purchaseOrder':
          this.sendData('Purchase Order');
          break;
        case 'payment':
          this.sendData('Payment');
          break;
      }
    }
  }




  submitVendorCode(messageIndex: number) {
    const msg = this.messages[messageIndex];

    if (!msg.vendorCode?.trim()) return;
    msg.isSubmitted = true;       // disable input
    msg.typing = true;
    const enteredCode = msg.vendorCode.trim();



    // Call your API if needed
    const apiMsg = `Purchase Order Report DATA vendor Number ${enteredCode}`;
    this.chatService.askQuestion(apiMsg, []).subscribe({
      next: (res: any) => {
        if (res.answer === 'PURCHASE_ORDER_GENERATE_PROMPT') {
          // keep vendor input visible
          // no need to push another vendorPrompt
        } else {
          this.messages.push({
            sender: 'bot',
            text: res.answer,
            is_html: res.is_html,
            type: 'text',
            timestamp: new Date()
          });
        }
        this.scrollToMessage(this.messages.length - 1);
        msg.typing = false;

      }
    });
  }


  private animateUserMessage(text: string): Promise<void> {
    return new Promise((resolve) => {
      let i = 0;
      const userMessage = { sender: 'user', text: '', type: 'text', timestamp: new Date() };
      this.messages.push(userMessage);
      this.updateSession();

      const interval = setInterval(() => {
        userMessage.text += text.charAt(i);
        i++;
        this.updateSession();

        if (i >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, 30); // typewriter effect speed
    });
  }

  submitPaymentDate(messageIndex: number) {
    const msg = this.messages[messageIndex];

    if (!msg.fromDate || !msg.toDate) {
      this.showError('Please select both From and To dates');
      return;
    }
    msg.isSubmitted = true;       // disable input
    msg.typing = true;

    const from = msg.fromDate;
    const to = msg.toDate;
    // const userMsgText = `User selected payment report dates: ${from} to ${to}`;

    // Animate user message
    // this.animateUserMessage(userMsgText).then(() => this.scrollToMessage(this.messages.length - 1));

    // Call API with selected date range
    const apiMsg = `Payment Report with Clear date ${from} to ${to}`;
    this.chatService.askQuestion(apiMsg, []).subscribe({
      next: (res: any) => {
        this.messages.push({
          sender: 'bot',
          text: res.answer,
          is_html: res.is_html,
          type: 'text',
          timestamp: new Date()
        });
        this.scrollToMessage(this.messages.length - 1);
        msg.typing = false;
      }
    });
  }
  private validateFiles(fileType: string): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.uploadedFiles.length) {
        this.messages.push({
          sender: 'bot',
          text: `⚠️ Please upload a ${fileType} file first.`,
          timestamp: new Date()
        });
        this.updateSession();
        resolve();
        return;
      }

      // process each uploaded file
      let pending = this.uploadedFiles.length;
      for (const file of this.uploadedFiles) {
        const idx = this.messages.findIndex(m => m.type === 'file' && m.fileName === file.name);

        // mark UI processing state
        if (idx !== -1) {
          this.messages[idx].isProcessing = true;
          this.messages[idx].uploading = false;
          this.updateSession();
        }

        // Call backend via ValidationService (expects Observable)
        this.validationService.validateASNFile(file).subscribe({
          next: (res: any) => {
            const answer: string = res?.answer || '';
            // backend sometimes returns is_html, but sometimes a different key (like ts_html) -> handle both
            const resIsHtml = (typeof res?.is_html !== 'undefined') ? res.is_html
              : (typeof res?.ts_html !== 'undefined') ? res.ts_html
                : /<\/?[a-z][\s\S]*>/i.test(answer); // fallback detect html

            // update file tile
            if (idx !== -1) {
              this.messages[idx].isProcessing = false;
              this.messages[idx].validationResult = answer;
              this.messages[idx].is_html = !!resIsHtml;

              // simple heuristic for isValid: treat as valid if answer mentions "success"
              const lower = (answer || '').toLowerCase();
              this.messages[idx].isValid = lower.includes('success') || lower.includes('validated successfully');

              this.updateSession();
            }

            // push bot message with API answer (render HTML when resIsHtml is true)
            this.messages.push({
              sender: 'bot',
              text: answer || `Validation completed for ${file.name}.`,
              is_html: !!resIsHtml,
              timestamp: new Date()
            });

            // if backend returned s3_url, show a clickable download link as an HTML bot message
            // if (res?.s3_url) {
            //   const linkHtml = `<a href="${res.s3_url}" target="_blank" rel="noopener noreferrer">📥 Download validated ${fileType} file</a>`;
            //   this.messages.push({
            //     sender: 'bot',
            //     text: linkHtml,
            //     is_html: true,
            //     timestamp: new Date()
            //   });
            // }

            this.updateSession();
            this.scrollToMessage(this.messages.length - 1);

            pending--;
            if (pending === 0) resolve();
          },
          error: (err) => {
            // mark file tile as failed
            if (idx !== -1) {
              this.messages[idx].isProcessing = false;
              this.messages[idx].validationResult = '❌ Validation failed (network or server error)';
              this.messages[idx].is_html = false;
              this.messages[idx].isValid = false;
              this.updateSession();
            }

            this.messages.push({
              sender: 'bot',
              text: '⚠️ Error validating ASN file. Please try again later.',
              is_html: false,
              timestamp: new Date()
            });
            this.updateSession();

            pending--;
            if (pending === 0) resolve();
          }
        });
      }
    });
  }




  // main send
  sendMessage(isFromMic: boolean = false) {
    if (!this.userInput.trim() && this.uploadedFiles.length === 0) return; // nothing to send
    if (this.isWaitingForBot) return;

    const userMessageLower = this.userInput.toLowerCase();

    // show user message
    if (this.userInput.trim()) {
      this.messages.push({ sender: 'user', text: this.userInput, timestamp: new Date().toISOString() });
    }
    this.updateSession();

    // detect ASN validation intent
    if ((userMessageLower.includes('validate') && userMessageLower.includes('asn')) ||
      (userMessageLower.includes('valid') && userMessageLower.includes('asn'))) {
      let fileType = 'ASN';
      if (userMessageLower.includes('vendor')) fileType = 'Vendor';

      this.userInput = '';
      this.isWaitingForBot = true;
      this.validateFiles(fileType).finally(() => {
        this.isWaitingForBot = false;
        this.updateSession();
      });
      return;
    }
    else if ((userMessageLower.includes('create') && userMessageLower.includes('asn'))
      || (userMessageLower.includes('creation') && userMessageLower.includes('asn'))
    || (userMessageLower.includes('generate') && userMessageLower.includes('asn'))
    || (userMessageLower.includes('generation') && userMessageLower.includes('asn'))
  ) {

      if (this.uploadedFiles.length > 0) {
        const file = this.uploadedFiles[0];
        this.validationService.createASNFile(file).subscribe((res) => {
          this.messages.push({
            sender: 'bot',
            text: res.answer || '✅ ASN created successfully.',
            is_html: res.is_html || false,
            timestamp: new Date()
          });

          // if (res?.s3_url) {
          //   this.messages.push({
          //     sender: 'bot',
          //     text: `<a href="${res.s3_url}" target="_blank" rel="noopener noreferrer">📥 Download created ASN</a>`,
          //     is_html: true,
          //     timestamp: new Date()
          //   });
          // }
        });
      } else {
        this.messages.push({
          sender: 'bot',
          text: '⚠️ Please upload an ASN file before creation.',
          timestamp: new Date()
        });
      }
      this.userInput = '';
    }
    else {
      // --- Otherwise, QnA API call ---
      const sentText = this.userInput;
      const files = [...this.uploadedFiles]; // copy array

      this.userInput = '';
      this.dynamicSuggestions = [];
      this.isWaitingForBot = true;

      // Typing indicator
      this.messages.push({ sender: 'bot', typing: true, timestamp: new Date() });
      this.updateSession();

      this.chatService.askQuestion(sentText, files).subscribe({
        next: async (res) => {
          // remove typing indicator
          this.messages = this.messages.filter(m => !m.typing);
          const botText = res?.answer || "Sorry, I couldn't find an answer.";

          // check for PURCHASE_ORDER_GENERATE_PROMPT
          if (res?.answer === 'PURCHASE_ORDER_GENERATE_PROMPT') {
            this.messages.push({
              sender: 'bot',
              type: 'vendorPrompt',  // custom type
              timestamp: new Date()
            });
          } else if (res?.answer === 'PAYMENT_REPORT_GENERATE_PROMPT') {
            this.messages.push({
              sender: 'bot',
              type: 'paymentPrompt',
              timestamp: new Date(),
              fromDate: '',
              toDate: ''
            });
          } else {
            const isHtmlResponse = res?.is_html || /<\/?[a-z][\s\S]*>/i.test(res?.answer);
            if (isHtmlResponse) {
              this.messages.push({
                sender: 'bot',
                text: res.answer || 'Talk to a live agent',
                type: 'call',
                is_html: res.is_html,
                timestamp: new Date()
              });
            } else {
              await this.animateBotResponse(res?.answer || "Sorry, I couldn't find an answer.");
              if (isFromMic && !this.cancelAnimationRequested) {
                this.speak(res?.answer || "Sorry, I couldn't find an answer.");
              }

              // reset cancel flag for next response
              this.cancelAnimationRequested = false;
            }
          }

          this.isWaitingForBot = false;
          this.updateSession();
          this.scrollToMessage(this.messages.length - 1);
          setTimeout(() => {
            const c = document.querySelector('.chat-messages') as HTMLElement | null;
            if (c) c.scrollTop = c.scrollHeight;
          }, 0);
        },
        error: (err) => {
          this.messages = this.messages.filter(m => !m.typing);
          this.messages.push({
            sender: 'bot',
            text: 'Error fetching answer. Please try again.',
            timestamp: new Date()
          });
          if (isFromMic) this.speak('Error fetching answer. Please try again.');
          this.isWaitingForBot = false;
          this.updateSession();
          this.scrollToMessage(this.messages.length - 1);
        }
      });

    }
  }

  triggerCall() {
    this.startCall.emit();   // 👈 notify parent
  }

  sendDummyResponse() {
    const dummyRes = {
      answer: "you want to call ? <button id='callAgent' class='btn-call'>Call Agent</button>",
      is_html: true,
      debug: {}
    };

    this.messages.push({
      sender: 'bot',
      text: dummyRes.answer,
      is_html: dummyRes.is_html,   // ✅ keep track of HTML
      timestamp: new Date()
    });
  }
  // sendDummyResponse(isHtml: boolean = false) {
  //   const dummyRes = isHtml
  //     ? {

  //       "answer": "<div class=\"bot-message\">\n  <p>You can get the following reports:</p>\n  <div class=\"report-options\">\n    <button onclick=\"sendData('Purchase Order')\">\ud83d\udcc4 Purchase Order</button>\n    <button onclick=\"sendData('Payment')\" disabled>\ud83d\udcb0 Payment</button>\n  </div>\n  <p class=\"hint\">\ud83d\udc49 Please specify which report you need.</p>\n</div>\n\n<style>\n  .bot-message {\n    background: #f1f5f9;\n    padding: 10px;\n    border-radius: 10px;\n    margin: 8px 0;\n    max-width: 80%;\n  }\n\n  .report-options {\n    display: flex;\n    gap: 8px;\n    margin: 8px 0;\n    flex-wrap: wrap;\n  }\n\n  .report-options button {\n    background: #2563eb;\n    color: white;\n    border: none;\n    padding: 8px 12px;\n    border-radius: 8px;\n    cursor: pointer;\n    font-size: 14px;\n    transition: background 0.2s;\n  }\n\n  .report-options button:hover:enabled {\n    background: #1d4ed8;\n  }\n\n  .report-options button:disabled {\n    background: #94a3b8; /* gray color for disabled */\n    cursor: not-allowed;\n  }\n\n  .hint {\n    font-size: 12px;\n    color: #64748b;\n    margin-top: 4px;\n  }\n</style>",
  //       is_html: true

  //     }

  //     : {
  //       answer:
  //         'Dear User, Hello! 👋 How can I assist you today? If you have any questions or need support regarding CCK/ACK maintenance, please let me know.',
  //       is_html: false
  //     };

  //   this.messages.push({
  //     sender: 'bot',
  //     text: dummyRes.answer,
  //     is_html: dummyRes.is_html,
  //     timestamp: new Date()
  //   });

  //   this.updateSession();
  // }


  sendData(reportName: string) {
    // mimic typing a message
    this.userInput = reportName + ' Report Generate Request';
    this.sendMessage(); // call your existing sendMessage()
  }

  sendReportInput() {
    const lifnrEl = document.getElementById('lifnr-input') as HTMLInputElement;
    if (!lifnrEl || !lifnrEl.value.trim()) {
      alert('Invalid Entry');
      return;
    }

    this.userInput = "Purchase Order Report DATA LIFNR Number " + lifnrEl.value.trim();
    this.sendMessage();

    lifnrEl.disabled = true;
    lifnrEl.id = 'NA-BT';

    const poBtn = document.getElementById('pobutton') as HTMLButtonElement;
    if (poBtn) {
      poBtn.disabled = true;
      poBtn.id = 'NA-TX';
    }
  }



  private scrollToMessage(index: number) {
    setTimeout(() => {
      const el = document.getElementById(`msg-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50); // delay so DOM updates first
  }


  // upload handling
  uploadFile(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!this.uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.uploadedFiles.push(file);

        // push a tile in "Uploading..." state (no more false 'Invalid' flash)
        this.messages.push({
          sender: 'user',
          type: 'file',
          fileName: file.name,
          fileSize: this.formatFileSize(file.size),
          timestamp: new Date(),
          isValid: null,
          // new upload state flags
          uploading: true,
          uploaded: false,
          isProcessing: false,
          validationResult: '',
          is_html: false
        });

        // simulate quick upload completion (client-side add)
        setTimeout(() => {
          const idx = this.messages.findIndex(m => m.type === 'file' && m.fileName === file.name);
          if (idx !== -1) {
            this.messages[idx].uploading = false;
            this.messages[idx].uploaded = true; // show 'Uploaded'
            this.updateSession();
          }
        }, 400);
      }
    }

    this.updateSession();
    event.target.value = '';
  }

  removeFile(file: File) {
    this.uploadedFiles = this.uploadedFiles.filter(f => !(f.name === file.name && f.size === file.size));
    this.updateSession();
  }

  clearFiles() {
    // ✅ Just clear the uploaded files panel
    this.uploadedFiles = [];
    this.updateSession();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  speak(text: string) {
    this.showVolume = false;

    this.tts.speak(
      text,
      () => console.log('▶️ Started reading'),
      () => {
        console.log('✅ Finished reading');
        this.ngZone.run(() => {
          this.showVolume = true;   // 🔥 Angular will detect this
        });
      },
      () => {
        console.log('❌ Error while reading');
        this.ngZone.run(() => {
          this.showVolume = true;
        });
      },
      (spoken, pending) => {
        console.log('📖 Spoken:', spoken);
        console.log('⏳ Remaining:', pending);
      }
    );
  }


  stop() {
    this.showVolume = true
    this.tts.stop();
  }

  onTyping() {
    if (!this.userInput.trim()) {
      this.dynamicSuggestions = [];
      return;
    }

    this.generateDynamicSuggestions(this.userInput);
  }

  private async animateBotResponse(text: string): Promise<void> {
    return new Promise<void>((resolve) => {
      // reset cancel flag for this animation
      this.cancelAnimationRequested = false;

      // prepare words array (keep words separated by single space)
      const words = text ? text.split(/\s+/).filter(w => w.length > 0) : [];
      const botMessage = { sender: 'bot', text: '', timestamp: new Date(), isAnimating: true };

      // append bot message that we fill progressively
      this.messages.push(botMessage);
      this.updateSession();

      const idx = this.messages.length - 1;
      this.currentBotMessageIndex = idx;

      let w = 0;
      const wordDelay = 80; // ms per word — tweak to taste (smaller => faster)

      // clear any prior interval just in case
      if (this.currentBotInterval) {
        clearInterval(this.currentBotInterval);
        this.currentBotInterval = null;
      }

      this.currentBotInterval = setInterval(() => {
        // If user asked to cancel, stop and resolve — leave currently shown words as-is
        if (this.cancelAnimationRequested) {
          clearInterval(this.currentBotInterval!);
          this.currentBotInterval = null;
          if (this.messages[idx]) {
            // mark animation ended for this message, but DO NOT append remaining words
            this.messages[idx].isAnimating = false;
          }
          this.updateSession();
          this.currentBotMessageIndex = null;
          resolve();
          return;
        }

        // Normal progress: add next word
        if (w < words.length) {
          if (this.messages[idx]) {
            // build text with spaces
            this.messages[idx].text = (this.messages[idx].text ? this.messages[idx].text + ' ' : '') + words[w];
          }
          w++;
          this.updateSession();
        } else {
          // finished naturally
          clearInterval(this.currentBotInterval!);
          this.currentBotInterval = null;
          if (this.messages[idx]) {
            this.messages[idx].isAnimating = false;
          }
          this.updateSession();
          this.currentBotMessageIndex = null;
          resolve();
        }
      }, wordDelay);
    });
  }

  cancelBotTyping() {
    this.cancelAnimationRequested = true;

    // clear running interval
    if (this.currentBotInterval) {
      clearInterval(this.currentBotInterval);
      this.currentBotInterval = null;
    }

    // stop any speaking (if TTS running)
    try { this.tts.stop(); } catch (e) { /* ignore */ }

    // allow user to type immediately
    this.isWaitingForBot = false;

    // reset index/state
    if (this.currentBotMessageIndex !== null) {
      const msg = this.messages[this.currentBotMessageIndex];
      if (msg) {
        msg.isAnimating = false;   // 👈 stop typing for this message
        msg.isCanceled = true;     // 👈 mark canceled so button hides
      }
    }

    this.currentBotMessageIndex = null;
    this.updateSession();
  }


  setFeedback(message: any, type: 'like' | 'dislike') {
    if (message.feedback === type) {
      message.feedback = null; // toggle off
    } else {
      message.feedback = type;
    }

    this.sessionUpdated.emit(this.session);
  }



}

