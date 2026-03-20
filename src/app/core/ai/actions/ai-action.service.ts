import { Injectable, inject } from '@angular/core';
import Ajv from 'ajv';

import { SessionStore } from '../../auth/session.store';
import { ClientsRepository } from '../../db/repositories/clients.repository';
import { CountersRepository } from '../../db/repositories/counters.repository';
import { InvoicesRepository } from '../../db/repositories/invoices.repository';
import { NotesRepository } from '../../db/repositories/notes.repository';
import { ProjectsRepository } from '../../db/repositories/projects.repository';
import { RemindersRepository } from '../../db/repositories/reminders.repository';
import { TasksRepository } from '../../db/repositories/tasks.repository';
import { TimeEntriesRepository } from '../../db/repositories/time-entries.repository';
import { EntityNavigationService } from '../../services/entity-navigation.service';
import { LocalNotificationService } from '../../notifications/local-notification.service';
import { AICapabilityService } from '../capabilities/ai-capability.service';
import { ChatEntityPreview } from '../chat/chat-entity-preview.model';

export interface ActionResult {
  actionPerformed: boolean;
  actionType?: string;
  data?: any;
  confidence?: number;
  requiresConfirmation?: boolean;
  entityPreview?: ChatEntityPreview;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIActionService {
  private readonly notesRepo = inject(NotesRepository);
  private readonly tasksRepo = inject(TasksRepository);
  private readonly remindersRepo = inject(RemindersRepository);
  private readonly clientsRepo = inject(ClientsRepository);
  private readonly projectsRepo = inject(ProjectsRepository);
  private readonly invoicesRepo = inject(InvoicesRepository);
  private readonly timeRepo = inject(TimeEntriesRepository);
  private readonly countersRepo = inject(CountersRepository);
  private readonly sessionStore = inject(SessionStore);
  private readonly capabilityService = inject(AICapabilityService);
  private readonly navigation = inject(EntityNavigationService);
  private readonly notifications = inject(LocalNotificationService);
  private readonly ajv = new Ajv();

  async execute(aiOutput: string): Promise<ActionResult> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      return { actionPerformed: false, error: 'User context missing.' };
    }

    let json: any;
    try {
      json = JSON.parse(aiOutput);
    } catch {
      return { actionPerformed: false, confidence: 0, error: 'Invalid JSON.' };
    }

    const action = json?.action ?? null;
    const data = json?.data ?? {};

    if (!action) {
      return { actionPerformed: false, confidence: 1 };
    }

    const capability = this.capabilityService.getEnabledCapabilities().find((item) => item.id === action);
    if (!capability) {
      return { actionPerformed: false, error: `Unknown protocol: ${action}` };
    }

    const validate = this.ajv.compile(capability.schema);
    const isSchemaValid = validate(data);
    let confidence = 0;
    if (isSchemaValid) confidence += 0.8;
    if (typeof json.confidence === 'number') confidence += json.confidence * 0.2;
    else confidence += 0.1;

    if (confidence < 0.4) {
      return { actionPerformed: false, error: 'Neural confidence too low.', confidence };
    }

