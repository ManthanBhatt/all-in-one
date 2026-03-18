import { Injectable, inject } from '@angular/core';

import { AppDatabaseService } from '../db/app-database.service';
import { EntityBase, EntityType, SyncQueueItem, SyncQueueOperation, SyncQueueState } from '../models/domain.models';
import { DeviceService } from '../services/device.service';
import { createEntityBase } from '../utils/entity.util';

@Injectable({
  providedIn: 'root',
})
export class SyncQueueService {
  private readonly db = inject(AppDatabaseService);
  private readonly deviceService = inject(DeviceService);

  async list(userId: string): Promise<SyncQueueItem[]> {
    const queue = await this.db.list<SyncQueueItem>('sync_queue');
    return queue
      .filter((item) => item.user_id === userId && !item.deleted_at)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async enqueue(
    userId: string,
    entityType: Exclude<EntityType, 'sync_queue'>,
    entity: EntityBase,
    operation: SyncQueueOperation,
  ): Promise<void> {
    const base = createEntityBase(userId, this.deviceService.deviceId());
    const item: SyncQueueItem = {
      ...base,
      entity_type: entityType,
      entity_id: entity.id,
      operation,
      payload: entity as unknown as Record<string, unknown>,
      queue_status: 'pending',
      retry_count: 0,
      last_error: null,
    };

    await this.db.upsert<SyncQueueItem>('sync_queue', item);
  }

  async markStatus(item: SyncQueueItem, status: SyncQueueState, lastError: string | null = null) {
    await this.db.upsert<SyncQueueItem>('sync_queue', {
      ...item,
      queue_status: status,
      last_error: lastError,
      retry_count: status === 'failed' ? item.retry_count + 1 : item.retry_count,
      updated_at: new Date().toISOString(),
      local_updated_at: new Date().toISOString(),
    });
  }

  async clear(itemId: string): Promise<void> {
    await this.db.remove('sync_queue', itemId);
  }
}
