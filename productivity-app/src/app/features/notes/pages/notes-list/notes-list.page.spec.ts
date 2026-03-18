import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotesListPage } from './notes-list.page';

describe('NotesListPage', () => {
  let component: NotesListPage;
  let fixture: ComponentFixture<NotesListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NotesListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
