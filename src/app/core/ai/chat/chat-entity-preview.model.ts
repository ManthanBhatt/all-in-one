import { EntityType } from '../../models/domain.models';

export interface ChatEntityPreview {
  entityType: Exclude<EntityType, 'sync_queue'>;
  entityId: string;
  route: string;
  queryParams?: Record<string, string>;
  title: string;
  subtitle?: string;
  badge?: string;
  actionLabel: 'Created' | 'Updated';
}
