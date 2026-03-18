import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { TimeEntry } from '../../../../core/models/domain.models';
import { TimeFacade } from '../../time.facade';

@Component({
  selector: 'app-time-list',
  templateUrl: './time-list.page.html',
  styleUrls: ['./time-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar],
})
export class TimeListPage implements OnInit {
  readonly facade = inject(TimeFacade);
  readonly description = signal('');
  readonly startedAt = signal(this.defaultStartedAt());
  readonly endedAt = signal(this.defaultEndedAt());
  readonly editingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
  }

  openCreate(): void {
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openEdit(entry: TimeEntry): void {
    this.editingId.set(entry.id);
    this.description.set(entry.description ?? '');
    this.startedAt.set(this.toLocalDateTime(entry.started_at));
    this.endedAt.set(this.toLocalDateTime(entry.ended_at));
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  async save(): Promise<void> {
    const payload = {
      description: this.description(),
      started_at: this.startedAt(),
      ended_at: this.endedAt(),
    };

    const editingId = this.editingId();
    if (editingId) {
      await this.facade.update(editingId, payload);
    } else {
      await this.facade.create(payload);
    }

    this.closeModal();
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.description.set('');
    this.startedAt.set(this.defaultStartedAt());
    this.endedAt.set(this.defaultEndedAt());
  }

  private defaultStartedAt(): string {
    return new Date(Date.now() - 60 * 60000).toISOString().slice(0, 16);
  }

  private defaultEndedAt(): string {
    return new Date().toISOString().slice(0, 16);
  }

  private toLocalDateTime(value: string | null | undefined): string {
    if (!value) {
      return this.defaultEndedAt();
    }

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }
}
