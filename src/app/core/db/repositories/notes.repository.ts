import { Injectable } from '@angular/core';

import { EntityBase, Note } from '../../models/domain.models';
import { BaseRepository } from './base.repository';

export interface CreateNoteInput {
  body: string;
  title?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class NotesRepository extends BaseRepository<Note, CreateNoteInput> {
  protected override readonly table = 'notes' as const;

  protected override buildCreate(base: EntityBase, input: CreateNoteInput): Note {
    return {
      ...base,
      client_id: input.client_id ?? null,
      project_id: input.project_id ?? null,
      task_id: input.task_id ?? null,
      title: input.title ?? null,
      body: input.body,
      note_type: 'general',
      is_pinned: false,
    };
  }
}
