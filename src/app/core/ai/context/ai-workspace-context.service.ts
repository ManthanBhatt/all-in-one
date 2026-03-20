import { Injectable, inject } from '@angular/core';

import { SessionStore } from '../../auth/session.store';
import { Client, Invoice, Project, Reminder, Task } from '../../models/domain.models';
import { ClientsRepository } from '../../db/repositories/clients.repository';
import { CountersRepository } from '../../db/repositories/counters.repository';
import { InvoicesRepository } from '../../db/repositories/invoices.repository';
import { NotesRepository } from '../../db/repositories/notes.repository';
import { ProjectsRepository } from '../../db/repositories/projects.repository';
import { RemindersRepository } from '../../db/repositories/reminders.repository';
import { TasksRepository } from '../../db/repositories/tasks.repository';
import { TimeEntriesRepository } from '../../db/repositories/time-entries.repository';

@Injectable({
  providedIn: 'root'
})
export class AIWorkspaceContextService {
  private readonly sessionStore = inject(SessionStore);
  private readonly clientsRepository = inject(ClientsRepository);
  private readonly projectsRepository = inject(ProjectsRepository);
  private readonly tasksRepository = inject(TasksRepository);
  private readonly notesRepository = inject(NotesRepository);
  private readonly remindersRepository = inject(RemindersRepository);
  private readonly invoicesRepository = inject(InvoicesRepository);
  private readonly countersRepository = inject(CountersRepository);
  private readonly timeEntriesRepository = inject(TimeEntriesRepository);

