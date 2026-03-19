import { Injectable, computed, inject, signal } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

import { SessionStore } from '../../core/auth/session.store';
import { Invoice } from '../../core/models/domain.models';
import { InvoicesRepository } from '../../core/db/repositories/invoices.repository';
import { computeInvoiceTotals } from '../../core/utils/invoice.util';

@Injectable({
  providedIn: 'root',
})
export class InvoicesFacade {
  private readonly sessionStore = inject(SessionStore);
  private readonly repository = inject(InvoicesRepository);
  private readonly invoicesState = signal<Invoice[]>([]);
  readonly searchQuery = signal('');

  readonly invoices = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.invoicesState();
    if (!query) return list;
    return list.filter(i => i.invoice_number.toLowerCase().includes(query));
  });
  readonly unpaidInvoices = computed(() => this.invoicesState().filter((invoice) => invoice.status !== 'paid'));

  async load(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      this.invoicesState.set([]);
      return;
    }

    this.invoicesState.set(await this.repository.list(userId));
  }

  async create(input: { invoice_number?: string | null; due_date: string; description: string; amount: number }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.due_date || !input.description.trim() || input.amount <= 0) {
      return;
    }

    const invoiceNumber = input.invoice_number?.trim() || `INV-${String(this.invoicesState().length + 1).padStart(3, '0')}`;
    await this.repository.create(userId, {
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: input.due_date,
      items: [{ id: uuidv4(), invoice_id: '', description: input.description.trim(), quantity: 1, unit_price: input.amount, line_total: input.amount, sort_order: 1 }],
    });
    await this.load();
  }

  async update(invoiceId: string, current: Invoice, input: { invoice_number?: string | null; due_date: string; description: string; amount: number }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.due_date || !input.description.trim() || input.amount <= 0) {
      return;
    }

    const item = current.items[0] ?? { id: uuidv4(), invoice_id: current.id, description: '', quantity: 1, unit_price: 0, line_total: 0, sort_order: 1 };
    const totals = computeInvoiceTotals({ tax_amount: current.tax_amount, discount_amount: current.discount_amount, items: [{ ...item, invoice_id: current.id, description: input.description.trim(), quantity: 1, unit_price: input.amount, line_total: input.amount, sort_order: 1 }] });

    await this.repository.update(userId, invoiceId, {
      invoice_number: input.invoice_number?.trim() || current.invoice_number,
      due_date: input.due_date,
      items: totals.items,
      subtotal: totals.subtotal,
      total_amount: totals.total_amount,
    });
    await this.load();
  }

  async markPaid(invoice: Invoice): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      return;
    }

    await this.repository.update(userId, invoice.id, {
      status: invoice.status === 'paid' ? 'draft' : 'paid',
      paid_at: invoice.status === 'paid' ? null : new Date().toISOString(),
    });
    await this.load();
  }

  async remove(id: string): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      return;
    }

    await this.repository.softDelete(userId, id);
    await this.load();
  }
}
