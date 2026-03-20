import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { SessionStore } from './session.store';
import { getSupabaseClient } from './supabase.client';

interface AuthActionResult {
  error: string | null;
  message?: string;
}

const ALL_FEATURES = ['dashboard', 'clients', 'projects', 'tasks', 'notes', 'reminders', 'time', 'invoices', 'counters', 'ai-assistant', 'ai-models'];

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly sessionStore = inject(SessionStore);
  private restorePromise: Promise<void> | null = null;

  async restoreSession(): Promise<void> {
    if (this.restorePromise) {
      return this.restorePromise;
    }

    this.sessionStore.setLoading();

    this.restorePromise = this.doRestoreSession().finally(() => {
      this.restorePromise = null;
    });

    return this.restorePromise;
  }

  async signIn(email: string, password: string): Promise<AuthActionResult> {
    const client = getSupabaseClient();
    if (!client && !environment.production) {
      this.sessionStore.setAuthenticated({
        profile: {
          id: 'local-dev-user',
          email,
          full_name: 'Local Dev User',
          enabled_features: ALL_FEATURES,
        },
        accessToken: 'local-dev-token',
      });

      return { error: null };
    }

    if (!client) {
      return { error: 'Supabase credentials are missing in the environment config.' };
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return { error: error?.message ?? 'Unable to sign in.' };
    }

    this.sessionStore.setAuthenticated({
      profile: {
        id: data.user.id,
        email: data.user.email ?? email,
        full_name: data.user.user_metadata['full_name'] ?? '',
        enabled_features: data.user.user_metadata['enabled_features'] ?? ALL_FEATURES,
      },
      accessToken: data.session?.access_token ?? null,
    });

    return { error: null };
  }

  async signUp(fullName: string, email: string, password: string, enabledFeatures: string[] = ALL_FEATURES): Promise<AuthActionResult> {
    const client = getSupabaseClient();
    if (!client && !environment.production) {
      this.sessionStore.setAuthenticated({
        profile: {
          id: 'local-dev-user',
          email,
          full_name: fullName,
          enabled_features: enabledFeatures,
        },
        accessToken: 'local-dev-token',
      });

      return { error: null, message: 'Development account created locally.' };
    }

    if (!client) {
      return { error: 'Supabase credentials are missing in the environment config.' };
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          enabled_features: enabledFeatures,
        },
      },
    });

    if (error || !data.user) {
      return { error: error?.message ?? 'Unable to create the account.' };
    }

    if (data.session) {
      this.sessionStore.setAuthenticated({
        profile: {
          id: data.user.id,
          email: data.user.email ?? email,
          full_name: fullName,
          enabled_features: enabledFeatures,
        },
        accessToken: data.session.access_token,
      });

      return { error: null, message: 'Account created successfully.' };
    }

    this.sessionStore.setUnauthenticated();
    return {
      error: null,
      message: 'Account created. Check your email to confirm the address before signing in.',
    };
  }

  async updateProfile(updates: { full_name?: string; enabled_features?: string[] }): Promise<AuthActionResult> {
    const client = getSupabaseClient();
    const currentSession = this.sessionStore.session();

    if (!currentSession.profile) {
      return { error: 'No active session.' };
    }

    if (!client && !environment.production) {
      this.sessionStore.setAuthenticated({
        profile: {
          ...currentSession.profile,
          ...updates,
        } as any,
        accessToken: currentSession.accessToken,
      });
      return { error: null };
    }

    if (!client) {
      return { error: 'Supabase client not available.' };
    }

    const { data, error } = await client.auth.updateUser({
      data: updates,
    });

    if (error || !data.user) {
      return { error: error?.message ?? 'Unable to update profile.' };
    }

    this.sessionStore.setAuthenticated({
      profile: {
        id: data.user.id,
        email: data.user.email ?? currentSession.profile.email,
        full_name: data.user.user_metadata['full_name'] ?? currentSession.profile.full_name,
        enabled_features: data.user.user_metadata['enabled_features'] ?? currentSession.profile.enabled_features,
      },
      accessToken: currentSession.accessToken,
    });

    return { error: null };
  }

  async signOut(): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }

    this.sessionStore.setUnauthenticated();
  }

  private async doRestoreSession(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      this.sessionStore.setUnauthenticated();
      return;
    }

    const {
      data: { session },
    } = await client.auth.getSession();

    if (!session?.user) {
      this.sessionStore.setUnauthenticated();
      return;
    }

    this.sessionStore.setAuthenticated({
      profile: {
        id: session.user.id,
        email: session.user.email ?? '',
        full_name: session.user.user_metadata['full_name'] ?? '',
        enabled_features: session.user.user_metadata['enabled_features'] ?? ALL_FEATURES,
      },
      accessToken: session.access_token,
    });
  }
}
