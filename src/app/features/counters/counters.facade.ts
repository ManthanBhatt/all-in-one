import { inject, Injectable, signal, computed, effect } from '@angular/core';

import { Counter } from '../../core/models/domain.models';
import { CountersRepository } from '../../core/db/repositories/counters.repository';
import { SessionStore } from '../../core/auth/session.store';
import { HapticsService } from '../../core/services/haptics.service';
import { AudioService } from '../../core/services/audio.service';
import { SyncService } from '../../core/sync/sync.service';
import { ImpactStyle } from '@capacitor/haptics';

@Injectable({
  providedIn: 'root',
})
export class CountersFacade {
  private readonly repository = inject(CountersRepository);
  private readonly sessionStore = inject(SessionStore);
  private readonly syncService = inject(SyncService);
  private readonly haptics = inject(HapticsService);
  private readonly audio = inject(AudioService);

  private readonly countersState = signal<Counter[]>([]);
  private readonly currentCounterId = signal<string | null>(null);
  private readonly isLoadingState = signal(false);

  readonly searchQuery = signal('');
  readonly counters = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.countersState();
    if (!query) return list;
    return list.filter(c => c.name.toLowerCase().includes(query));
  });
  readonly currentCounter = computed(() => 
    this.countersState().find(c => c.id === this.currentCounterId()) ?? null
  );
  readonly isLoading = computed(() => this.isLoadingState());

  // Settings for feedback (could be moved to a settings service later)
  readonly soundEnabled = signal(true);
  readonly hapticsEnabled = signal(true);

  constructor() {
    effect(() => {
      const change = this.syncService.dataChanged$();
      if (change === 'counters' || change === 'all') {
        void this.loadCounters();
      }
    });
  }

  async loadCounters(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) return;

    this.isLoadingState.set(true);
    try {
      const list = await this.repository.list(userId);
      this.countersState.set(list);
    } finally {
      this.isLoadingState.set(false);
    }
  }

  async selectCounter(id: string | null): Promise<void> {
    this.currentCounterId.set(id);
    if (id && this.countersState().length === 0) {
      await this.loadCounters();
    }
  }

  async createCounter(name: string, initialValue = 0, targetValue: number | null = null): Promise<Counter> {
    const userId = this.sessionStore.userId();
    if (!userId) throw new Error('No active user session');

    const counter = await this.repository.create(userId, { 
      name, 
      current_value: initialValue, 
      target_value: targetValue 
    });
    this.countersState.update(list => [...list, counter]);
    return counter;
  }

  async updateCounter(id: string, name: string, currentValue: number, targetValue: number | null): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) return;

    const updated = await this.repository.update(userId, id, { 
      name, 
      current_value: currentValue,
      target_value: targetValue 
    });

    if (updated) {
      this.countersState.update(list => 
        list.map(c => c.id === id ? updated : c)
      );
    }
  }

  async increment(): Promise<void> {
    const counter = this.currentCounter();
    const userId = this.sessionStore.userId();
    if (!counter || !userId) return;

    // Optimized for ultra-fast response: update local state immediately
    const nextValue = counter.current_value + 1;
    this.updateLocalState(counter.id, nextValue);
    
    // Trigger feedback
    this.triggerFeedback();

    // Persist to local DB ONLY, skip sync for speed and bandwidth
    await this.repository.updateLocal(userId, counter.id, { current_value: nextValue });
  }

  async decrement(): Promise<void> {
    const counter = this.currentCounter();
    const userId = this.sessionStore.userId();
    if (!counter || !userId) return;

    const nextValue = Math.max(0, counter.current_value - 1);
    this.updateLocalState(counter.id, nextValue);
    
    this.triggerFeedback(ImpactStyle.Medium);

    await this.repository.updateLocal(userId, counter.id, { current_value: nextValue });
  }

  async reset(): Promise<void> {
    const counter = this.currentCounter();
    const userId = this.sessionStore.userId();
    if (!counter || !userId) return;

    this.updateLocalState(counter.id, 0);
    this.triggerFeedback(ImpactStyle.Heavy);

    await this.repository.updateLocal(userId, counter.id, { current_value: 0 });
  }

  async persistToSync(): Promise<void> {
    const counter = this.currentCounter();
    const userId = this.sessionStore.userId();
    if (!counter || !userId) return;

    // Use regular update to enqueue and trigger sync
    await this.repository.update(userId, counter.id, { current_value: counter.current_value });
  }

  async deleteCounter(id: string): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) return;

    await this.repository.softDelete(userId, id);
    this.countersState.update(list => list.filter(c => c.id !== id));
    if (this.currentCounterId() === id) {
      this.currentCounterId.set(null);
    }
  }

  private updateLocalState(id: string, value: number): void {
    this.countersState.update(list => 
      list.map(c => c.id === id ? { ...c, current_value: value } : c)
    );
  }

  private triggerFeedback(style: ImpactStyle = ImpactStyle.Light): void {
    if (this.hapticsEnabled()) {
      void this.haptics.impact(style);
    }
    if (this.soundEnabled()) {
      void this.audio.playClick();
    }
  }
}
