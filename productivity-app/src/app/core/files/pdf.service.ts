import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  async exportInvoiceHtml(html: string): Promise<Blob> {
    return new Blob([html], { type: 'text/html' });
  }
}
