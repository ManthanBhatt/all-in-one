import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

let client: SupabaseClient | null = null;

async function noopLock<T>(_name: string, _acquireTimeout: number, fn: () => Promise<T>): Promise<T> {
  return await fn();
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) {
    return client;
  }

  if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
    return null;
  }

  client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'productivity-app-auth',
      lock: noopLock,
    },
  });
  return client;
}
