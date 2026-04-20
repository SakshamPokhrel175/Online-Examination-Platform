import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizBuilderComponent } from './quiz-builder.component';

describe('QuizBuilderComponent', () => {
  let component: QuizBuilderComponent;
  let fixture: ComponentFixture<QuizBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizBuilderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
