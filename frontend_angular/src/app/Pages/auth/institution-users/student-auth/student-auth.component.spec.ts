import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentAuthComponent } from './student-auth.component';

describe('StudentAuthComponent', () => {
  let component: StudentAuthComponent;
  let fixture: ComponentFixture<StudentAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentAuthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
