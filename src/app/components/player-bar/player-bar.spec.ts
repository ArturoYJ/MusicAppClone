import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerBarComponent } from './player-bar';

describe('PlayerBar', () => {
  let component: PlayerBarComponent;
  let fixture: ComponentFixture<PlayerBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
