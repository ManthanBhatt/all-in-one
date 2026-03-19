import { EntityType } from '../../models/domain.models';

export const schemaVersion = 2;

export const entityTables: EntityType[] = [
  'clients',
  'projects',
  'tasks',
  'notes',
  'reminders',
  'time_entries',
  'invoices',
  'counters',
  'sync_queue',
];
