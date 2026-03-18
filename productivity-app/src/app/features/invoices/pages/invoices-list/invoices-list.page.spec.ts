import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvoicesListPage } from './invoices-list.page';

describe('InvoicesListPage', () => {
  let component: InvoicesListPage;
  let fixture: ComponentFixture<InvoicesListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoicesListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
