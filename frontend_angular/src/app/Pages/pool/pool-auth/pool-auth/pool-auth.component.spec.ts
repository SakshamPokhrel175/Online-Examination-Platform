import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoolAuthComponent } from './pool-auth.component';

describe('PoolAuthComponent', () => {
  let component: PoolAuthComponent;
  let fixture: ComponentFixture<PoolAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoolAuthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoolAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
