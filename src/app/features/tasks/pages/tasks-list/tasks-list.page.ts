import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSearchbar } from '@ionic/angular/standalone';
import { createOutline, trashOutline } from 'ionicons/icons';

import { Task, TaskStatus } from '../../../../core/models/domain.models';
import { ClientsFacade } from '../../../clients/clients.facade';
import { ProjectsFacade } from '../../../projects/projects.facade';
import { TasksFacade } from '../../tasks.facade';

@Component({
  selector: 'app-tasks-list',
  templateUrl: './tasks-list.page.html',
  styleUrls: ['./tasks-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSearchbar],
})
export class TasksListPage implements OnInit {
  readonly facade = inject(TasksFacade);
  readonly projectsFacade = inject(ProjectsFacade);
  readonly clientsFacade = inject(ClientsFacade);
  readonly createIcon = createOutline;
  readonly trashIcon = trashOutline;

  readonly title = signal('');
  readonly dueAt = signal('');
  readonly projectId = signal('');
  readonly clientId = signal('');
  readonly status = signal<TaskStatus>('planning');
  readonly editingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);
  readonly draggingTaskId = signal<string | null>(null);
  readonly dropStatus = signal<TaskStatus | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.facade.load(), this.projectsFacade.load(), this.clientsFacade.load()]);
  }

  openCreate(): void {
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openEdit(task: Task): void {
    this.editingId.set(task.id);
    this.title.set(task.title);
    this.dueAt.set(this.toLocalDateTime(task.due_at));
    this.projectId.set(task.project_id ?? '');
    this.clientId.set(task.client_id ?? '');
    this.status.set(task.status);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  onProjectChange(projectId: string): void {
    this.projectId.set(projectId);
    const project = this.projectsFacade.projects().find((item) => item.id === projectId);
    this.clientId.set(project?.client_id ?? '');
  }

  projectName(projectId: string | null): string {
    return this.projectsFacade.projects().find((project) => project.id === projectId)?.name ?? 'General task';
  }

  clientName(clientId: string | null): string {
    return this.clientsFacade.clients().find((client) => client.id === clientId)?.name ?? 'No client';
  }

  onDragStart(task: Task): void {
    this.draggingTaskId.set(task.id);
  }

  onDragEnd(): void {
    this.draggingTaskId.set(null);
    this.dropStatus.set(null);
  }

  onDragOver(event: DragEvent, status: TaskStatus): void {
    event.preventDefault();
    this.dropStatus.set(status);
  }

  onDragLeave(status: TaskStatus): void {
    if (this.dropStatus() === status) {
      this.dropStatus.set(null);
    }
  }

  async onDrop(status: TaskStatus): Promise<void> {
    const taskId = this.draggingTaskId();
    if (!taskId) {
      return;
    }

    const task = this.facade.tasks().find((item) => item.id === taskId);
    if (!task || task.status === status) {
      this.onDragEnd();
      return;
    }

    await this.facade.setStatus(task, status);
    this.onDragEnd();
  }

  async save(): Promise<void> {
    const payload = {
      title: this.title(),
      due_at: this.dueAt() ? new Date(this.dueAt()).toISOString() : null,
      project_id: this.projectId() || null,
      client_id: this.clientId() || null,
      status: this.status(),
    };

    const editingId = this.editingId();
    if (editingId) {
      await this.facade.update(editingId, payload);
    } else {
      await this.facade.create(payload);
    }

    this.closeModal();
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.title.set('');
    this.dueAt.set('');
    this.projectId.set('');
    this.clientId.set('');
    this.status.set('planning');
  }

  private toLocalDateTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }
}