    try {
      let entityPreview: ChatEntityPreview | undefined;

      switch (action) {
        case 'create_note': {
          const note = await this.notesRepo.create(userId, {
            title: this.toOptionalString(data.title),
            body: this.toString(data.content) || this.toString(data.body) || 'Empty note',
          });
          entityPreview = this.buildPreview('notes', note.id, 'Created', note.title || 'Quick note', note.body, note.is_pinned ? 'Pinned' : 'Note');
          break;
        }
        case 'create_task': {
          const task = await this.tasksRepo.create(userId, {
            title: this.toString(data.title) || 'Untitled task',
            due_at: this.toOptionalString(data.due_at) || this.toOptionalString(data.due_date),
            project_id: this.toOptionalString(data.project_id),
            client_id: this.toOptionalString(data.client_id),
          });
          if (task.due_at && task.status !== 'complete') {
            await this.notifications.scheduleTask(task);
          }
          entityPreview = this.buildPreview('tasks', task.id, 'Created', task.title, task.due_at ? `Due ${new Date(task.due_at).toLocaleString('en-IN')}` : 'No due date', task.status.replace(/_/g, ' '));
          break;
        }
        case 'create_reminder': {
          const reminder = await this.remindersRepo.create(userId, {
            title: this.toString(data.title) || 'Reminder',
            remind_at: this.toOptionalString(data.datetime) || this.toOptionalString(data.remind_at) || new Date(Date.now() + 3600000).toISOString(),
            task_id: this.toOptionalString(data.task_id),
            project_id: this.toOptionalString(data.project_id),
            client_id: this.toOptionalString(data.client_id),
          });
          await this.notifications.scheduleReminder(reminder);
          entityPreview = this.buildPreview('reminders', reminder.id, 'Created', reminder.title, new Date(reminder.remind_at).toLocaleString('en-IN'), reminder.status);
          break;
        }
        case 'create_client': {
          const client = await this.clientsRepo.create(userId, {
            name: this.toString(data.name) || 'Untitled client',
            email: this.toOptionalString(data.email),
            company_name: this.toOptionalString(data.company) || this.toOptionalString(data.company_name),
          });
          entityPreview = this.buildPreview('clients', client.id, 'Created', client.name, client.company_name || client.email || 'Client profile', client.status);
          break;
        }
        case 'create_project': {
          const project = await this.projectsRepo.create(userId, {
            name: this.toString(data.name) || 'Untitled project',
            client_id: this.toOptionalString(data.client_id),
            status: this.toOptionalString(data.status) as any || 'planning',
          });
          entityPreview = this.buildPreview('projects', project.id, 'Created', project.name, 'Project workspace ready', project.status.replace(/_/g, ' '));
          break;
        }
        case 'create_counter': {
          const counter = await this.countersRepo.create(userId, {
            name: this.toString(data.name) || 'Untitled counter',
            current_value: this.toNumber(data.current_value) ?? 0,
            target_value: this.toNumber(data.target_value),
          });
          entityPreview = this.buildPreview('counters', counter.id, 'Created', counter.name, `Current value ${counter.current_value}`, counter.target_value != null ? `Target ${counter.target_value}` : 'Counter');
          break;
        }
        case 'update_entity': {
          const type = this.toEntityType(data.type);
          const entityId = this.toString(data.id);
          const repository = this.getRepository(type);
          const updated = await repository.update(userId, entityId, data.updates ?? {});
          if (updated) {
            entityPreview = this.buildPreview(type, entityId, 'Updated', this.previewTitle(updated), this.previewSubtitle(updated), this.previewBadge(updated));
          }
          break;
        }
        case 'delete_entity': {
          const repository = this.getRepository(this.toEntityType(data.type));
          await repository.softDelete(userId, this.toString(data.id));
          break;
        }
        case 'update_settings': {
          this.updateSettings(data);
          break;
        }
        case 'start_timer': {
          const entry = await this.timeRepo.create(userId, {
            description: this.toOptionalString(data.description) || 'AI timer',
            started_at: new Date().toISOString(),
            project_id: this.toOptionalString(data.project_id),
            task_id: this.toOptionalString(data.task_id),
          });
          entityPreview = this.buildPreview('time_entries', entry.id, 'Created', entry.description || 'Tracked work session', `Started ${new Date(entry.started_at).toLocaleString('en-IN')}`, 'Timer running');
          break;
        }
        case 'create_invoice': {
          const invoice = await this.invoicesRepo.create(userId, {
            invoice_number: this.toString(data.invoice_number) || `INV-${Date.now().toString().slice(-6)}`,
            issue_date: new Date().toISOString().slice(0, 10),
            due_date: (this.toOptionalString(data.due_date) || new Date(Date.now() + 7 * 86400000).toISOString()).slice(0, 10),
            client_id: this.toOptionalString(data.client_id),
            project_id: this.toOptionalString(data.project_id),
            items: [],
          });
          entityPreview = this.buildPreview('invoices', invoice.id, 'Created', invoice.invoice_number, `Due ${invoice.due_date}`, invoice.status);
          break;
        }
        default:
          return { actionPerformed: false, error: `Protocol ${action} not implemented.` };
      }

      return { actionPerformed: true, actionType: action, data, confidence, entityPreview };
    } catch (error: any) {
      return { actionPerformed: false, error: error?.message ?? 'Execution failed', confidence };
    }
  }

  private buildPreview(
    entityType: any,
    entityId: string,
    actionLabel: 'Created' | 'Updated',
    title: string,
    subtitle?: string,
    badge?: string,
  ): ChatEntityPreview {
    const target = this.navigation.getTarget(entityType, entityId);
    return {
      entityType,
      entityId,
      route: target.route,
      queryParams: target.queryParams,
      title,
      subtitle,
      badge,
      actionLabel,
    };
  }

  private previewTitle(value: any): string {
    return value.title || value.name || value.invoice_number || value.description || 'Updated record';
  }

  private previewSubtitle(value: any): string {
    return value.body || value.company_name || value.email || value.remind_at || value.due_at || value.due_date || value.started_at || 'Saved in workspace';
  }

  private previewBadge(value: any): string {
    return value.status || (typeof value.current_value === 'number' ? `Value ${value.current_value}` : 'Updated');
  }

  private updateSettings(data: any): void {
    const currentSession = this.sessionStore.session();
    if (!currentSession.profile) {
      return;
    }

    const updatedProfile = { ...currentSession.profile, ...data };
    this.sessionStore.setAuthenticated({
      ...currentSession,
      profile: updatedProfile,
    });
  }

  private getRepository(type: string): any {
    switch (type) {
      case 'notes': return this.notesRepo;
      case 'tasks': return this.tasksRepo;
      case 'clients': return this.clientsRepo;
      case 'projects': return this.projectsRepo;
      case 'reminders': return this.remindersRepo;
      case 'invoices': return this.invoicesRepo;
      case 'counters': return this.countersRepo;
      case 'time_entries': return this.timeRepo;
      default: throw new Error(`Repository for ${type} not found.`);
    }
  }

  private toEntityType(value: unknown): string {
    const normalized = this.toString(value);
    if (!normalized) {
      throw new Error('Entity type missing.');
    }
    return normalized;
  }

  private toString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private toOptionalString(value: unknown): string | null {
    const normalized = this.toString(value);
    return normalized || null;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }
}
