import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoolScoreboardComponent } from './pool-scoreboard.component';

describe('PoolScoreboardComponent', () => {
  let component: PoolScoreboardComponent;
  let fixture: ComponentFixture<PoolScoreboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoolScoreboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoolScoreboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
