import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SidebarComponentComponent } from './sidebar-component/sidebar-component.component';
import { ChatAreaComponentComponent } from './chat-area-component/chat-area-component.component';
import { ChatHistoryComponentComponent } from './chat-history-component/chat-history-component.component';
import { FileValidatorComponentComponent } from './file-validator-component/file-validator-component.component';
import { VoiceRecordingComponentComponent } from './voice-recording-component/voice-recording-component.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponentComponent,
    ChatAreaComponentComponent,
    ChatHistoryComponentComponent,
    FileValidatorComponentComponent,
    VoiceRecordingComponentComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
