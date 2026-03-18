import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeListPage } from './time-list.page';

describe('TimeListPage', () => {
  let component: TimeListPage;
  let fixture: ComponentFixture<TimeListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
