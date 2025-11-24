import { TestBed } from '@angular/core/testing';

import { RealtimeVoiceService } from './realtime-voice.service';

describe('RealtimeVoiceService', () => {
  let service: RealtimeVoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RealtimeVoiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
