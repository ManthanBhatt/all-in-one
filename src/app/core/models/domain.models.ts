export type SyncStatus = 'local_only' | 'pending' | 'synced' | 'conflict' | 'failed';
export type EntityType =
  | 'clients'
  | 'projects'
  | 'tasks'
  | 'notes'
  | 'reminders'
  | 'time_entries'
  | 'invoices'
  | 'sync_queue';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type TaskStatus = 'planning' | 'in_flight' | 'on_hold' | 'in_review' | 'complete';
export type Priority = 'low' | 'medium' | 'high';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type ReminderStatus = 'scheduled' | 'completed' | 'dismissed';
export type SyncQueueOperation = 'insert' | 'update' | 'delete';
export type SyncQueueState = 'pending' | 'synced' | 'failed' | 'conflict';

export interface EntityBase {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  sync_status: SyncStatus;
  local_updated_at: string;
  device_id: string;
  is_dirty: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
}

export interface Client extends EntityBase {
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  billing_currency: string;
  hourly_rate: number | null;
  status: 'active' | 'inactive';
  notes: string | null;
}

export interface Project extends EntityBase {
  client_id: string | null;
  name: string;
  description: string | null;
  stack: string | null;
  repo_url: string | null;
  staging_url: string | null;
  production_url: string | null;
  status: ProjectStatus;
  priority: Priority;
  start_date: string | null;
  due_date: string | null;
}

export interface Task extends EntityBase {
  client_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  estimated_minutes: number | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  completed_at: string | null;
}

export interface Note extends EntityBase {
  client_id: string | null;
  project_id: string | null;
  task_id: string | null;
  title: string | null;
  body: string;
  note_type: 'general' | 'meeting' | 'snippet';
  is_pinned: boolean;
}

export interface Reminder extends EntityBase {
  client_id: string | null;
  project_id: string | null;
  task_id: string | null;
  title: string;
  remind_at: string;
  status: ReminderStatus;
  repeat_rule: string | null;
  notification_id: string | null;
}

export interface TimeEntry extends EntityBase {
  client_id: string | null;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_billable: boolean;
  hourly_rate: number | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export interface Invoice extends EntityBase {
  client_id: string | null;
  project_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  paid_at: string | null;
  items: InvoiceItem[];
}

export interface SyncQueueItem extends EntityBase {
  entity_type: Exclude<EntityType, 'sync_queue'>;
  entity_id: string;
  operation: SyncQueueOperation;
  queue_status: SyncQueueState;
  payload: Record<string, unknown>;
  retry_count: number;
  last_error: string | null;
}

export interface SessionState {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  profile: Profile | null;
  accessToken: string | null;
}
