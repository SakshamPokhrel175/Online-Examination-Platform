import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoolDashboardComponent } from './pool-dashboard.component';

describe('PoolDashboardComponent', () => {
  let component: PoolDashboardComponent;
  let fixture: ComponentFixture<PoolDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoolDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoolDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
