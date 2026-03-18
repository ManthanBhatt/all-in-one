import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/auth/session.store';
import { LocalNotificationService } from '../../core/notifications/local-notification.service';
import { AppLockService } from '../../core/security/app-lock.service';
import { ConnectivityService } from '../../core/sync/connectivity.service';
import { SyncService } from '../../core/sync/sync.service';

@Injectable({
  providedIn: 'root',
})
export class SettingsFacade {
  private readonly authService = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);
  private readonly connectivityService = inject(ConnectivityService);
  private readonly syncService = inject(SyncService);
  private readonly appLockService = inject(AppLockService);
  private readonly notificationService = inject(LocalNotificationService);
  private readonly syncResultState = signal<string>('No sync attempt yet.');
  private readonly notificationState = signal<string>('Checking notification access...');

  readonly profile = computed(() => this.sessionStore.session().profile);
  readonly isOnline = this.connectivityService.isOnline;
  readonly syncResult = computed(() => this.syncResultState());
  readonly appLockEnabled = this.appLockService.isEnabled;
  readonly hasWebPin = this.appLockService.hasWebPin;
  readonly useDeviceSecurity = this.appLockService.useDeviceSecurity;
  readonly securityError = this.appLockService.errorMessage;
  readonly isNative = this.appLockService.isNative;
  readonly notificationPermission = computed(() => this.notificationState());

  constructor() {
    void this.refreshNotificationPermission();
  }

  async syncNow(): Promise<void> {
    const result = await this.syncService.syncNow();
    this.syncResultState.set(
      result.skipped ? 'Sync skipped because the device is offline or there is no active user.' : `Synced ${result.synced} record changes.`,
    );
  }

  async resetLocalData(): Promise<void> {
    await this.syncService.resetLocalData();
    this.syncResultState.set('Local data and pending sync queue cleared. Reload the page and create fresh records.');
  }

  setAppLockEnabled(enabled: boolean): void {
    this.appLockService.setEnabled(enabled);
  }

  savePin(pin: string, confirmPin: string): boolean {
    if (pin !== confirmPin) {
      return false;
    }

    return this.appLockService.saveWebPin(pin);
  }

  clearPin(): void {
    this.appLockService.clearWebPin();
  }

  setUseDeviceSecurity(enabled: boolean): void {
    this.appLockService.setUseDeviceSecurity(enabled);
  }

  async testDeviceUnlock(): Promise<void> {
    await this.appLockService.tryNativeUnlock();
  }

  async refreshNotificationPermission(): Promise<void> {
    const state = await this.notificationService.getPermissionState();
    this.notificationState.set(this.labelForPermission(state));
  }

  async requestNotificationPermission(): Promise<void> {
    const state = await this.notificationService.requestPermission();
    this.notificationState.set(this.labelForPermission(state));
  }

  async requestExactAlarmPermission(): Promise<void> {
    const state = await this.notificationService.requestExactAlarmPermission();
    this.notificationState.set(
      state === 'granted'
        ? 'Notifications and exact alarms are allowed.'
        : 'Notifications are allowed, but exact alarms are still restricted.',
    );
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }

  private labelForPermission(state: string): string {
    switch (state) {
      case 'granted':
        return 'Notifications are allowed.';
      case 'denied':
        return 'Notifications are blocked.';
      case 'prompt-with-rationale':
        return 'Notifications need approval with rationale.';
      default:
        return 'Notifications are waiting for approval.';
    }
  }
}
