import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CallAssistantComponent } from './call-assistant.component';

describe('CallAssistantComponent', () => {
  let component: CallAssistantComponent;
  let fixture: ComponentFixture<CallAssistantComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CallAssistantComponent]
    });
    fixture = TestBed.createComponent(CallAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
