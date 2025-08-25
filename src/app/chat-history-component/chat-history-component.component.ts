import { Component } from '@angular/core';

@Component({
  selector: 'app-chat-history-component',
  templateUrl: './chat-history-component.component.html',
  styleUrls: ['./chat-history-component.component.css']
})
export class ChatHistoryComponentComponent {
  sessionHistory = [
    [{ sender: 'user', text: 'Hello' }, { sender: 'bot', text: 'Hi there!' }],
    [{ sender: 'user', text: 'How are you?' }, { sender: 'bot', text: 'I am doing well, thank you!' }],
    [{ sender: 'user', text: 'What can you do?' }, { sender: 'bot', text: 'I can help answer your questions!' }]
  ];

  viewSession(index: number) {
    console.log('Viewing session:', index);
  }
    getCurrentTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
