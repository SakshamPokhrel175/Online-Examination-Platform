import { TestBed } from '@angular/core/testing';

import { QuizBuilderService } from './quiz-builder.service';

describe('QuizBuilderService', () => {
  let service: QuizBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuizBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
