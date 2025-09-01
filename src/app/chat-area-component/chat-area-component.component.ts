import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, OnChanges } from '@angular/core';
import { SpeechService } from '../services/speech.service';
import { Subscription } from 'rxjs';
import { ValidationResult, ValidationService } from '../services/validation.service';
import * as XLSX from 'xlsx';
import { ChatService } from '../services/chat.service';
import { TextToSpeechService } from '../services/text-to-speech.service';
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

downloadLinks: {[fileName: string]: string} = {};
  // quick suggestions
  initialQuestions = [
    'How can I change my email/Phone',
    'How can I reset my password?',
    'How can I validate asn file',
    // 'What is your pricing?'
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

  constructor(private speechService: SpeechService, private validationService: ValidationService,private chatService: ChatService, private tts: TextToSpeechService) {}

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
  if (!this.userInput.trim() && this.uploadedFiles.length === 0) return; // nothing to send
  if (this.isWaitingForBot) return;

  const userMessageLower = this.userInput.toLowerCase();

  // show user message
  if (this.userInput.trim()) {
    this.messages.push({ sender: 'user', text: this.userInput, timestamp: new Date() });
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
    next: (res) => {
      // remove typing indicator
      this.messages = this.messages.filter(m => !m.typing);

      const botMessage: any = {
        sender: 'bot',
        text: res?.answer || "Sorry, I couldn't find an answer.",
        timestamp: new Date(),
        debug: res?.debug,
        mode: res?.mode
      };

      this.messages.push(botMessage);
      this.isWaitingForBot = false;
      this.updateSession();

      // auto-scroll to bottom
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
      this.isWaitingForBot = false;
      this.updateSession();
    }
  });
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

          // Format errors with line breaks for better readability
          const formattedErrors = validationResult.errors && validationResult.errors.length > 0
            ? validationResult.errors.join('\n')
            : '';

          this.messages[fileMessageIndex].validationResult = validationResult.isValid
            ? `✓ ${file.name} is a valid ${fileType} file.`
            : `✗ ${file.name} is not a valid ${fileType} file.\n${formattedErrors}`;
        }

        // Create enhanced file with error highlights if there are errors
        if (!validationResult.isValid && validationResult.errors && validationResult.errors.length > 0) {
          this.createEnhancedFileWithErrors(file, validationResult.errors);
        }

        // Format the error message with proper line breaks
        const errorMessage = validationResult.isValid
          ? `The file "${file.name}" is a valid ${fileType} file.`
          : `The file "${file.name}" failed validation:\n${(validationResult.errors || []).join('\n')}`;

        this.messages.push({
          sender: 'bot',
          text: errorMessage,
          timestamp: new Date(),
          // Add download link if there are errors
          hasErrors: !validationResult.isValid,
          fileName: file.name
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

  // Create enhanced Excel file with error highlights
  createEnhancedFileWithErrors(file: File, errors: string[]) {
    try {
      // Check if XLSX is available
      if (typeof XLSX === 'undefined') {
        console.error('XLSX library is not available');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          // Parse the CSV to get the raw data
          const rawData:any = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Add error information to the data
          this.markErrorsInData(rawData, errors);

          // Create a new worksheet with error highlights
          const newWorksheet = XLSX.utils.aoa_to_sheet(rawData);

          // Apply styling to error cells
          this.applyErrorStyles(newWorksheet, errors);

          // Create new workbook
          const newWorkbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Validation Results');

          // Generate Excel file
          const excelBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

          // Create download link
          this.downloadLinks[file.name] = URL.createObjectURL(blob);
        } catch (error) {
          console.error('Error creating enhanced file:', error);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error in createEnhancedFileWithErrors:', error);
    }
  }

  // Mark errors in the data
  markErrorsInData(data: any[], errors: string[]) {
    if (!data || data.length === 0) return;

    // Add header for error column if it doesn't exist
    if (data[0].indexOf('Validation Errors') === -1) {
      data[0].push('Validation Errors');
    }

    // Process each row to add error information
    for (let i = 1; i < data.length; i++) {
      const rowErrors = errors.filter(error => {
        const match = error.match(/Cell ([A-Z]+)(\d+):/);
        if (match) {
          const rowNum = parseInt(match[2], 10);
          return rowNum === i + 1; // +1 because Excel rows are 1-indexed and our array is 0-indexed
        }
        return false;
      });

      // Add errors to the row
      if (data[i].length < data[0].length) {
        // Pad the row with empty cells if needed
        while (data[i].length < data[0].length - 1) {
          data[i].push('');
        }
      }

      data[i].push(rowErrors.map(e => e.replace(/Cell [A-Z]+\d+:\s*/, '')).join('; '));
    }
  }

  // Apply styles to error cells
  applyErrorStyles(worksheet: any, errors: string[]) {
    if (!worksheet || !worksheet['!ref']) return;

    // Define the error style
    const errorStyle = {
      fill: { fgColor: { rgb: "FFFF0000" } }, // Red background
      font: { color: { rgb: "FFFFFFFF" }, bold: true } // White bold text
    };

    // Apply styles to cells with errors
    errors.forEach(error => {
      const match = error.match(/Cell ([A-Z]+)(\d+):/);
      if (match) {
        const col = match[1];
        const row = match[2];
        const cellAddress = `${col}${row}`;

        // Apply style to the error cell
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' };
        worksheet[cellAddress].s = errorStyle;
      }
    });

    // Style the error column header
    try {
      const lastCell = worksheet['!ref'].split(':')[1];
      const errorCol = String.fromCharCode(65 + lastCell.charCodeAt(0) - 65);
      const headerCell = `${errorCol}1`;
      if (!worksheet[headerCell]) worksheet[headerCell] = { t: 's', v: 'Validation Errors' };
      worksheet[headerCell].s = {
        fill: { fgColor: { rgb: "FFFFCC00" } }, // Yellow background
        font: { bold: true }
      };
    } catch (error) {
      console.error('Error styling header:', error);
    }
  }

  // Download file with error highlights
  downloadFileWithErrors(fileName: string) {
    if (this.downloadLinks[fileName]) {
      const link = document.createElement('a');
      link.href = this.downloadLinks[fileName];
      link.download = fileName.replace('.csv', '_with_errors.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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

