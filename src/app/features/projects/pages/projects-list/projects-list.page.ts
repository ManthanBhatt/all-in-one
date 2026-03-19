import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSearchbar } from '@ionic/angular/standalone';

import { Project, ProjectStatus } from '../../../../core/models/domain.models';
import { ClientsFacade } from '../../../clients/clients.facade';
import { TasksFacade } from '../../../tasks/tasks.facade';
import { ProjectsFacade } from '../../projects.facade';

@Component({
  selector: 'app-projects-list',
  templateUrl: './projects-list.page.html',
  styleUrls: ['./projects-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSearchbar],
})
export class ProjectsListPage implements OnInit {
  readonly facade = inject(ProjectsFacade);
  readonly clientsFacade = inject(ClientsFacade);
  readonly tasksFacade = inject(TasksFacade);

  readonly name = signal('');
  readonly clientId = signal('');
  readonly status = signal<ProjectStatus>('planning');
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly isProjectModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.facade.load(), this.clientsFacade.load(), this.tasksFacade.load()]);
  }

  clientName(clientId: string | null): string {
    return this.clientsFacade.clients().find((client) => client.id === clientId)?.name ?? 'Unknown client';
  }

  projectTasks(projectId: string) {
    return this.tasksFacade.tasksForProject(projectId).slice(0, 5);
  }

  openCreate(): void {
    this.resetProjectForm();
    this.isProjectModalOpen.set(true);
  }

  openEdit(project: Project): void {
    this.editingId.set(project.id);
    this.name.set(project.name);
    this.clientId.set(project.client_id ?? '');
    this.status.set(project.status);
    this.errorMessage.set(null);
    this.isProjectModalOpen.set(true);
  }

  closeProjectModal(): void {
    this.isProjectModalOpen.set(false);
    this.resetProjectForm();
  }

  async saveProject(): Promise<void> {
    this.errorMessage.set(null);
    if (!this.clientId()) {
      this.errorMessage.set('Select a client before saving the project.');
      return;
    }

    const editingId = this.editingId();
    const saved = editingId
      ? await this.facade.update(editingId, { name: this.name(), client_id: this.clientId(), status: this.status() })
      : await this.facade.create({ name: this.name(), client_id: this.clientId(), status: this.status() });

    if (!saved) {
      this.errorMessage.set('Project name and client are required.');
      return;
    }

    this.closeProjectModal();
  }

  async onStatusChange(project: Project, nextStatus: string): Promise<void> {
    await this.facade.setStatus(project.id, nextStatus as ProjectStatus);
  }

  private resetProjectForm(): void {
    this.editingId.set(null);
    this.name.set('');
    this.clientId.set('');
    this.status.set('planning');
    this.errorMessage.set(null);
  }
}
