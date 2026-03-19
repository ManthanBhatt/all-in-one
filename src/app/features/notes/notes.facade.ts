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
  readonly searchQuery = signal('');

  readonly notes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = [...this.notesState()].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (!query) return list;
    return list.filter(n => 
      n.title?.toLowerCase().includes(query) || 
      n.body.toLowerCase().includes(query)
    );
  });
  readonly recentNotes = computed(() => this.notes().slice(0, 5));
  readonly pinnedNotes = computed(() => this.notesState().filter(n => n.is_pinned));

  async load(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      this.notesState.set([]);
      return;
    }

    this.notesState.set(await this.repository.list(userId));
  }

  async togglePin(note: Note): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) return;

    await this.repository.update(userId, note.id, {
      is_pinned: !note.is_pinned,
    });
    await this.load();
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
