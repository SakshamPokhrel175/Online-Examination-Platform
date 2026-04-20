import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacultyAuthComponent } from './faculty-auth.component';

describe('FacultyAuthComponent', () => {
  let component: FacultyAuthComponent;
  let fixture: ComponentFixture<FacultyAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacultyAuthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacultyAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
