import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { SpeechService } from '../services/speech.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-area-component',
  templateUrl: './chat-area-component.component.html',
  styleUrls: ['./chat-area-component.component.css']
})
export class ChatAreaComponentComponent implements OnInit, OnDestroy {
  @Input() isListening: boolean = false;
  @Output() startListening = new EventEmitter<void>();
  @Output() stopListening = new EventEmitter<void>();

  messages: any[] = [];
  userInput: string = '';
  initialQuestions = [
    'What is your name?',
    'How can I reset my password?',
    'Tell me about your services.',
    'What is your pricing?'
  ];

  // Dynamic suggestions based on speech
  dynamicSuggestions: string[] = [];
  isProcessingSpeech: boolean = false;
  isWaitingForBot: boolean = false;
  interimSpeechText: string = '';
  showTooltip: boolean = true;
  errorMessage: string = '';

  // Define which questions should show action buttons
  private questionsWithActions = [
    'password',
    'reset',
    'pricing',
    'services',
    'contact',
    'support'
  ];

  private speechSubscription: Subscription | null = null;
  private speechText: string = '';

  constructor(private speechService: SpeechService) {}

  ngOnInit() {
    // Hide tooltip after 5 seconds
    // setTimeout(() => this.showTooltip = false, 5000);
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  sendMessage() {
    if (this.userInput.trim() && !this.isWaitingForBot) {
      this.messages.push({ sender: 'user', text: this.userInput });
      const userMessage = this.userInput;
      this.userInput = '';
      this.dynamicSuggestions = [];
      this.isWaitingForBot = true;

      // Show typing indicator
      this.messages.push({ sender: 'bot', typing: true });

      // Simulate bot response after a short delay
      setTimeout(() => {
        // Remove typing indicator
        this.messages = this.messages.filter(msg => !msg.typing);

        // Check if this message should have action buttons
        const hasActions = this.shouldHaveActions(userMessage);

        // Add bot response
        const botMessage: any = {
          sender: 'bot',
          text: `I understand you asked about "${userMessage}". How can I help you with that?`
        };

        // Add action buttons if needed
        if (hasActions) {
          botMessage.actions = this.getActionsForMessage(userMessage);
        }

        this.messages.push(botMessage);

        this.isWaitingForBot = false;

        // Scroll to bottom after new message
        setTimeout(() => {
          const messagesContainer = document.querySelector('.chat-messages');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 0);
      }, 2000);
    }
  }

  // Determine if a message should have action buttons
  private shouldHaveActions(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return this.questionsWithActions.some(keyword =>
      lowerMessage.includes(keyword)
    );
  }

  // Get appropriate actions for a message
  private getActionsForMessage(message: string): any[] {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('password') || lowerMessage.includes('reset')) {
      return [
        { text: 'Reset Password', action: 'reset' },
        { text: 'Contact Support', action: 'support' },
        { text: 'Account Recovery', action: 'recovery' }
      ];
    } else if (lowerMessage.includes('pricing')) {
      return [
        { text: 'View Basic Plan', action: 'basic' },
        { text: 'View Premium Plan', action: 'premium' },
        { text: 'Contact Sales', action: 'sales' }
      ];
    } else if (lowerMessage.includes('service')) {
      return [
        { text: 'Web Development', action: 'web' },
        { text: 'Mobile Apps', action: 'mobile' },
        { text: 'Consultation', action: 'consult' }
      ];
    } else if (lowerMessage.includes('contact') || lowerMessage.includes('support')) {
      return [
        { text: 'Call Support', action: 'call' },
        { text: 'Email Us', action: 'email' },
        { text: 'Live Chat', action: 'chat' }
      ];
    }

    // Default actions
    return [
      { text: 'Learn More', action: 'more' },
      { text: 'Contact Us', action: 'contact' },
      { text: 'Documentation', action: 'docs' }
    ];
  }

  // Handle action button clicks
  handleAction(action: string, messageText: string) {
    console.log(`Action: ${action} for message: ${messageText}`);

    // You can implement different behaviors based on the action
    switch(action) {
      case 'reset':
        this.userInput = 'I need to reset my password';
        this.sendMessage();
        break;
      case 'support':
        this.userInput = 'I want to contact support';
        this.sendMessage();
        break;
      case 'basic':
        this.userInput = 'Tell me about your basic plan';
        this.sendMessage();
        break;
      case 'premium':
        this.userInput = 'Tell me about your premium plan';
        this.sendMessage();
        break;
      // Add more cases as needed
      default:
        // For unhandled actions, just show a message
        this.messages.push({
          sender: 'bot',
          text: `You selected: ${action}. How can I help you with this?`
        });
    }
  }

  selectSuggestion(question: string) {
    this.userInput = question;
    this.sendMessage();
  }

  onStartListening() {
    // Reset any previous error
    this.errorMessage = '';

    // Reset the speech service to ensure it can be started again
    this.speechService.reset();

    this.startListening.emit();
    this.isProcessingSpeech = true;
    this.interimSpeechText = 'Listening...';
    this.dynamicSuggestions = [];

    this.speechSubscription = this.speechService.startListening().subscribe(
      (text: string) => {
        this.interimSpeechText = text;
        this.generateDynamicSuggestions(text);
      },
      (error: any) => {
        console.error('Speech recognition error:', error);
        this.showError('Unable to recognize speech. Please try again.');
        this.isProcessingSpeech = false;
        this.interimSpeechText = '';
        this.onStopListening();
      },
      () => {
        // Completion handler
        this.isProcessingSpeech = false;
        this.userInput = this.interimSpeechText;
        this.interimSpeechText = '';
        this.onStopListening();
      }
    );
  }

  onStopListening() {
    if (this.speechSubscription) {
      this.speechSubscription.unsubscribe();
      this.speechSubscription = null;
    }
    this.speechService.stopListening();
    this.stopListening.emit();

    // If we have interim text, process it
    if (this.interimSpeechText && this.interimSpeechText !== 'Listening...') {
      this.userInput = this.interimSpeechText;
    }

    this.isProcessingSpeech = false;
  }

  showError(message: string) {
    this.errorMessage = message;
    // Auto-hide error after 3 seconds
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }

  generateDynamicSuggestions(text: string) {
    // Simple logic to generate suggestions based on spoken text
    const lowerText = text.toLowerCase();

    if (lowerText.includes('password') || lowerText.includes('reset')) {
      this.dynamicSuggestions = [
        'How to reset my password?',
        'I forgot my password',
        'Change my password'
      ];
    } else if (lowerText.includes('service') || lowerText.includes('help')) {
      this.dynamicSuggestions = [
        'What services do you offer?',
        'Tell me about your services',
        'How can you help me?'
      ];
    } else if (lowerText.includes('contact') || lowerText.includes('support')) {
      this.dynamicSuggestions = [
        'How to contact support?',
        'Customer service number',
        'Email support'
      ];
    } else if (lowerText.includes('account') || lowerText.includes('login')) {
      this.dynamicSuggestions = [
        'I cannot access my account',
        'Login issues',
        'Account recovery'
      ];
    } else if (text.trim().length > 0) {
      // Default suggestions if text is not empty but no keywords matched
      this.dynamicSuggestions = [
        'Can you elaborate on that?',
        'I need more help with this',
        'What else can you tell me about this?'
      ];
    } else {
      // No speech detected
      this.dynamicSuggestions = [];
    }
  }

  ngOnDestroy() {
    if (this.speechSubscription) {
      this.speechSubscription.unsubscribe();
    }
    this.speechService.reset();
  }
}
