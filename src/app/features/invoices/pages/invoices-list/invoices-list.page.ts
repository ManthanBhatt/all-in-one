import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSearchbar } from '@ionic/angular/standalone';

import { addOutline, createOutline, trashOutline } from 'ionicons/icons';

import { Invoice } from '../../../../core/models/domain.models';
import { InvoicesFacade } from '../../invoices.facade';

@Component({
  selector: 'app-invoices-list',
  templateUrl: './invoices-list.page.html',
  styleUrls: ['./invoices-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSearchbar],
})
export class InvoicesListPage implements OnInit {
  readonly facade = inject(InvoicesFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly addIcon = addOutline;
  readonly editIcon = createOutline;
  readonly deleteIcon = trashOutline;
  readonly invoiceNumber = signal('');
  readonly description = signal('Development sprint');
  readonly amount = signal(25000);
  readonly dueDate = signal(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  readonly editingInvoice = signal<Invoice | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    this.route.queryParamMap.subscribe((params) => {
      void this.handleRouteIntent(params.get('focus'), params.get('edit') === '1');
    });
  }

  openCreate(): void {
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openEdit(invoice: Invoice): void {
    this.editingInvoice.set(invoice);
    this.invoiceNumber.set(invoice.invoice_number);
    this.description.set(invoice.items[0]?.description ?? 'Development sprint');
    this.amount.set(invoice.items[0]?.unit_price ?? invoice.total_amount ?? 0);
    this.dueDate.set(invoice.due_date);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  async save(): Promise<void> {
    const editingInvoice = this.editingInvoice();
    const payload = {
      invoice_number: this.invoiceNumber(),
      description: this.description(),
      amount: Number(this.amount()),
      due_date: this.dueDate(),
    };

    if (editingInvoice) {
      await this.facade.update(editingInvoice.id, editingInvoice, payload);
    } else {
      await this.facade.create(payload);
    }

    this.closeModal();
  }

  private async handleRouteIntent(focusId: string | null, shouldEdit: boolean): Promise<void> {
    if (!focusId) {
      return;
    }

    const invoice = this.facade.invoices().find((item) => item.id === focusId);
    if (invoice && shouldEdit) {
      this.openEdit(invoice);
    }

    await this.clearRouteIntent();
  }

  private async clearRouteIntent(): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { focus: null, edit: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private resetForm(): void {
    this.editingInvoice.set(null);
    this.invoiceNumber.set('');
    this.description.set('Development sprint');
    this.amount.set(25000);
    this.dueDate.set(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  }
}

