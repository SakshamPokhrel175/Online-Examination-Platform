import { TestBed } from '@angular/core/testing';

import { ProctoringSocketService } from './proctoring-socket.service';

describe('ProctoringSocketService', () => {
  let service: ProctoringSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProctoringSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
