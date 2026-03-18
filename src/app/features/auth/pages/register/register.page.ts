import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonText,
} from '@ionic/angular/standalone';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonButton, IonContent, IonInput, IonText],
})
export class RegisterPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly fullName = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isBusy = signal(false);
  protected isSmallScreen = false;
  constructor() {
    (<any>window).addEventListener('resize', () => this.checkSmallScreen());
    this.checkSmallScreen()
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

    this.isBusy.set(true);
    const result = await this.authService.signUp(this.fullName().trim(), this.email().trim(), this.password());
    this.isBusy.set(false);

    if (result.error) {
      this.errorMessage.set(result.error);
      return;
    }

    this.successMessage.set(result.message ?? 'Account created successfully.');

    if (!result.message?.toLowerCase().includes('check your email')) {
      await this.router.navigateByUrl('/app/dashboard', { replaceUrl: true });
    }
  }

  protected checkSmallScreen() {
    this.isSmallScreen = window.innerWidth < 992;
  }
}
