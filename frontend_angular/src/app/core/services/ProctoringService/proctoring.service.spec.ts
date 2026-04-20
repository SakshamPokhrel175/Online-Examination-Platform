import { TestBed } from '@angular/core/testing';

import { ProctoringService } from './proctoring.service';

describe('ProctoringService', () => {
  let service: ProctoringService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProctoringService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
