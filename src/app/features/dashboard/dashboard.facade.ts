import { Injectable, computed, inject } from '@angular/core';

import { ClientsFacade } from '../clients/clients.facade';
import { InvoicesFacade } from '../invoices/invoices.facade';
import { NotesFacade } from '../notes/notes.facade';
import { ProjectsFacade } from '../projects/projects.facade';
import { RemindersFacade } from '../reminders/reminders.facade';
import { TasksFacade } from '../tasks/tasks.facade';
import { CountersFacade } from '../counters/counters.facade';

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
  private readonly countersFacade = inject(CountersFacade);

  readonly stats = computed(() => ({
    clients: this.clientsFacade.activeCount(),
    activeProjects: this.projectsFacade.activeProjects().length,
    todayTasks: this.tasksFacade.todayTasks().length,
    unpaidInvoices: this.invoicesFacade.unpaidInvoices().length,
  }));

  readonly tasks = this.tasksFacade.todayTasks;
  readonly notes = this.notesFacade.recentNotes;
  readonly pinnedNotes = this.notesFacade.pinnedNotes;
  
  readonly lastCounter = computed(() => {
    const list = this.countersFacade.counters();
    if (list.length === 0) return null;
    return [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  });
  
  readonly overdueReminders = computed(() => {
    const now = new Date();
    return this.remindersFacade.reminders().filter(r => 
      r.status === 'scheduled' && new Date(r.remind_at) < now
    );
  });

  readonly upcomingReminders = computed(() => {
    const now = new Date();
    return this.remindersFacade.reminders()
      .filter(r => r.status === 'scheduled' && new Date(r.remind_at) >= now)
      .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
      .slice(0, 5);
  });

  async load(): Promise<void> {
    await Promise.all([
      this.clientsFacade.load(),
      this.projectsFacade.load(),
      this.tasksFacade.load(),
      this.notesFacade.load(),
      this.remindersFacade.load(),
      this.invoicesFacade.load(),
      this.countersFacade.loadCounters(),
    ]);
  }
}
