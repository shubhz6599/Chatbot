import { Component, ViewChild } from '@angular/core';
import { CallAssistantComponent } from './call-assistant/call-assistant.component';

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
  // NEW: user role (agent | supplier)
  role: 'agent' | 'supplier' | null = null;

  @ViewChild(CallAssistantComponent) callAssistantComp!: CallAssistantComponent;
  constructor() {
    this.loadSessionHistory();
    if (!this.currentSession) this.createNewSession();
  }
  handleStartCall() {
    this.currentView = 'callAssistant';

    setTimeout(() => {
      if (this.callAssistantComp) {
        // if role is null default to supplier (caller)
        const roleToUse = this.role || 'supplier';
        this.callAssistantComp.startBrowserCall(roleToUse);
      }
    }, 0);
  }

  // NEW: called from role selection UI
  setRole(choice: 'agent' | 'supplier') {
    this.role = choice;
    // if agent, we let call-assistant initialize on next open;
    // if agent currently viewing callAssistant, make sure device init happens
    if (choice === 'agent') {
      // if call assistant exists, ensure device ready to accept incoming
      setTimeout(() => {
        if (this.callAssistantComp) {
          this.callAssistantComp.ensureDeviceReadyForRole('agent');
        }
      }, 50);
    }
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
    } else {
      this.currentView = view;   // ✅ allow faqs, callAssistant, history
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
    // Don't store empty sessions (only "bot hello" exists)
    const hasUserMessage = updatedSession.messages.some((msg: any) => msg.sender === 'user');

    // Update title only if it's still default "New Chat"
    if (updatedSession.title === 'New Chat' && hasUserMessage) {
      const firstUserMsg = updatedSession.messages.find((msg: any) => msg.sender === 'user');
      if (firstUserMsg) {
        if (firstUserMsg.text) {
          updatedSession.title = firstUserMsg.text.length > 30
            ? firstUserMsg.text.substring(0, 30) + '...'
            : firstUserMsg.text;
        } else if (firstUserMsg.fileName) {
          updatedSession.title = firstUserMsg.fileName;
        }
      }
    }

    this.currentSession = updatedSession;

    if (hasUserMessage) {
      const index = this.sessionHistory.findIndex(s => s.id === updatedSession.id);
      if (index !== -1) {
        this.sessionHistory[index] = updatedSession;
      } else {
        this.sessionHistory.unshift(updatedSession);
      }
      this.saveSessionHistory();
    }
  }

  createNewSession() {
    // 👉 Don't push to history immediately
    const newSession = {
      id: Date.now(),
      title: 'New Chat',
      messages: [
        { sender: 'bot', text: 'Hello! How can I assist you today?', timestamp: new Date().toISOString(), feedback: null }
      ],
      date: new Date(),
      lastUpdated: new Date()
    };
    this.currentSession = newSession;
    // ⚠️ sessionHistory.unshift(newSession) REMOVED
    // ⚠️ this.saveSessionHistory() REMOVED
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
