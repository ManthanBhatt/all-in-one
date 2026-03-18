import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../core/auth/session.store';
import { Project, ProjectStatus } from '../../core/models/domain.models';
import { ProjectsRepository } from '../../core/db/repositories/projects.repository';

@Injectable({
  providedIn: 'root',
})
export class ProjectsFacade {
  private readonly sessionStore = inject(SessionStore);
  private readonly repository = inject(ProjectsRepository);
  private readonly projectsState = signal<Project[]>([]);

  readonly projects = computed(() => this.projectsState());
  readonly activeProjects = computed(() =>
    this.projectsState().filter((project) => project.status === 'active' || project.status === 'planning'),
  );
  readonly planningProjects = computed(() => this.projectsState().filter((project) => project.status === 'planning'));
  readonly inFlightProjects = computed(() => this.projectsState().filter((project) => project.status === 'active' || project.status === 'on_hold'));
  readonly completedProjects = computed(() => this.projectsState().filter((project) => project.status === 'completed' || project.status === 'archived'));
  readonly availableStatuses: ProjectStatus[] = ['planning', 'active', 'on_hold', 'completed', 'archived'];

  async load(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      this.projectsState.set([]);
      return;
    }

    this.projectsState.set(await this.repository.list(userId));
  }

  async create(input: { name: string; client_id: string; status?: ProjectStatus }): Promise<boolean> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.name.trim() || !input.client_id) {
      return false;
    }

    await this.repository.create(userId, {
      name: input.name.trim(),
      client_id: input.client_id,
      status: input.status ?? 'planning',
    });
    await this.load();
    return true;
  }

  async update(projectId: string, input: { name: string; client_id: string; status?: ProjectStatus }): Promise<boolean> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.name.trim() || !input.client_id) {
      return false;
    }

    await this.repository.update(userId, projectId, {
      name: input.name.trim(),
      client_id: input.client_id,
      status: input.status,
    });
    await this.load();
    return true;
  }

  async setStatus(projectId: string, status: ProjectStatus): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      return;
    }

    await this.repository.update(userId, projectId, { status });
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
