import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstitutionsStatsComponent } from './institutions-stats.component';

describe('InstitutionsStatsComponent', () => {
  let component: InstitutionsStatsComponent;
  let fixture: ComponentFixture<InstitutionsStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionsStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstitutionsStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
