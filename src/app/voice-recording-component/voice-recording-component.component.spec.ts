import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoiceRecordingComponentComponent } from './voice-recording-component.component';

describe('VoiceRecordingComponentComponent', () => {
  let component: VoiceRecordingComponentComponent;
  let fixture: ComponentFixture<VoiceRecordingComponentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VoiceRecordingComponentComponent]
    });
    fixture = TestBed.createComponent(VoiceRecordingComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
