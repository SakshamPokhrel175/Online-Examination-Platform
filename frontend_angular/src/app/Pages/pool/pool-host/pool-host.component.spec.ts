import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoolHostComponent } from './pool-host.component';

describe('PoolHostComponent', () => {
  let component: PoolHostComponent;
  let fixture: ComponentFixture<PoolHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoolHostComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoolHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
