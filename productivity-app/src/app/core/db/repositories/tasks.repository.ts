import { Injectable } from '@angular/core';

import { EntityBase, Task } from '../../models/domain.models';
import { BaseRepository } from './base.repository';

export interface CreateTaskInput {
  title: string;
  client_id?: string | null;
  project_id?: string | null;
  due_at?: string | null;
  status?: Task['status'];
}

@Injectable({
  providedIn: 'root',
})
export class TasksRepository extends BaseRepository<Task, CreateTaskInput> {
  protected override readonly table = 'tasks' as const;

  protected override buildCreate(base: EntityBase, input: CreateTaskInput): Task {
    return {
      ...base,
      client_id: input.client_id ?? null,
      project_id: input.project_id ?? null,
      title: input.title,
      description: null,
      status: input.status ?? 'planning',
      priority: 'medium',
      due_at: input.due_at ?? null,
      estimated_minutes: null,
      is_recurring: false,
      recurrence_rule: null,
      completed_at: input.status === 'complete' ? new Date().toISOString() : null,
    };
  }
}
