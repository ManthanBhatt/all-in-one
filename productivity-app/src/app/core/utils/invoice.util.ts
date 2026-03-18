import { Invoice, InvoiceItem } from '../models/domain.models';

export function computeInvoiceItem(item: InvoiceItem): InvoiceItem {
  return {
    ...item,
    line_total: Number((item.quantity * item.unit_price).toFixed(2)),
  };
}

export function computeInvoiceTotals(
  invoice: Pick<Invoice, 'tax_amount' | 'discount_amount'> & { items: InvoiceItem[] },
) {
  const items = invoice.items.map(computeInvoiceItem);
  const subtotal = Number(items.reduce((sum, item) => sum + item.line_total, 0).toFixed(2));
  const totalAmount = Number((subtotal + invoice.tax_amount - invoice.discount_amount).toFixed(2));

  return {
    items,
    subtotal,
    total_amount: totalAmount,
  };
}
