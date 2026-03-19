import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonText,
  IonCheckbox,
  IonLabel,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';

import { AuthService } from '../../../../core/auth/auth.service';
import { SessionStore } from '../../../../core/auth/session.store';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonButton, IonContent, IonInput, IonText, IonCheckbox, IonLabel, IonItem, IonList],
})
export class RegisterPage {
  private readonly authService = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  readonly fullName = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isBusy = signal(false);

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

  readonly selectedFeatures = signal<string[]>(this.availableFeatures.map(f => f.id));

  protected isSmallScreen = false;
  constructor() {
    (<any>window).addEventListener('resize', () => this.checkSmallScreen());
    this.checkSmallScreen()
  }

  toggleFeature(id: string, checked: boolean) {
    const current = this.selectedFeatures();
    if (checked) {
      this.selectedFeatures.set([...current, id]);
    } else {
      this.selectedFeatures.set(current.filter(f => f !== id));
    }
  }

  async register(): Promise<void> {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.fullName().trim()) {
      this.errorMessage.set('Full name is required.');
      return;
    }

    if (this.password().length < 6) {
      this.errorMessage.set('Password must be at least 6 characters.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    if (this.selectedFeatures().length === 0) {
      this.errorMessage.set('Please select at least one module.');
      return;
    }

    this.isBusy.set(true);
    const result = await this.authService.signUp(
      this.fullName().trim(),
      this.email().trim(),
      this.password(),
      this.selectedFeatures()
    );
    this.isBusy.set(false);

    if (result.error) {
      this.errorMessage.set(result.error);
      return;
    }

    this.successMessage.set(result.message ?? 'Account created successfully.');

    if (!result.message?.toLowerCase().includes('check your email')) {
      await this.router.navigateByUrl(this.sessionStore.getLandingRoute(), { replaceUrl: true });
    }
  }

  protected checkSmallScreen() {
    this.isSmallScreen = window.innerWidth < 992;
  }
}
