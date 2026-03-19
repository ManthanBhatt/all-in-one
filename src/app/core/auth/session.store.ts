import { Injectable, computed, signal } from '@angular/core';

import { SessionState } from '../models/domain.models';

@Injectable({
  providedIn: 'root',
})
export class SessionStore {
  private readonly state = signal<SessionState>({
    status: 'loading',
    profile: null,
    accessToken: null,
  });

  readonly session = computed(() => this.state());
  readonly status = computed(() => this.state().status);
  readonly isAuthenticated = computed(() => this.state().status === 'authenticated');
  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly userId = computed(() => this.state().profile?.id ?? null);

  readonly getLandingRoute = computed(() => {
    const profile = this.state().profile;
    if (!profile) return '/auth/login';

    const enabled = profile.enabled_features ?? [];
    if (enabled.includes('dashboard')) {
      return '/app/dashboard';
    }

    if (enabled.length > 0) {
      return `/app/${enabled[0]}`;
    }

    return '/app/settings';
  });

  setLoading(): void {
    this.state.set({
      status: 'loading',
      profile: null,
      accessToken: null,
    });
  }

  setAuthenticated(session: Omit<SessionState, 'status'>): void {
    this.state.set({
      status: 'authenticated',
      ...session,
    });
  }

  setUnauthenticated(): void {
    this.state.set({
      status: 'unauthenticated',
      profile: null,
      accessToken: null,
    });
  }
}
