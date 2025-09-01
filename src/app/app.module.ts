import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SidebarComponentComponent } from './sidebar-component/sidebar-component.component';
import { ChatAreaComponentComponent } from './chat-area-component/chat-area-component.component';
import { ChatHistoryComponentComponent } from './chat-history-component/chat-history-component.component';
import { FormsModule } from '@angular/forms';
import { ValidationService } from './services/validation.service';
import { Papa } from 'ngx-papaparse';
import { ChatService } from './services/chat.service';
import { HttpClientModule } from '@angular/common/http';
@NgModule({
  declarations: [
    AppComponent,
    SidebarComponentComponent,
    ChatAreaComponentComponent,
    ChatHistoryComponentComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [ValidationService,
    Papa, ChatService],
  bootstrap: [AppComponent]
})
export class AppModule { }
