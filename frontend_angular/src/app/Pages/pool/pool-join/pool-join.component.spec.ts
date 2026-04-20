import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoolJoinComponent } from './pool-join.component';

describe('PoolJoinComponent', () => {
  let component: PoolJoinComponent;
  let fixture: ComponentFixture<PoolJoinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoolJoinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoolJoinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
