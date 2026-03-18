import { Injectable } from '@angular/core';

import { EntityBase, TimeEntry } from '../../models/domain.models';
import { normalizeTimeEntryDuration } from '../../utils/time-entry.util';
import { BaseRepository } from './base.repository';

export interface CreateTimeEntryInput {
  description?: string | null;
  started_at: string;
  ended_at?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TimeEntriesRepository extends BaseRepository<TimeEntry, CreateTimeEntryInput> {
  protected override readonly table = 'time_entries' as const;

  protected override buildCreate(base: EntityBase, input: CreateTimeEntryInput): TimeEntry {
    return normalizeTimeEntryDuration({
      ...base,
      client_id: input.client_id ?? null,
      project_id: input.project_id ?? null,
      task_id: input.task_id ?? null,
      description: input.description ?? null,
      started_at: input.started_at,
      ended_at: input.ended_at ?? null,
      duration_minutes: null,
      is_billable: true,
      hourly_rate: null,
    });
  }
}
