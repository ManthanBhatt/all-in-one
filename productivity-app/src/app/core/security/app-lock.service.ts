import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

import { SessionStore } from '../auth/session.store';

interface AppLockSettings {
  enabled: boolean;
  webPin: string | null;
  useDeviceSecurity: boolean;
}

const STORAGE_KEY = 'freelancer-os.security';

@Injectable({
  providedIn: 'root',
})
export class AppLockService {
  private readonly sessionStore = inject(SessionStore);
  private readonly settingsState = signal<AppLockSettings>(this.readSettings());
  private readonly lockedState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly settings = computed(() => this.settingsState());
  readonly isEnabled = computed(() => this.settingsState().enabled);
  readonly hasWebPin = computed(() => Boolean(this.settingsState().webPin));
  readonly useDeviceSecurity = computed(() => this.settingsState().useDeviceSecurity);
  readonly isLocked = computed(() => this.lockedState());
  readonly errorMessage = computed(() => this.errorState());
  readonly isNative = Capacitor.isNativePlatform();

  constructor() {
    effect(() => {
      const authenticated = this.sessionStore.isAuthenticated();
      const enabled = this.settingsState().enabled;

      if (!authenticated || !enabled) {
        this.lockedState.set(false);
        this.errorState.set(null);
        return;
      }

      void this.enforceLock();
    });
  }

  async enforceLock(): Promise<void> {
    if (!this.sessionStore.isAuthenticated() || !this.settingsState().enabled) {
      this.lockedState.set(false);
      return;
    }

    if (this.isNative && this.settingsState().useDeviceSecurity) {
      const unlocked = await this.tryNativeUnlock();
      if (unlocked) {
        this.lockedState.set(false);
        this.errorState.set(null);
        return;
      }
    }

    if (this.settingsState().webPin) {
      this.lockedState.set(true);
      this.errorState.set(null);
      return;
    }

    this.lockedState.set(false);
  }

  async unlockWithPin(pin: string): Promise<boolean> {
    const storedPin = this.settingsState().webPin;
    if (!storedPin || pin !== storedPin) {
      this.errorState.set('Incorrect PIN.');
      return false;
    }

    this.lockedState.set(false);
    this.errorState.set(null);
    return true;
  }

  async tryNativeUnlock(): Promise<boolean> {
    if (!this.isNative) {
      return false;
    }

    try {
      const availability = await BiometricAuth.checkBiometry();
      if (!availability.deviceIsSecure) {
        this.errorState.set('Set up a device PIN, pattern, password, fingerprint, or face unlock first.');
        return false;
      }

      await BiometricAuth.authenticate({
        reason: 'Unlock Freelancer OS',
        allowDeviceCredential: true,
        androidTitle: 'Unlock Freelancer OS',
        androidSubtitle: 'Use your device security',
        cancelTitle: 'Cancel',
      });

      this.lockedState.set(false);
      this.errorState.set(null);
      return true;
    } catch {
      this.errorState.set('Device unlock failed.');
      return false;
    }
  }

  setEnabled(enabled: boolean): void {
    this.updateSettings({ enabled });
    if (!enabled) {
      this.lockedState.set(false);
      this.errorState.set(null);
    }
  }

  setUseDeviceSecurity(enabled: boolean): void {
    this.updateSettings({ useDeviceSecurity: enabled });
  }

  saveWebPin(pin: string): boolean {
    if (!/^\d{4,8}$/.test(pin)) {
      this.errorState.set('PIN must be 4 to 8 digits.');
      return false;
    }

    this.updateSettings({ webPin: pin, enabled: true });
    this.errorState.set(null);
    return true;
  }

  clearWebPin(): void {
    this.updateSettings({ webPin: null });
    this.errorState.set(null);
  }

  private updateSettings(patch: Partial<AppLockSettings>): void {
    const next = { ...this.settingsState(), ...patch };
    this.settingsState.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }

  private readSettings(): AppLockSettings {
    if (typeof localStorage === 'undefined') {
      return { enabled: false, webPin: null, useDeviceSecurity: false };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { enabled: false, webPin: null, useDeviceSecurity: false };
      }

      const parsed = JSON.parse(raw) as Partial<AppLockSettings>;
      return {
        enabled: Boolean(parsed.enabled),
        webPin: parsed.webPin ?? null,
        useDeviceSecurity: Boolean(parsed.useDeviceSecurity),
      };
    } catch {
      return { enabled: false, webPin: null, useDeviceSecurity: false };
    }
  }
}
