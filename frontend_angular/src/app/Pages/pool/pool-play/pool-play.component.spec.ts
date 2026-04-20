import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoolPlayComponent } from './pool-play.component';

describe('PoolPlayComponent', () => {
  let component: PoolPlayComponent;
  let fixture: ComponentFixture<PoolPlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoolPlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoolPlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
