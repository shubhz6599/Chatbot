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

      ];

      // Save to localStorage
      localStorage.setItem('chatHistory', JSON.stringify(this.sessionHistory));
    }
    console.log(this.sessionHistory);

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
