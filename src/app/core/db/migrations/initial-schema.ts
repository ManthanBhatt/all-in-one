import { EntityType } from '../../models/domain.models';

export const schemaVersion = 1;

export const entityTables: EntityType[] = [
  'clients',
  'projects',
  'tasks',
  'notes',
  'reminders',
  'time_entries',
  'invoices',
  'sync_queue',
];
