import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProctorReviewComponent } from './proctor-review.component';

describe('ProctorReviewComponent', () => {
  let component: ProctorReviewComponent;
  let fixture: ComponentFixture<ProctorReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProctorReviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProctorReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
