import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectsListPage } from './projects-list.page';

describe('ProjectsListPage', () => {
  let component: ProjectsListPage;
  let fixture: ComponentFixture<ProjectsListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectsListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
