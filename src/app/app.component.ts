import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  currentView: string = 'chat';
  isSidebarCollapsed: boolean = true;
  isListening: boolean = false;
  currentSession: any = null;
  sessionHistory: any[] = [];
  isMinimized: boolean = true;

  constructor() {
    this.loadSessionHistory();
    if (!this.currentSession) this.createNewSession();
  }

  toggleChatbot() {
    this.isMinimized = !this.isMinimized;
    if (!this.isMinimized) this.currentView = 'chat';
  }

  toggleSidebar() { this.isSidebarCollapsed = !this.isSidebarCollapsed; }

changeView(view: string) {
  if (view === 'newChat') {
    this.createNewSession();   // create fresh session
    this.currentView = 'chat'; // open chat window
  } else if (view === 'history') {
    this.currentView = 'history';
  } else {
    this.currentView = 'chat';
  }

  if (this.isListening) this.isListening = false;
}


  onStartListening() { this.isListening = true; }
  onStopListening() { this.isListening = false; }

  onSessionSelected(session: any) {
    this.currentSession = session;
    this.currentView = 'chat';
  }

  onSessionUpdated(updatedSession: any) {
    this.currentSession = updatedSession;
    const index = this.sessionHistory.findIndex(s => s.id === updatedSession.id);
    if (index !== -1) this.sessionHistory[index] = updatedSession;
    else this.sessionHistory.unshift(updatedSession);
    this.saveSessionHistory();
  }

  createNewSession() {
    console.log(this.sessionHistory);

    const newSession = {
      id: Date.now(),
      title: 'New Chat',
      messages: [{ sender: 'bot', text: 'Hello! How can I assist you today?', timestamp: new Date() }],
      date: new Date(),
      lastUpdated: new Date()
    };
    this.currentSession = newSession;
    this.sessionHistory.unshift(newSession);
    this.saveSessionHistory();
  }

  loadSessionHistory() {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      this.sessionHistory = JSON.parse(saved);
      if (this.sessionHistory.length > 0 && !this.currentSession) {
        this.currentSession = this.sessionHistory[0];
      }
    }
  }

  saveSessionHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(this.sessionHistory));
  }
}
