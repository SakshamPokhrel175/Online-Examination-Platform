import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstitutionSelectionComponent } from './institution-selector.component';

describe('InstitutionSelectorComponent', () => {
  let component: InstitutionSelectionComponent;
  let fixture: ComponentFixture<InstitutionSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstitutionSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
