import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonTitle,
  IonToggle,
  IonToolbar,
  IonCheckbox,
  IonItem,
  IonLabel,
  IonList,
  IonText,
} from '@ionic/angular/standalone';

import { SettingsFacade } from '../../settings.facade';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionStore } from '../../../../core/auth/session.store';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonTitle,
    IonToggle,
    IonToolbar,
    IonCheckbox,
    IonItem,
    IonLabel,
    IonList,
    IonText,
  ],
})
export class SettingsPage {
  readonly facade = inject(SettingsFacade);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);

  readonly pin = signal('');
  readonly confirmPin = signal('');
  readonly pinMessage = signal<string | null>(null);

  readonly availableFeatures = [
    { id: 'dashboard', label: 'Dashboard', description: 'Daily command center' },
    { id: 'clients', label: 'Clients', description: 'Accounts and billing context' },
    { id: 'projects', label: 'Projects', description: 'Delivery pipeline' },
    { id: 'tasks', label: 'Tasks', description: 'Execution board' },
    { id: 'notes', label: 'Notes', description: 'Captured context' },
    { id: 'reminders', label: 'Reminders', description: 'Follow-ups and deadlines' },
    { id: 'time', label: 'Time', description: 'Tracked work' },
    { id: 'invoices', label: 'Invoices', description: 'Billing control' },
    { id: 'counters', label: 'Counters', description: 'Ultra-fast counting' },
  ];

  readonly selectedFeatures = computed(() => this.sessionStore.session().profile?.enabled_features ?? []);
  readonly featureUpdateError = signal<string | null>(null);
  readonly isUpdatingFeatures = signal(false);

  async toggleFeature(id: string, checked: boolean) {
    const current = this.selectedFeatures();
    let next: string[];
    
    if (checked) {
      if (current.includes(id)) return;
      next = [...current, id];
    } else {
      if (!current.includes(id)) return;
      next = current.filter(f => f !== id);
    }

    if (next.length === 0) {
      this.featureUpdateError.set('At least one module must be enabled.');
      return;
    }

    this.featureUpdateError.set(null);
    this.isUpdatingFeatures.set(true);
    const result = await this.authService.updateProfile({ enabled_features: next });
    this.isUpdatingFeatures.set(false);

    if (result.error) {
      this.featureUpdateError.set(result.error);
    }
  }

  savePin(): void {
    const saved = this.facade.savePin(this.pin(), this.confirmPin());
    this.pinMessage.set(saved ? 'PIN saved.' : 'PINs must match and be 4 to 8 digits.');
    if (saved) {
      this.pin.set('');
      this.confirmPin.set('');
    }
  }

  async requestNotificationAccess(): Promise<void> {
    await this.facade.requestNotificationPermission();
  }

  async enableExactAlarms(): Promise<void> {
    await this.facade.requestExactAlarmPermission();
  }

  async signOut(): Promise<void> {
    await this.facade.signOut();
    await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }
}
