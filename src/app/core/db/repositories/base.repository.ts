import { inject } from '@angular/core';

import { AppDatabaseService } from '../app-database.service';
import { EntityBase, EntityType } from '../../models/domain.models';
import { DeviceService } from '../../services/device.service';
import { SyncService } from '../../sync/sync.service';
import { createEntityBase, stampEntityUpdate } from '../../utils/entity.util';
import { SyncQueueService } from '../../sync/sync-queue.service';

export abstract class BaseRepository<T extends EntityBase, TCreate extends object> {
  protected readonly db = inject(AppDatabaseService);
  protected readonly deviceService = inject(DeviceService);
  protected readonly syncQueueService = inject(SyncQueueService);
  protected readonly syncService = inject(SyncService);

  protected abstract readonly table: Exclude<EntityType, 'sync_queue'>;

  async list(userId: string): Promise<T[]> {
    const records = await this.db.list<T>(this.table);
    return records.filter((record) => record.user_id === userId && !record.deleted_at);
  }

  async get(userId: string, id: string): Promise<T | null> {
    const record = await this.db.getById<T>(this.table, id);
    if (!record || record.user_id !== userId || record.deleted_at) {
      return null;
    }

    return record;
  }

  async create(userId: string, input: TCreate): Promise<T> {
    const base = createEntityBase(userId, this.deviceService.deviceId());
    const record = {
      ...this.buildCreate(base, input),
      sync_status: 'pending',
      is_dirty: true,
    } as T;
    await this.db.upsert<T>(this.table, record);
    await this.syncQueueService.enqueue(userId, this.table, record, 'insert');
    this.syncService.requestAutoSync(900, this.table);
    return record;
  }

  async update(userId: string, id: string, patch: Partial<T>): Promise<T | null> {
    const existing = await this.get(userId, id);
    if (!existing) {
      return null;
    }

    const updated: T = stampEntityUpdate<T>({
      ...existing,
      ...patch,
    });

    await this.db.upsert<T>(this.table, updated);
    await this.syncQueueService.enqueue(userId, this.table, updated, 'update');
    this.syncService.requestAutoSync(900, this.table);
    return updated;
  }

  async updateLocal(userId: string, id: string, patch: Partial<T>): Promise<T | null> {
    const existing = await this.get(userId, id);
    if (!existing) {
      return null;
    }

    const updated: T = stampEntityUpdate<T>({
      ...existing,
      ...patch,
      is_dirty: true,
      sync_status: 'pending',
    });

    await this.db.upsert<T>(this.table, updated);
    return updated;
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const existing = await this.get(userId, id);
    if (!existing) {
      return;
    }

    const deleted: T = stampEntityUpdate<T>({
      ...existing,
      deleted_at: new Date().toISOString(),
    });

    await this.db.upsert<T>(this.table, deleted);
    await this.syncQueueService.enqueue(userId, this.table, deleted, 'delete');
    this.syncService.requestAutoSync(900, this.table);
  }

  protected abstract buildCreate(base: EntityBase, input: TCreate): T;
}
