import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteProctoringComponent } from './remote-proctoring.component';

describe('RemoteProctoringComponent', () => {
  let component: RemoteProctoringComponent;
  let fixture: ComponentFixture<RemoteProctoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteProctoringComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoteProctoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