  async buildContextSummary(): Promise<string> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      return 'No authenticated workspace context.';
    }

    const [clients, projects, tasks, notes, reminders, invoices, counters, timeEntries] = await Promise.all([
      this.clientsRepository.list(userId),
      this.projectsRepository.list(userId),
      this.tasksRepository.list(userId),
      this.notesRepository.list(userId),
      this.remindersRepository.list(userId),
      this.invoicesRepository.list(userId),
      this.countersRepository.list(userId),
      this.timeEntriesRepository.list(userId),
    ]);

    const now = new Date();
    const todayKey = this.toDayKey(now);
    const activeProjects = projects.filter((project) => project.status === 'active' || project.status === 'planning');
    const openTasks = tasks.filter((task) => task.status !== 'complete');
    const todayTasks = openTasks.filter((task) => this.toDayKey(task.due_at) === todayKey);
    const overdueTasks = openTasks.filter((task) => this.isPast(task.due_at, now));
    const scheduledReminders = reminders.filter((reminder) => reminder.status !== 'completed');
    const todayReminders = scheduledReminders.filter((reminder) => this.toDayKey(reminder.remind_at) === todayKey);
    const dueReminders = scheduledReminders.filter((reminder) => this.isPast(reminder.remind_at, now));
    const upcomingProjects = activeProjects.filter((project) => this.isWithinDays(project.due_date, 3, now));
    const unpaidInvoices = invoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled');
    const overdueInvoices = unpaidInvoices.filter((invoice) => this.isPast(invoice.due_date, now));
    const forgettingSignals = this.buildForgettingSignals(overdueTasks, dueReminders, upcomingProjects, overdueInvoices);

    const lines = [
      `Today: ${todayKey}`,
      `Clients: ${clients.length}`,
      `Projects: ${projects.length} total, ${activeProjects.length} ongoing`,
      `Ongoing projects: ${this.describeProjects(activeProjects, clients)}`,
      `Projects due soon: ${this.describeProjects(upcomingProjects, clients)}`,
      `Tasks: ${tasks.length} total, ${openTasks.length} open`,
      `Today tasks: ${this.describeTasks(todayTasks, projects, clients)}`,
      `Overdue tasks: ${this.describeTasks(overdueTasks, projects, clients)}`,
      `Reminders: ${reminders.length} total, ${scheduledReminders.length} scheduled`,
      `Today reminders: ${this.describeReminders(todayReminders)}`,
      `Due reminders: ${this.describeReminders(dueReminders)}`,
      `Invoices: ${invoices.length} total, ${unpaidInvoices.length} unpaid`,
      `Overdue invoices: ${this.describeInvoices(overdueInvoices, clients)}`,
      `Notes: ${notes.length}`,
      `Counters: ${this.takeTitles(counters.map((item) => `${item.name}=${item.current_value}`))}`,
      `Time entries: ${timeEntries.length}`,
      `Recent clients: ${this.takeTitles(clients.map((item) => item.name))}`,
      `Recent projects: ${this.takeTitles(activeProjects.map((item) => item.name))}`,
      `Open tasks: ${this.takeTitles(openTasks.map((item) => item.title))}`,
      `Upcoming reminders: ${this.takeTitles(scheduledReminders.map((item) => item.title))}`,
      `Unpaid invoices: ${this.takeTitles(unpaidInvoices.map((item) => item.invoice_number))}`,
      `Forgetting signals: ${forgettingSignals}`,
    ];

    return lines.join('\n');
  }

  private buildForgettingSignals(
    overdueTasks: Task[],
    dueReminders: Reminder[],
    upcomingProjects: Project[],
    overdueInvoices: Invoice[],
  ): string {
    const signals: string[] = [];

    if (overdueTasks.length > 0) {
      signals.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`);
    }
    if (dueReminders.length > 0) {
      signals.push(`${dueReminders.length} reminder${dueReminders.length > 1 ? 's are' : ' is'} due`);
    }
    if (upcomingProjects.length > 0) {
      signals.push(`${upcomingProjects.length} project deadline${upcomingProjects.length > 1 ? 's' : ''} within 3 days`);
    }
    if (overdueInvoices.length > 0) {
      signals.push(`${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''}`);
    }

    return signals.length > 0 ? signals.join(', ') : 'nothing urgent detected';
  }

  private describeProjects(projects: Project[], clients: Client[]): string {
    return this.describeList(projects, (project) => {
      const clientName = clients.find((client) => client.id === project.client_id)?.name;
      const dueText = project.due_date ? `, due ${this.toDayKey(project.due_date)}` : '';
      return clientName
        ? `${project.name} (${project.status}, ${clientName}${dueText})`
        : `${project.name} (${project.status}${dueText})`;
    });
  }

  private describeTasks(tasks: Task[], projects: Project[], clients: Client[]): string {
    return this.describeList(tasks, (task) => {
      const projectName = projects.find((project) => project.id === task.project_id)?.name;
      const clientName = clients.find((client) => client.id === task.client_id)?.name;
      const parts = [task.title];
      if (projectName) {
        parts.push(`project ${projectName}`);
      }
      if (clientName) {
        parts.push(`client ${clientName}`);
      }
      if (task.due_at) {
        parts.push(`due ${this.formatDateTime(task.due_at)}`);
      }
      return parts.join(' - ');
    });
  }

  private describeReminders(reminders: Reminder[]): string {
    return this.describeList(reminders, (reminder) => `${reminder.title} (${this.formatDateTime(reminder.remind_at)})`);
  }

  private describeInvoices(invoices: Invoice[], clients: Client[]): string {
    return this.describeList(invoices, (invoice) => {
      const clientName = clients.find((client) => client.id === invoice.client_id)?.name;
      return clientName
        ? `${invoice.invoice_number} (${clientName}, due ${this.toDayKey(invoice.due_date)})`
        : `${invoice.invoice_number} (due ${this.toDayKey(invoice.due_date)})`;
    });
  }

  private describeList<T>(values: T[], formatter: (value: T) => string): string {
    const normalized = values.filter(Boolean).slice(0, 7).map(formatter);
    return normalized.length > 0 ? normalized.join(', ') : 'none';
  }

  private takeTitles(values: string[]): string {
    const normalized = values.filter(Boolean).slice(0, 5);
    return normalized.length > 0 ? normalized.join(', ') : 'none';
  }

  private isPast(value: string | null, now: Date): boolean {
    if (!value) {
      return false;
    }

    const timestamp = new Date(value).getTime();
    return !Number.isNaN(timestamp) && timestamp <= now.getTime();
  }

  private isWithinDays(value: string | null, days: number, now: Date): boolean {
    if (!value) {
      return false;
    }

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp) || timestamp < now.getTime()) {
      return false;
    }

    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).getTime();
    return timestamp <= threshold;
  }

  private toDayKey(value: string | Date | null): string {
    if (!value) {
      return 'none';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'none';
    }

    return date.toISOString().slice(0, 10);
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
