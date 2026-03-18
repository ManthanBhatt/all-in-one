import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
} from '@ionic/angular/standalone';

import { SettingsFacade } from '../../settings.facade';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToggle, IonToolbar],
})
export class SettingsPage {
  readonly facade = inject(SettingsFacade);
  private readonly router = inject(Router);

  readonly pin = signal('');
  readonly confirmPin = signal('');
  readonly pinMessage = signal<string | null>(null);

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
