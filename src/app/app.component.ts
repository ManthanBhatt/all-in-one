import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonApp, IonButton, IonInput, IonRouterOutlet, IonText } from '@ionic/angular/standalone';

import { AuthService } from './core/auth/auth.service';
import { AppLockService } from './core/security/app-lock.service';
import { AppTitleService } from './core/services/app-title.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [CommonModule, FormsModule, IonApp, IonButton, IonInput, IonRouterOutlet, IonText],
})
export class AppComponent {
  private readonly authService = inject(AuthService);
  private readonly appTitleService = inject(AppTitleService);
  readonly appLock = inject(AppLockService);
  readonly pin = signal('');

  constructor() {
    void this.authService.restoreSession();
    void this.appTitleService;
    void this.appLock;
  }

  async unlock(): Promise<void> {
    const success = await this.appLock.unlockWithPin(this.pin());
    if (success) {
      this.pin.set('');
    }
  }

  async useDeviceSecurity(): Promise<void> {
    const success = await this.appLock.tryNativeUnlock();
    if (success) {
      this.pin.set('');
    }
  }
}
