import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

import { EntityBase, Invoice, InvoiceItem } from '../../models/domain.models';
import { computeInvoiceTotals } from '../../utils/invoice.util';
import { BaseRepository } from './base.repository';

export interface CreateInvoiceInput {
  client_id?: string | null;
  project_id?: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  items?: InvoiceItem[];
}

@Injectable({
  providedIn: 'root',
})
export class InvoicesRepository extends BaseRepository<Invoice, CreateInvoiceInput> {
  protected override readonly table = 'invoices' as const;

  protected override buildCreate(base: EntityBase, input: CreateInvoiceInput): Invoice {
    const normalizedItems: InvoiceItem[] = (input.items ?? []).map((item, index) => ({
      ...item,
      id: item.id || uuidv4(),
      invoice_id: base.id,
      sort_order: item.sort_order ?? index + 1,
    }));
    const totals = computeInvoiceTotals({
      items: normalizedItems,
      tax_amount: 0,
      discount_amount: 0,
    });

    return {
      ...base,
      client_id: input.client_id ?? null,
      project_id: input.project_id ?? null,
      invoice_number: input.invoice_number,
      issue_date: input.issue_date,
      due_date: input.due_date,
      status: 'draft',
      subtotal: totals.subtotal,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: totals.total_amount,
      notes: null,
      paid_at: null,
      items: totals.items,
    };
  }
}
