import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatHistoryComponentComponent } from './chat-history-component.component';

describe('ChatHistoryComponentComponent', () => {
  let component: ChatHistoryComponentComponent;
  let fixture: ComponentFixture<ChatHistoryComponentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChatHistoryComponentComponent]
    });
    fixture = TestBed.createComponent(ChatHistoryComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
