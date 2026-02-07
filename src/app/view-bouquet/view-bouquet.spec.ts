import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewBouquet } from './view-bouquet';

describe('ViewBouquet', () => {
  let component: ViewBouquet;
  let fixture: ComponentFixture<ViewBouquet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewBouquet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewBouquet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
