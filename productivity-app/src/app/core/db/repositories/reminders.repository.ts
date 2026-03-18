import { Injectable } from '@angular/core';

import { EntityBase, Reminder } from '../../models/domain.models';
import { BaseRepository } from './base.repository';

export interface CreateReminderInput {
  title: string;
  remind_at: string;
  client_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class RemindersRepository extends BaseRepository<Reminder, CreateReminderInput> {
  protected override readonly table = 'reminders' as const;

  protected override buildCreate(base: EntityBase, input: CreateReminderInput): Reminder {
    return {
      ...base,
      client_id: input.client_id ?? null,
      project_id: input.project_id ?? null,
      task_id: input.task_id ?? null,
      title: input.title,
      remind_at: input.remind_at,
      status: 'scheduled',
      repeat_rule: null,
      notification_id: null,
    };
  }
}
