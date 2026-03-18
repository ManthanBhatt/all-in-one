import { Injectable } from '@angular/core';

import { Invoice } from '../models/domain.models';

@Injectable({
  providedIn: 'root',
})
export class ConflictService {
  shouldFlagInvoiceConflict(localInvoice: Invoice, remoteInvoice: Invoice): boolean {
    return localInvoice.updated_at !== remoteInvoice.updated_at && remoteInvoice.status !== 'paid';
  }
}
