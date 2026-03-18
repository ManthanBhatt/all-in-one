import { Injectable, computed, inject } from '@angular/core';

import { ClientsFacade } from '../clients/clients.facade';
import { InvoicesFacade } from '../invoices/invoices.facade';
import { NotesFacade } from '../notes/notes.facade';
import { ProjectsFacade } from '../projects/projects.facade';
import { RemindersFacade } from '../reminders/reminders.facade';
import { TasksFacade } from '../tasks/tasks.facade';

@Injectable({
  providedIn: 'root',
})
export class DashboardFacade {
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly projectsFacade = inject(ProjectsFacade);
  private readonly tasksFacade = inject(TasksFacade);
  private readonly notesFacade = inject(NotesFacade);
  private readonly remindersFacade = inject(RemindersFacade);
  private readonly invoicesFacade = inject(InvoicesFacade);

  readonly stats = computed(() => ({
    clients: this.clientsFacade.activeCount(),
    activeProjects: this.projectsFacade.activeProjects().length,
    todayTasks: this.tasksFacade.todayTasks().length,
    unpaidInvoices: this.invoicesFacade.unpaidInvoices().length,
  }));

  readonly tasks = this.tasksFacade.todayTasks;
  readonly notes = this.notesFacade.recentNotes;
  readonly reminders = this.remindersFacade.upcoming;

  async load(): Promise<void> {
    await Promise.all([
      this.clientsFacade.load(),
      this.projectsFacade.load(),
      this.tasksFacade.load(),
      this.notesFacade.load(),
      this.remindersFacade.load(),
      this.invoicesFacade.load(),
    ]);
  }
}
