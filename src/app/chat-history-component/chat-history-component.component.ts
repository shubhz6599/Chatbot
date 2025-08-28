// chat-history-component.component.ts
import { Component, EventEmitter, Output, OnInit } from '@angular/core';

@Component({
  selector: 'app-chat-history-component',
  templateUrl: './chat-history-component.component.html',
  styleUrls: ['./chat-history-component.component.css']
})
export class ChatHistoryComponentComponent implements OnInit {
  @Output() sessionSelected = new EventEmitter<any>();

  sessionHistory: any[] = [];

  ngOnInit() {
    this.loadChatHistory();
  }

  loadChatHistory() {
    // Try to load from localStorage
    const savedHistory = localStorage.getItem('chatHistory');

    if (savedHistory) {
      this.sessionHistory = JSON.parse(savedHistory);
    } else {
      // Create default hardcoded sessions if none exist
      this.sessionHistory = [
        {
          id: 1,
          title: 'Customer Support Query',
          messages: [
            { sender: 'user', text: 'Hello, I need help with my account', timestamp: new Date(2023, 5, 15, 14, 30) },
            { sender: 'bot', text: 'Hi there! How can I assist you today?', timestamp: new Date(2023, 5, 15, 14, 30) }
          ],
          date: new Date(2023, 5, 15, 14, 30),
          lastUpdated: new Date(2023, 5, 15, 14, 35)
        },
        {
          id: 2,
          title: 'Product Information',
          messages: [
            { sender: 'user', text: 'Tell me about your premium plan', timestamp: new Date(2023, 5, 14, 10, 15) },
            { sender: 'bot', text: 'Our premium plan includes advanced features...', timestamp: new Date(2023, 5, 14, 10, 15) }
          ],
          date: new Date(2023, 5, 14, 10, 15),
          lastUpdated: new Date(2023, 5, 14, 10, 20)
        },
        {
          id: 3,
          title: 'Technical Issue',
          messages: [
            { sender: 'user', text: 'I cannot login to my account', timestamp: new Date(2023, 5, 13, 16, 45) },
            { sender: 'bot', text: 'Let me help you with that. Have you tried resetting your password?', timestamp: new Date(2023, 5, 13, 16, 45) }
          ],
          date: new Date(2023, 5, 13, 16, 45),
          lastUpdated: new Date(2023, 5, 13, 16, 50)
        }
      ];

      // Save to localStorage
      localStorage.setItem('chatHistory', JSON.stringify(this.sessionHistory));
    }
  }

  viewSession(session: any) {
    this.sessionSelected.emit(session);
  }

  // createNewChat() {
  //   // Create a new empty session
  //   const newSession = {
  //     id: Date.now(),
  //     title: 'New Chat',
  //     messages: [
  //       {
  //         sender: 'bot',
  //         text: 'Hello! How can I assist you today?',
  //         timestamp: new Date()
  //       }
  //     ],
  //     date: new Date(),
  //     lastUpdated: new Date()
  //   };

  //   // Add to history
  //   this.sessionHistory.unshift(newSession);

  //   // Save to localStorage
  //   localStorage.setItem('chatHistory', JSON.stringify(this.sessionHistory));

  //   // Emit the new session
  //   this.sessionSelected.emit(newSession);
  // }

  formatDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today at ' + new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday at ' + new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  }
}
