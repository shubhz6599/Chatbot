// app.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  currentView: string = 'chat';
  isSidebarCollapsed: boolean = false;
  isListening: boolean = false;

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  changeView(view: string) {
    this.currentView = view;
    // Stop listening if we switch views
    if (this.isListening) {
      this.isListening = false;
    }
  }

  onStartListening() {
    this.isListening = true;
  }

  onStopListening() {
    this.isListening = false;
  }
}
