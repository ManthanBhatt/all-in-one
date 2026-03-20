import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { chevronForwardOutline, createOutline, sparklesOutline, trashOutline } from 'ionicons/icons';

import { CountersFacade } from '../../counters.facade';
import { Counter } from '../../../../core/models/domain.models';

@Component({
  selector: 'app-counters-list',
  templateUrl: './counters-list.page.html',
  styleUrls: ['./counters-list.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonModal,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  ],
})
export class CountersListPage implements OnInit {
  readonly facade = inject(CountersFacade);
  private readonly router = inject(Router);

  readonly chevronIcon = chevronForwardOutline;
  readonly deleteIcon = trashOutline;
  readonly editIcon = createOutline;
  readonly createAccentIcon = sparklesOutline;

  readonly name = signal('');
  readonly initialValue = signal(0);
  readonly currentValue = signal(0);
  readonly targetValue = signal<number | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.loadCounters();
  }

  openCreate(): void {
    this.name.set('');
    this.initialValue.set(0);
    this.currentValue.set(0);
    this.targetValue.set(null);
    this.editingId.set(null);
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  openEdit(counter: Counter, event: Event): void {
    event.stopPropagation();
    this.name.set(counter.name);
    this.currentValue.set(counter.current_value);
    this.targetValue.set(counter.target_value);
    this.editingId.set(counter.id);
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async saveCounter(): Promise<void> {
    if (!this.name().trim()) {
      this.errorMessage.set('Please enter a name for the counter.');
      return;
    }

    try {
      const editingId = this.editingId();
      if (editingId) {
        await this.facade.updateCounter(editingId, this.name().trim(), this.currentValue(), this.targetValue());
        this.isModalOpen.set(false);
      } else {
        const counter = await this.facade.createCounter(this.name().trim(), this.initialValue(), this.targetValue());
        this.isModalOpen.set(false);
        setTimeout(() => {
          void this.router.navigate(['/app/counters', counter.id]);
        }, 100);
      }
    } catch {
      this.errorMessage.set('Failed to save counter.');
    }
  }

  async deleteCounter(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    await this.facade.deleteCounter(id);
  }

  goToCounter(id: string): void {
    void this.router.navigate(['/app/counters', id]);
  }

  completionRatio(counter: Counter): number | null {
    if (!counter.target_value || counter.target_value <= 0) {
      return null;
    }

    return Math.min(100, Math.round((counter.current_value / counter.target_value) * 100));
  }
}
