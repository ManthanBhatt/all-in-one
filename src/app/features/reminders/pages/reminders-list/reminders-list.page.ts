import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSegment, IonSegmentButton, IonLabel, IonSearchbar } from '@ionic/angular/standalone';

import { addOutline, checkmarkDoneOutline, createOutline, trashOutline } from 'ionicons/icons';

import { Reminder } from '../../../../core/models/domain.models';
import { RemindersFacade } from '../../reminders.facade';

@Component({
  selector: 'app-reminders-list',
  templateUrl: './reminders-list.page.html',
  styleUrls: ['./reminders-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSegment, IonSegmentButton, IonLabel, IonSearchbar],
})
export class RemindersListPage implements OnInit {
  readonly facade = inject(RemindersFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly addIcon = addOutline;
  readonly completeIcon = checkmarkDoneOutline;
  readonly editIcon = createOutline;
  readonly deleteIcon = trashOutline;
  readonly currentTab = signal<'scheduled' | 'completed'>('scheduled');

  readonly title = signal('');
  readonly remindAt = signal('');
  readonly editingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'scheduled' || tab === 'completed') {
        this.currentTab.set(tab);
      }
      void this.handleRouteIntent(params.get('focus'), params.get('edit') === '1');
    });
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

  private async handleRouteIntent(focusId: string | null, shouldEdit: boolean): Promise<void> {
    if (!focusId) {
      return;
    }

    const reminder = [...this.facade.scheduledReminders(), ...this.facade.completedReminders()].find((item) => item.id === focusId);
    if (reminder && shouldEdit) {
      this.openEdit(reminder);
    }

    await this.clearRouteIntent();
  }

  private async clearRouteIntent(): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { focus: null, edit: null, tab: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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

