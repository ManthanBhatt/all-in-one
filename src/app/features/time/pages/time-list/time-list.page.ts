import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { addOutline, createOutline, trashOutline } from 'ionicons/icons';

import { TimeEntry } from '../../../../core/models/domain.models';
import { TimeFacade } from '../../time.facade';

@Component({
  selector: 'app-time-list',
  templateUrl: './time-list.page.html',
  styleUrls: ['./time-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar],
})
export class TimeListPage implements OnInit {
  readonly facade = inject(TimeFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly addIcon = addOutline;
  readonly editIcon = createOutline;
  readonly deleteIcon = trashOutline;
  readonly description = signal('');
  readonly startedAt = signal(this.defaultStartedAt());
  readonly endedAt = signal(this.defaultEndedAt());
  readonly editingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    this.route.queryParamMap.subscribe((params) => {
      void this.handleRouteIntent(params.get('focus'), params.get('edit') === '1');
    });
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

  private async handleRouteIntent(focusId: string | null, shouldEdit: boolean): Promise<void> {
    if (!focusId) {
      return;
    }

    const entry = this.facade.entries().find((item) => item.id === focusId);
    if (entry && shouldEdit) {
      this.openEdit(entry);
    }

    await this.clearRouteIntent();
  }

  private async clearRouteIntent(): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { focus: null, edit: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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

