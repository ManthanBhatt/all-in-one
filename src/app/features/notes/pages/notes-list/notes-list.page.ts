import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { Note } from '../../../../core/models/domain.models';
import { NotesFacade } from '../../notes.facade';

@Component({
  selector: 'app-notes-list',
  templateUrl: './notes-list.page.html',
  styleUrls: ['./notes-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar],
})
export class NotesListPage implements OnInit {
  readonly facade = inject(NotesFacade);
  readonly title = signal('');
  readonly body = signal('');
  readonly editingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
  }

  openCreate(): void {
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openEdit(note: Note): void {
    this.editingId.set(note.id);
    this.title.set(note.title ?? '');
    this.body.set(note.body);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  async save(): Promise<void> {
    const editingId = this.editingId();
    if (editingId) {
      await this.facade.update(editingId, { title: this.title(), body: this.body() });
    } else {
      await this.facade.create({ title: this.title(), body: this.body() });
    }

    this.closeModal();
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.title.set('');
    this.body.set('');
  }
}
