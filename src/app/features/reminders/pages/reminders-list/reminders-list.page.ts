import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { Reminder } from '../../../../core/models/domain.models';
import { RemindersFacade } from '../../reminders.facade';

@Component({
  selector: 'app-reminders-list',
  templateUrl: './reminders-list.page.html',
  styleUrls: ['./reminders-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar],
})
export class RemindersListPage implements OnInit {
  readonly facade = inject(RemindersFacade);
  readonly title = signal('');
  readonly remindAt = signal('');
  readonly editingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
  }

  openCreate(): void {
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openEdit(reminder: Reminder): void {
    this.editingId.set(reminder.id);
    this.title.set(reminder.title);
    this.remindAt.set(this.toLocalDateTime(reminder.remind_at));
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  async save(): Promise<void> {
    const editingId = this.editingId();
    const payload = { title: this.title(), remind_at: this.remindAt() };

    if (editingId) {
      await this.facade.update(editingId, payload);
    } else {
      await this.facade.create(payload);
    }

    this.closeModal();
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.title.set('');
    this.remindAt.set('');
  }

  private toLocalDateTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }
}
