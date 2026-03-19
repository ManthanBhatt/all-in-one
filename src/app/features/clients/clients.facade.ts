import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../core/auth/session.store';
import { Client } from '../../core/models/domain.models';
import { ClientsRepository } from '../../core/db/repositories/clients.repository';

@Injectable({
  providedIn: 'root',
})
export class ClientsFacade {
  private readonly sessionStore = inject(SessionStore);
  private readonly repository = inject(ClientsRepository);
  private readonly clientsState = signal<Client[]>([]);
  readonly searchQuery = signal('');

  readonly clients = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.clientsState();
    if (!query) return list;
    return list.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.company_name?.toLowerCase().includes(query)
    );
  });

  readonly activeCount = computed(() => 
    this.clientsState().filter((c) => c.status === 'active').length
  );

  async load(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      this.clientsState.set([]);
      return;
    }

    this.clientsState.set(await this.repository.list(userId));
  }

  async create(input: { name: string; company_name?: string | null; email?: string | null }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.name.trim()) {
      return;
    }

    await this.repository.create(userId, {
      name: input.name.trim(),
      company_name: input.company_name?.trim() || null,
      email: input.email?.trim() || null,
    });
    await this.load();
  }

  async update(clientId: string, input: { name: string; company_name?: string | null; email?: string | null }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.name.trim()) {
      return;
    }

    await this.repository.update(userId, clientId, {
      name: input.name.trim(),
      company_name: input.company_name?.trim() || null,
      email: input.email?.trim() || null,
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
