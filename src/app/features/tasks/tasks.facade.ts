import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../core/auth/session.store';
import { Task, TaskStatus } from '../../core/models/domain.models';
import { TasksRepository } from '../../core/db/repositories/tasks.repository';
import { LocalNotificationService } from '../../core/notifications/local-notification.service';

@Injectable({
  providedIn: 'root',
})
export class TasksFacade {
  private readonly sessionStore = inject(SessionStore);
  private readonly repository = inject(TasksRepository);
  private readonly notificationService = inject(LocalNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tasksState = signal<Task[]>([]);
  readonly searchQuery = signal('');
  private readonly now = signal(Date.now());

  readonly tasks = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.tasksState();
    if (!query) return list;
    return list.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.description?.toLowerCase().includes(query)
    );
  });
  readonly todayTasks = computed(() => this.tasksState().filter((task) => task.status !== 'complete').slice(0, 5));
  readonly availableStatuses: TaskStatus[] = ['planning', 'in_flight', 'on_hold', 'in_review', 'complete'];
  readonly planningTasks = computed(() => this.tasksState().filter((task) => task.status === 'planning'));
  readonly inFlightTasks = computed(() => this.tasksState().filter((task) => task.status === 'in_flight'));
  readonly onHoldTasks = computed(() => this.tasksState().filter((task) => task.status === 'on_hold'));
  readonly inReviewTasks = computed(() => this.tasksState().filter((task) => task.status === 'in_review'));
  readonly completeTasks = computed(() => this.tasksState().filter((task) => task.status === 'complete'));

  constructor() {
    const timer = globalThis.setInterval(() => this.now.set(Date.now()), 60000);
    this.destroyRef.onDestroy(() => globalThis.clearInterval(timer));
  }

  async load(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      this.tasksState.set([]);
      return;
    }

    this.tasksState.set(await this.repository.list(userId));
  }

  tasksForProject(projectId: string): Task[] {
    this.now();
    return this.tasksState().filter((task) => task.project_id === projectId && !task.deleted_at);
  }

  async create(input: { title: string; due_at?: string | null; client_id?: string | null; project_id?: string | null; status?: TaskStatus }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.title.trim()) {
      return;
    }

    const task = await this.repository.create(userId, {
      title: input.title.trim(),
      due_at: input.due_at || null,
      client_id: input.client_id ?? null,
      project_id: input.project_id ?? null,
      status: input.status ?? 'planning',
    });

    if (task.due_at && task.status !== 'complete') {
      await this.notificationService.scheduleTask(task);
    }
    await this.load();
  }

  async update(taskId: string, input: { title: string; due_at?: string | null; client_id?: string | null; project_id?: string | null; status?: TaskStatus }): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId || !input.title.trim()) {
      return;
    }

    await this.repository.update(userId, taskId, {
      title: input.title.trim(),
      due_at: input.due_at || null,
      client_id: input.client_id ?? undefined,
      project_id: input.project_id ?? undefined,
      status: input.status,
      completed_at: input.status === 'complete' ? new Date().toISOString() : null,
    });

    const updated = await this.repository.get(userId, taskId);
    if (updated?.due_at && updated.status !== 'complete') {
      await this.notificationService.scheduleTask(updated);
    } else {
      await this.notificationService.cancelTask(taskId);
    }

    await this.load();
  }

  async setStatus(task: Task, status: TaskStatus): Promise<void> {
    await this.update(task.id, {
      title: task.title,
      due_at: task.due_at,
      client_id: task.client_id,
      project_id: task.project_id,
      status,
    });
  }

  taskStateLabel(task: Task): string {
    this.now();
    if (task.status === 'complete') {
      return 'complete';
    }

    if (!task.due_at) {
      return this.formatStatus(task.status);
    }

    const dueAt = new Date(task.due_at).getTime();
    if (Number.isNaN(dueAt)) {
      return this.formatStatus(task.status);
    }

    if (dueAt <= this.now()) {
      return 'overdue';
    }

    return this.formatStatus(task.status);
  }

  taskStateTone(task: Task): 'success' | 'warning' | 'danger' | 'neutral' {
    const label = this.taskStateLabel(task);
    if (label === 'complete') {
      return 'success';
    }
    if (label === 'overdue') {
      return 'danger';
    }
    if (task.status === 'in_review' || task.status === 'planning') {
      return 'warning';
    }
    return 'neutral';
  }

  formatStatus(status: TaskStatus): string {
    return status.replace(/_/g, ' ');
  }

  async remove(id: string): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      return;
    }

    await this.repository.softDelete(userId, id);
    await this.notificationService.cancelTask(id);
    await this.load();
  }
}
