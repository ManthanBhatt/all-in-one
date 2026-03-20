import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSearchbar } from '@ionic/angular/standalone';
import { addOutline, createOutline, pinOutline, pin, trashOutline } from 'ionicons/icons';

import { Note } from '../../../../core/models/domain.models';
import { NotesFacade } from '../../notes.facade';

@Component({
  selector: 'app-notes-list',
  templateUrl: './notes-list.page.html',
  styleUrls: ['./notes-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar, IonIcon, IonSearchbar],
})
export class NotesListPage implements OnInit {
  readonly facade = inject(NotesFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly addIcon = addOutline;
  readonly editIcon = createOutline;
  readonly deleteIcon = trashOutline;
  readonly pinIcon = pinOutline;
  readonly pinnedIcon = pin;

  readonly title = signal('');
  readonly body = signal('');
  readonly editingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    this.route.queryParamMap.subscribe((params) => {
      void this.handleRouteIntent(params.get('focus'), params.get('edit') === '1');
    });
  }

  async togglePin(note: Note, event: Event): Promise<void> {
    event.stopPropagation();
    await this.facade.togglePin(note);
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

  private async handleRouteIntent(focusId: string | null, shouldEdit: boolean): Promise<void> {
    if (!focusId) {
      return;
    }

    const note = this.facade.notes().find((item) => item.id === focusId);
    if (note && shouldEdit) {
      this.openEdit(note);
    }

    await this.clearRouteIntent();
  }

  private async clearRouteIntent(): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { focus: null, edit: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.title.set('');
    this.body.set('');
  }
}




