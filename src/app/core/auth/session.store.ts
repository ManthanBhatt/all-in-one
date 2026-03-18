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
