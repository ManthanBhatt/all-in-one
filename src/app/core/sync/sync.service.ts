import { effect, inject, Injectable, signal } from '@angular/core';

import { getSupabaseClient } from '../auth/supabase.client';
import { SessionStore } from '../auth/session.store';
import { AppDatabaseService } from '../db/app-database.service';
import { ConnectivityService } from './connectivity.service';
import { ConflictService } from './conflict.service';
import { EntityBase, EntityType, Invoice, SyncQueueItem } from '../models/domain.models';
import { SyncQueueService } from './sync-queue.service';

type SyncedTable = Exclude<EntityType, 'sync_queue'>;
type RemoteEntity = Record<string, unknown> & { id: string; user_id: string; updated_at?: string };
export type SyncIndicatorState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

const syncTables: SyncedTable[] = [
  'clients',
  'projects',
  'tasks',
  'notes',
  'reminders',
  'time_entries',
  'invoices',
  'counters',
];

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private readonly queueService = inject(SyncQueueService);
  private readonly sessionStore = inject(SessionStore);
  private readonly connectivityService = inject(ConnectivityService);
  private readonly db = inject(AppDatabaseService);
  private readonly conflictService = inject(ConflictService);

  private autoSyncTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private syncInFlight: Promise<{ synced: number; skipped: boolean }> | null = null;

  readonly indicatorState = signal<SyncIndicatorState>('idle');
  readonly indicatorLabel = signal('Local only');
  readonly dataChanged$ = signal<SyncedTable | 'all' | null>(null);

  constructor() {
    effect(() => {
      const isOnline = this.connectivityService.isOnline();
      const isAuthenticated = this.sessionStore.isAuthenticated();

      if (!isOnline) {
        this.indicatorState.set('offline');
        this.indicatorLabel.set('Offline');
        return;
      }

      if (isOnline && isAuthenticated) {
        this.requestAutoSync(1200);
      }
    });
  }

  requestAutoSync(delayMs = 900, entityType?: SyncedTable): void {
    if (this.autoSyncTimer) {
      globalThis.clearTimeout(this.autoSyncTimer);
    }

    this.indicatorState.set(this.connectivityService.isOnline() ? 'syncing' : 'offline');
    this.indicatorLabel.set(this.connectivityService.isOnline() ? 'Syncing' : 'Offline');

    this.autoSyncTimer = globalThis.setTimeout(() => {
      this.autoSyncTimer = null;
      void this.syncNow(entityType);
    }, delayMs);
  }

  async syncNow(entityType?: SyncedTable): Promise<{ synced: number; skipped: boolean }> {
    if (this.syncInFlight) {
      return this.syncInFlight;
    }

    this.indicatorState.set(this.connectivityService.isOnline() ? 'syncing' : 'offline');
    this.indicatorLabel.set(this.connectivityService.isOnline() ? 'Syncing' : 'Offline');

    this.syncInFlight = this.performSync(entityType)
      .then((result) => {
        if (result.skipped) {
          this.indicatorState.set('offline');
          this.indicatorLabel.set('Offline');
          return result;
        }

        this.indicatorState.set('synced');
        this.indicatorLabel.set('Synced');
        return result;
      })
      .catch((error) => {
        this.indicatorState.set('error');
        this.indicatorLabel.set(error instanceof Error ? error.message : 'Sync failed');
        throw error;
      })
      .finally(() => {
        this.syncInFlight = null;
      });

    return this.syncInFlight;
  }

  async resetLocalData(): Promise<void> {
    if (this.autoSyncTimer) {
      globalThis.clearTimeout(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }

    await this.db.clearAll();
    this.indicatorState.set('idle');
    this.indicatorLabel.set('Local reset');
  }

  private async performSync(entityType?: SyncedTable): Promise<{ synced: number; skipped: boolean }> {
    const userId = this.sessionStore.userId();
    const client = getSupabaseClient();

    if (!userId || !this.connectivityService.isOnline() || !client) {
      return { synced: 0, skipped: true };
    }

    const queue = (await this.queueService.list(userId)).filter(
      (item) => 
        (item.queue_status === 'pending' || item.queue_status === 'failed') &&
        (!entityType || item.entity_type === entityType)
    );

    let syncedCount = 0;

    for (const item of queue) {
      try {
        await this.pushItem(item, userId);
        await this.queueService.clear(item.id);
        syncedCount += 1;
      } catch (error) {
        await this.queueService.markStatus(item, 'failed', error instanceof Error ? error.message : 'Sync failed');
      }
    }

    syncedCount += await this.pullRemote(userId, entityType);
    return { synced: syncedCount, skipped: false };
  }

  private async pushItem(item: SyncQueueItem, userId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client is not configured.');
    }

    const table = item.entity_type as SyncedTable;

    if (item.operation === 'delete') {
      const { error } = await client.from(table).delete().eq('id', item.entity_id).eq('user_id', userId);
      if (error) {
        throw error;
      }
      return;
    }

    const payload = this.toRemotePayload(item.payload, table, userId);

    if (item.operation === 'insert') {
      const { error } = await client.from(table).insert(payload);
      if (error) {
        console.error(`[SyncService] Insert failed for ${table}:`, error);
        throw error;
      }
    } else {
      // For updates, we usually don't want to send the ID or user_id in the body
      const updatePayload = { ...payload };
      delete updatePayload['id'];
      delete updatePayload['user_id'];

      const { error } = await client.from(table).update(updatePayload).eq('id', item.entity_id).eq('user_id', userId);
      if (error) {
        console.error(`[SyncService] Update failed for ${table}:`, error);
        throw error;
      }
    }

    const current = await this.db.getById<EntityBase>(table, item.entity_id);
    if (current) {
      await this.db.upsert<EntityBase>(table, {
        ...current,
        user_id: userId,
        sync_status: 'synced',
        is_dirty: false,
        local_updated_at: String(current.updated_at),
      });
    }
  }

  private async pullRemote(userId: string, entityType?: SyncedTable): Promise<number> {
    const client = getSupabaseClient();
    if (!client) {
      return 0;
    }

    let count = 0;
    const tablesToPull = entityType ? [entityType] : syncTables;

    for (const table of tablesToPull) {
      console.log(`[SyncService] Pulling remote data for ${table}...`);
      const { data, error } = await client.from(table).select('*').eq('user_id', userId);
      if (error || !data) {
        console.error(`[SyncService] Pull failed for ${table}:`, error);
        continue;
      }

      if (data.length > 0) {
        console.log(`[SyncService] Received ${data.length} remote records for ${table}`);
      }

      const existing = await this.db.list<EntityBase>(table);
      const byId = new Map(existing.map((record) => [record.id, record] as const));

      for (const remote of data as RemoteEntity[]) {
        const normalized = this.fromRemotePayload(remote, table);
        const local = byId.get(normalized.id);

        if (
          table === 'invoices' &&
          local &&
          this.conflictService.shouldFlagInvoiceConflict(local as Invoice, normalized as unknown as Invoice)
        ) {
          byId.set(normalized.id, {
            ...local,
            sync_status: 'conflict',
            is_dirty: true,
          });
          count += 1;
          continue;
        }

        if (!local || !local.is_dirty || local.updated_at <= normalized.updated_at) {
          byId.set(normalized.id, normalized);
          count += 1;
        }
      }

      await this.db.bulkUpsert<EntityBase>(table, [...byId.values()]);
      
      if (data.length > 0) {
        console.log(`[SyncService] Updated local table ${table}. Final local count: ${byId.size}`);
      }
    }

    if (count > 0) {
      this.dataChanged$.set(entityType ?? 'all');
      // Reset to null so next change triggers signal again even if it's the same type
      setTimeout(() => this.dataChanged$.set(null), 50);
    }

    return count;
  }

  private toRemotePayload(payload: Record<string, unknown>, table: SyncedTable, userId: string): Record<string, unknown> {
    const remote: Record<string, unknown> = {
      ...payload,
      user_id: userId,
    };

    delete remote['sync_status'];
    delete remote['local_updated_at'];
    delete remote['device_id'];
    delete remote['is_dirty'];

    if (table === 'invoices') {
      remote['items'] = Array.isArray(remote['items']) ? remote['items'] : [];
    }

    return remote;
  }

  private fromRemotePayload(payload: RemoteEntity, table: SyncedTable): EntityBase {
    return {
      ...(payload as unknown as EntityBase),
      sync_status: 'synced',
      local_updated_at: String(payload.updated_at ?? new Date().toISOString()),
      device_id: 'remote',
      is_dirty: false,
      ...(table === 'invoices'
        ? { items: Array.isArray(payload['items']) ? payload['items'] : [] }
        : {}),
    };
  }
}
