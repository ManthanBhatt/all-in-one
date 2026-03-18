import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../core/auth/session.store';
import { Note } from '../../core/models/domain.models';
import { NotesRepository } from '../../core/db/repositories/notes.repository';

@Injectable({
  providedIn: 'root',
})
export class NotesFacade {
  private readonly sessionStore = inject(SessionStore);
  private readonly repository = inject(NotesRepository);
  private readonly notesState = signal<Note[]>([]);

  readonly notes = computed(() => this.notesState());
  readonly recentNotes = computed(() => this.notesState().slice(0, 5));

  async load(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      this.notesState.set([]);
      return;
    }

    this.notesState.set(await this.repository.list(userId));
  }

  async create(input: { title?: string | null; body: string }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.body.trim()) {
      return;
    }

    await this.repository.create(userId, {
      title: input.title?.trim() || null,
      body: input.body.trim(),
    });
    await this.load();
  }

  async update(noteId: string, input: { title?: string | null; body: string }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.body.trim()) {
      return;
    }

    await this.repository.update(userId, noteId, {
      title: input.title?.trim() || null,
      body: input.body.trim(),
    });
    await this.load();
  }

  async remove(id: string): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      return;
    }

    await this.repository.softDelete(userId, id);
    await this.load();
  }
}
