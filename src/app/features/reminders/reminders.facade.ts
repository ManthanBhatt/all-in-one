import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../core/auth/session.store';
import { Reminder } from '../../core/models/domain.models';
import { RemindersRepository } from '../../core/db/repositories/reminders.repository';
import { LocalNotificationService } from '../../core/notifications/local-notification.service';

@Injectable({
  providedIn: 'root',
})
export class RemindersFacade {
  private readonly sessionStore = inject(SessionStore);
  private readonly repository = inject(RemindersRepository);
  private readonly notificationService = inject(LocalNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly remindersState = signal<Reminder[]>([]);
  readonly searchQuery = signal('');
  private readonly now = signal(Date.now());

  readonly reminders = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.remindersState();
    if (!query) return list;
    return list.filter(r => r.title.toLowerCase().includes(query));
  });
  readonly scheduledReminders = computed(() => 
    this.remindersState()
      .filter(r => r.status !== 'completed')
      .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
  );
  readonly completedReminders = computed(() => 
    this.remindersState()
      .filter(r => r.status === 'completed')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  );
  readonly upcoming = computed(() =>
    this.scheduledReminders().slice(0, 5)
  );

  constructor() {
    const timer = window.setInterval(() => this.now.set(Date.now()), 60000);
    this.destroyRef.onDestroy(() => window.clearInterval(timer));
  }

  async load(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      this.remindersState.set([]);
      return;
    }

    this.remindersState.set(await this.repository.list(userId));
  }

  async create(input: { title: string; remind_at: string }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.title.trim() || !input.remind_at) {
      return;
    }

    const reminder = await this.repository.create(userId, {
      title: input.title.trim(),
      remind_at: new Date(input.remind_at).toISOString(),
    });
    await this.notificationService.scheduleReminder(reminder);
    await this.load();
  }

  async update(reminderId: string, input: { title: string; remind_at: string }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.title.trim() || !input.remind_at) {
      return;
    }

    await this.repository.update(userId, reminderId, {
      title: input.title.trim(),
      remind_at: new Date(input.remind_at).toISOString(),
      status: 'scheduled',
    });

    const updated = await this.repository.get(userId, reminderId);
    if (updated) {
      await this.notificationService.scheduleReminder(updated);
    }
    await this.load();
  }

  reminderStateLabel(reminder: Reminder): string {
    this.now();
    if (reminder.status === 'completed') {
      return 'completed';
    }

    const remindAt = new Date(reminder.remind_at).getTime();
    if (Number.isNaN(remindAt)) {
      return reminder.status;
    }

    if (remindAt <= this.now()) {
      return 'due';
    }

    return 'scheduled';
  }

  reminderStateTone(reminder: Reminder): 'success' | 'warning' | 'danger' | 'neutral' {
    const label = this.reminderStateLabel(reminder);
    if (label === 'completed') {
      return 'success';
    }
    if (label === 'due') {
      return 'danger';
    }
    if (label === 'scheduled') {
      return 'warning';
    }
    return 'neutral';
  }

  async complete(reminder: Reminder): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      return;
    }

    await this.repository.update(userId, reminder.id, { status: 'completed' });
    await this.notificationService.cancelReminder(reminder.id);
    await this.load();
  }

  async remove(id: string): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      return;
    }

    await this.repository.softDelete(userId, id);
    await this.notificationService.cancelReminder(id);
    await this.load();
  }
}

