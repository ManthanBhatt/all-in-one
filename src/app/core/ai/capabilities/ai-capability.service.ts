import { Injectable } from '@angular/core';

export interface AICapability {
  id: string;
  name: string;
  description: string;
  schema: any;
}

@Injectable({
  providedIn: 'root'
})
export class AICapabilityService {
  private capabilities: AICapability[] = [
    {
      id: 'create_task',
      name: 'Create Task',
      description: 'Adds a new actionable task to the workspace.',
      schema: { additionalProperties: false, type: 'object', properties: { title: { type: 'string' }, due_at: { type: 'string' }, project_id: { type: 'string' }, client_id: { type: 'string' } }, required: ['title'] }
    },
    {
      id: 'create_note',
      name: 'Create Note',
      description: 'Captures an idea or general thought as a permanent note.',
      schema: { additionalProperties: false, type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, body: { type: 'string' } }, required: [] }
    },
    {
      id: 'create_reminder',
      name: 'Create Reminder',
      description: 'Sets a reminder.',
      schema: { additionalProperties: false, type: 'object', properties: { title: { type: 'string' }, datetime: { type: 'string' }, remind_at: { type: 'string' } }, required: ['title'] }
    },
    {
      id: 'create_client',
      name: 'Create Client',
      description: 'Registers a new client.',
      schema: { additionalProperties: false, type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, company: { type: 'string' }, company_name: { type: 'string' } }, required: ['name'] }
    },
    {
      id: 'create_project',
      name: 'Create Project',
      description: 'Creates a new project.',
      schema: { additionalProperties: false, type: 'object', properties: { name: { type: 'string' }, client_id: { type: 'string' }, status: { type: 'string' } }, required: ['name'] }
    },
    {
      id: 'create_counter',
      name: 'Create Counter',
      description: 'Creates a fast counter item.',
      schema: { additionalProperties: false, type: 'object', properties: { name: { type: 'string' }, current_value: { type: 'number' }, target_value: { type: 'number' } }, required: ['name'] }
    },
    {
      id: 'update_entity',
      name: 'Update Entity',
      description: 'Updates an existing note, task, client, project, reminder, invoice, or counter by ID.',
      schema: {
        additionalProperties: false,
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['notes', 'tasks', 'clients', 'projects', 'reminders', 'invoices', 'counters'] },
          id: { type: 'string' },
          updates: { type: 'object' }
        },
        required: ['type', 'id', 'updates']
      }
    },
    {
      id: 'delete_entity',
      name: 'Delete Entity',
      description: 'Deletes an existing item by its ID.',
      schema: {
        additionalProperties: false,
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['notes', 'tasks', 'clients', 'projects', 'reminders', 'invoices', 'counters'] },
          id: { type: 'string' }
        },
        required: ['type', 'id']
      }
    },
    {
      id: 'update_settings',
      name: 'Update System Settings',
      description: 'Changes application settings like theme, language, or feature flags.',
      schema: {
        additionalProperties: false,
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['dark', 'light', 'system'] },
          language: { type: 'string' },
          enabled_features: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    {
      id: 'start_timer',
      name: 'Start Timer',
      description: 'Starts a time entry.',
      schema: { additionalProperties: false, type: 'object', properties: { description: { type: 'string' }, project_id: { type: 'string' }, task_id: { type: 'string' } }, required: [] }
    },
    {
      id: 'create_invoice',
      name: 'Create Invoice',
      description: 'Drafts a new invoice.',
      schema: { additionalProperties: false, type: 'object', properties: { invoice_number: { type: 'string' }, due_date: { type: 'string' }, client_id: { type: 'string' }, project_id: { type: 'string' } }, required: ['invoice_number', 'due_date'] }
    }
  ];

  getEnabledCapabilities(): AICapability[] {
    return this.capabilities;
  }

  getCapabilitiesJson(): string {
    return JSON.stringify(this.capabilities.map(c => ({
      name: c.id,
      description: c.description,
      parameters: c.schema
    })));
  }
}
