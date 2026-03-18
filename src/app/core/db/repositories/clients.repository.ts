import { Injectable } from '@angular/core';

import { Client, EntityBase } from '../../models/domain.models';
import { BaseRepository } from './base.repository';

export interface CreateClientInput {
  name: string;
  company_name?: string | null;
  email?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ClientsRepository extends BaseRepository<Client, CreateClientInput> {
  protected override readonly table = 'clients' as const;

  protected override buildCreate(base: EntityBase, input: CreateClientInput): Client {
    return {
      ...base,
      name: input.name,
      company_name: input.company_name ?? null,
      email: input.email ?? null,
      phone: null,
      website: null,
      billing_currency: 'INR',
      hourly_rate: null,
      status: 'active',
      notes: null,
    };
  }
}
