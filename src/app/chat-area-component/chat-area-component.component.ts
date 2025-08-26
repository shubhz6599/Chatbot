import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, OnChanges } from '@angular/core';
import { SpeechService } from '../services/speech.service';
import { Subscription } from 'rxjs';
import { ValidationResult, ValidationService } from '../services/validation.service';

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

  messages: any[] = [];
  userInput: string = '';
  uploadedFiles: File[] = [];
showVoiceAnim:boolean = false;
  // quick suggestions
  initialQuestions = [
    'What is your name?',
    'How can I reset my password?',
    'Tell me about your services.',
    'What is your pricing?'
  ];

  // dynamic suggestions (speech)
  dynamicSuggestions: string[] = [];
  isProcessingSpeech: boolean = false;
  isWaitingForBot: boolean = false; // controls disabling while bot “types”
  interimSpeechText: string = '';
  showTooltip: boolean = true;
  errorMessage: string = '';

  // action buttons keywords
  private questionsWithActions = ['password','reset','pricing','services','contact','support'];

  private speechSubscription: Subscription | null = null;

  constructor(private speechService: SpeechService, private validationService: ValidationService) {}

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
          timestamp: new Date()
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
this.showVoiceAnim =true
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
        this.generateDynamicSuggestions(text);
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
    this.isProcessingSpeech = false;
    this.isListening = false;
  }

  showError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => (this.errorMessage = ''), 3000);
  }

  generateDynamicSuggestions(text: string) {
    const lower = text.toLowerCase();
    if (lower.includes('password') || lower.includes('reset')) {
      this.dynamicSuggestions = ['How to reset my password?', 'I forgot my password', 'Change my password'];
    } else if (lower.includes('service') || lower.includes('help')) {
      this.dynamicSuggestions = ['What services do you offer?', 'Tell me about your services', 'How can you help me?'];
    } else if (lower.includes('contact') || lower.includes('support')) {
      this.dynamicSuggestions = ['How to contact support?', 'Customer service number', 'Email support'];
    } else if (lower.includes('account') || lower.includes('login')) {
      this.dynamicSuggestions = ['I cannot access my account', 'Login issues', 'Account recovery'];
    } else if (text.trim().length > 0) {
      this.dynamicSuggestions = ['Can you elaborate on that?', 'I need more help with this', 'What else can you tell me about this?'];
    } else {
      this.dynamicSuggestions = [];
    }
  }

  // main send
  sendMessage() {
    if (!this.userInput.trim() || this.isWaitingForBot) return;

    const userMessageLower = this.userInput.toLowerCase();
    // push user message
    this.messages.push({ sender: 'user', text: this.userInput, timestamp: new Date() });
    this.updateSession();

    // detect validation intent
    if ((userMessageLower.includes('validate') && userMessageLower.includes('asn')) || (userMessageLower.includes('valid') && userMessageLower.includes('asn'))) {
      let fileType = 'ASN';
      if (userMessageLower.includes('vendor')) fileType = 'Vendor';
      else if (userMessageLower.includes('asn')) fileType = 'ASN';

      this.userInput = '';
      this.isWaitingForBot = true;
      this.validateFiles(fileType).finally(() => {
        // make sure UI re-enables after validation completes
        this.isWaitingForBot = false;
        this.updateSession();
      });
      return;
    }

    // normal chat bot simulation
    const sentText = this.userInput;
    this.userInput = '';
    this.dynamicSuggestions = [];
    this.isWaitingForBot = true;

    // typing indicator
    this.messages.push({ sender: 'bot', typing: true, timestamp: new Date() });
    this.updateSession();

    setTimeout(() => {
      // remove typing indicator
      this.messages = this.messages.filter(m => !m.typing);

      const hasActions = this.shouldHaveActions(sentText);
      const botMessage: any = {
        sender: 'bot',
        text: `I understand you asked about "${sentText}". How can I help you with that?`,
        timestamp: new Date()
      };
      if (hasActions) botMessage.actions = this.getActionsForMessage(sentText);

      this.messages.push(botMessage);
      this.isWaitingForBot = false; // ✅ re-enable input after bot reply
      this.updateSession();

      setTimeout(() => {
        const c = document.querySelector('.chat-messages') as HTMLElement | null;
        if (c) c.scrollTop = c.scrollHeight;
      }, 0);
    }, 1200);
  }

  // validation (ASN still supported here)
  async validateFiles(fileType: string = 'ASN') {
    if (this.uploadedFiles.length === 0) {
      this.messages.push({
        sender: 'bot',
        text: 'No files uploaded. Please upload files to validate.',
        timestamp: new Date()
      });
      this.updateSession();
      return;
    }

    // show typing
    this.messages.push({ sender: 'bot', typing: true, timestamp: new Date() });
    this.updateSession();

    for (const file of this.uploadedFiles) {
      try {
        // locate UI tile
        const fileMessageIndex = this.messages.findIndex(msg => msg.type === 'file' && msg.fileName === file.name);

        // switch tile into "Validating..." state
        if (fileMessageIndex !== -1) {
          this.messages[fileMessageIndex].isProcessing = true;
          this.messages[fileMessageIndex].uploading = false; // ensure not in upload state
          this.messages[fileMessageIndex].uploaded = true;
          this.messages[fileMessageIndex].validationResult = 'Validating...';
          this.updateSession();
        }

        let validationResult: ValidationResult;

        if (fileType === 'ASN') {
          validationResult = await this.validationService.validateASNFile(file);
        } else {
          validationResult = {
            isValid: false,
            message: `Unknown file type: ${fileType}`,
            errors: [`Validation not supported for ${fileType} files`],
            isProcessing: false
          };
        }

        if (fileMessageIndex !== -1) {
          this.messages[fileMessageIndex].isValid = validationResult.isValid;
          this.messages[fileMessageIndex].isProcessing = false;
          this.messages[fileMessageIndex].validationResult = validationResult.isValid
            ? `✓ ${file.name} is a valid ${fileType} file.`
            : `✗ ${file.name} is not a valid ${fileType} file.${validationResult.errors?.length ? ' Errors: ' + validationResult.errors.join(', ') : ''}`;
        }

        this.messages.push({
          sender: 'bot',
          text: validationResult.isValid
            ? `The file "${file.name}" is a valid ${fileType} file.`
            : `The file "${file.name}" failed validation: ${validationResult.message}. ${validationResult.errors?.join(' ') || ''}`,
          timestamp: new Date()
        });
        this.updateSession();
      } catch (error: any) {
        const idx = this.messages.findIndex(msg => msg.type === 'file' && msg.fileName === file.name);
        if (idx !== -1) {
          this.messages[idx].isValid = false;
          this.messages[idx].isProcessing = false;
          this.messages[idx].validationResult = `Error: ${error?.message || 'Unknown error'}`;
        }
        this.messages.push({
          sender: 'bot',
          text: `Error validating file "${file.name}": ${error?.message || 'Unknown error'}`,
          timestamp: new Date()
        });
        this.updateSession();
      }
    }

    // remove typing
    this.messages = this.messages.filter(m => !m.typing);
    this.updateSession();

    setTimeout(() => {
      const c = document.querySelector('.chat-messages') as HTMLElement | null;
      if (c) c.scrollTop = c.scrollHeight;
    }, 0);
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
          validationResult: ''
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
}
