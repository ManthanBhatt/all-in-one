import { Injectable, inject } from '@angular/core';
import { Params, Router } from '@angular/router';

import { EntityType } from '../models/domain.models';

export interface EntityNavigationTarget {
  entityType: Exclude<EntityType, 'sync_queue'>;
  entityId: string;
  route: string;
  queryParams?: Params;
}

@Injectable({
  providedIn: 'root',
})
export class EntityNavigationService {
  private readonly router = inject(Router);

  getTarget(entityType: Exclude<EntityType, 'sync_queue'>, entityId: string): EntityNavigationTarget {
    switch (entityType) {
      case 'clients':
        return { entityType, entityId, route: '/app/clients', queryParams: { focus: entityId, edit: '1' } };
      case 'projects':
        return { entityType, entityId, route: '/app/projects', queryParams: { focus: entityId, edit: '1' } };
      case 'tasks':
        return { entityType, entityId, route: '/app/tasks', queryParams: { focus: entityId, edit: '1' } };
      case 'notes':
        return { entityType, entityId, route: '/app/notes', queryParams: { focus: entityId, edit: '1' } };
      case 'reminders':
        return { entityType, entityId, route: '/app/reminders', queryParams: { focus: entityId, edit: '1', tab: 'scheduled' } };
      case 'time_entries':
        return { entityType, entityId, route: '/app/time', queryParams: { focus: entityId, edit: '1' } };
      case 'invoices':
        return { entityType, entityId, route: '/app/invoices', queryParams: { focus: entityId, edit: '1' } };
      case 'counters':
        return { entityType, entityId, route: `/app/counters/${entityId}` };
      default:
        return { entityType, entityId, route: '/app/dashboard' };
    }
  }

  async navigateToEntity(entityType: Exclude<EntityType, 'sync_queue'>, entityId: string): Promise<boolean> {
    const target = this.getTarget(entityType, entityId);
    return this.navigateToTarget(target);
  }

  async navigateToTarget(target: EntityNavigationTarget): Promise<boolean> {
    const queryString = target.queryParams
      ? new URLSearchParams(Object.entries(target.queryParams).filter(([, value]) => value != null).map(([key, value]) => [key, String(value)])).toString()
      : '';
    return this.router.navigateByUrl(queryString ? `${target.route}?${queryString}` : target.route);
  }
}
