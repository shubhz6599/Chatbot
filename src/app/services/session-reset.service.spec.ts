import { TestBed } from '@angular/core/testing';

import { SessionResetService } from './session-reset.service';

describe('SessionResetService', () => {
  let service: SessionResetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionResetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
