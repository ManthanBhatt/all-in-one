import { v4 as uuidv4 } from 'uuid';

import { EntityBase, SyncStatus } from '../models/domain.models';

const defaultSyncStatus: SyncStatus = 'local_only';

export function createEntityBase(userId: string, deviceId: string): EntityBase {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    user_id: userId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    version: 1,
    sync_status: defaultSyncStatus,
    local_updated_at: now,
    device_id: deviceId,
    is_dirty: true,
  };
}

export function stampEntityUpdate<T extends EntityBase>(
  entity: T,
  syncStatus: SyncStatus = 'pending',
): T {
  const now = new Date().toISOString();

  return {
    ...entity,
    updated_at: now,
    local_updated_at: now,
    version: entity.version + 1,
    sync_status: syncStatus,
    is_dirty: syncStatus !== 'synced',
  };
}
