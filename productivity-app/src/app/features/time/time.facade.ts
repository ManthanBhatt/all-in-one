import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../core/auth/session.store';
import { TimeEntry } from '../../core/models/domain.models';
import { TimeEntriesRepository } from '../../core/db/repositories/time-entries.repository';

@Injectable({
  providedIn: 'root',
})
export class TimeFacade {
  private readonly sessionStore = inject(SessionStore);
  private readonly repository = inject(TimeEntriesRepository);
  private readonly entriesState = signal<TimeEntry[]>([]);

  readonly entries = computed(() => this.entriesState());
  readonly totalMinutes = computed(() => this.entriesState().reduce((sum, entry) => sum + (entry.duration_minutes ?? 0), 0));

  async load(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      this.entriesState.set([]);
      return;
    }

    this.entriesState.set(await this.repository.list(userId));
  }

  async create(input: { description?: string | null; started_at: string; ended_at: string }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.started_at || !input.ended_at) {
      return;
    }

    await this.repository.create(userId, {
      description: input.description?.trim() || null,
      started_at: new Date(input.started_at).toISOString(),
      ended_at: new Date(input.ended_at).toISOString(),
    });
    await this.load();
  }

  async update(entryId: string, input: { description?: string | null; started_at: string; ended_at: string }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.started_at || !input.ended_at) {
      return;
    }

    const duration = Math.max(Math.round((new Date(input.ended_at).getTime() - new Date(input.started_at).getTime()) / 60000), 0);
    await this.repository.update(userId, entryId, {
      description: input.description?.trim() || null,
      started_at: new Date(input.started_at).toISOString(),
      ended_at: new Date(input.ended_at).toISOString(),
      duration_minutes: duration,
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
