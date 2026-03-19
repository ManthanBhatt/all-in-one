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
import { SessionStore } from '../../../../core/auth/session.store';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonButton, IonContent, IonInput, IonText],
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');
  readonly errorMessage = signal<string | null>(null);
  readonly isBusy = signal(false);
  readonly isDevFallback = !environment.production && !environment.supabaseUrl;
  protected isSmallScreen = false;
  constructor() {
    (<any>window).addEventListener('resize', () => this.checkSmallScreen());
    this.checkSmallScreen()
  }

  async signIn(): Promise<void> {
    this.errorMessage.set(null);
    this.isBusy.set(true);

    const result = await this.authService.signIn(this.email().trim(), this.password());

    this.isBusy.set(false);

    if (result.error) {
      this.errorMessage.set(result.error);
      return;
    }

    await this.router.navigateByUrl(this.sessionStore.getLandingRoute(), { replaceUrl: true });
  }

  protected checkSmallScreen() {
    this.isSmallScreen = window.innerWidth < 992;
  }
}
