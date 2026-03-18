import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientEditPage } from './client-edit.page';

describe('ClientEditPage', () => {
  let component: ClientEditPage;
  let fixture: ComponentFixture<ClientEditPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClientEditPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
