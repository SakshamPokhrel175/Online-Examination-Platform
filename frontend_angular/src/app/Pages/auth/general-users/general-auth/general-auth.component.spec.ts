import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralAuthComponent } from './general-auth.component';

describe('GeneralAuthComponent', () => {
  let component: GeneralAuthComponent;
  let fixture: ComponentFixture<GeneralAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralAuthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
