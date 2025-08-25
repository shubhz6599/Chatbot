import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-voice-recording-component',
  templateUrl: './voice-recording-component.component.html',
  styleUrls: ['./voice-recording-component.component.css']
})
export class VoiceRecordingComponentComponent {
   @Output() stopListening = new EventEmitter<void>();

  onStopListening() {
    this.stopListening.emit();
  }
}
