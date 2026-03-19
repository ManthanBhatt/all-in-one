import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

import { ClientsFacade } from '../../features/clients/clients.facade';
import { ProjectsFacade } from '../../features/projects/projects.facade';
import { TasksFacade } from '../../features/tasks/tasks.facade';
import { NotesFacade } from '../../features/notes/notes.facade';
import { RemindersFacade } from '../../features/reminders/reminders.facade';
import { InvoicesFacade } from '../../features/invoices/invoices.facade';
import { CountersFacade } from '../../features/counters/counters.facade';

export interface SearchResult {
  id: string;
  type: 'client' | 'project' | 'task' | 'note' | 'reminder' | 'invoice' | 'counter';
  title: string;
  subtitle?: string;
  route: string[];
}

@Injectable({
  providedIn: 'root',
})
export class GlobalSearchService {
  private readonly clients = inject(ClientsFacade);
  private readonly projects = inject(ProjectsFacade);
  private readonly tasks = inject(TasksFacade);
  private readonly notes = inject(NotesFacade);
  private readonly reminders = inject(RemindersFacade);
  private readonly invoices = inject(InvoicesFacade);
  private readonly counters = inject(CountersFacade);
  private readonly router = inject(Router);

  readonly query = signal('');

  readonly results = computed<SearchResult[]>(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return [];

    const results: SearchResult[] = [];

    // Search Clients
    this.clients.clients().forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.company_name?.toLowerCase().includes(q)) {
        results.push({ id: c.id, type: 'client', title: c.name, subtitle: c.company_name ?? 'Client', route: ['/app/clients'] });
      }
    });

    // Search Projects
    this.projects.projects().forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
        results.push({ id: p.id, type: 'project', title: p.name, subtitle: 'Project', route: ['/app/projects'] });
      }
    });

    // Search Tasks
    this.tasks.tasks().forEach(t => {
      if (t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
        results.push({ id: t.id, type: 'task', title: t.title, subtitle: 'Task', route: ['/app/tasks'] });
      }
    });

    // Search Notes
    this.notes.notes().forEach(n => {
      if (n.title?.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) {
        results.push({ id: n.id, type: 'note', title: n.title || 'Note', subtitle: n.body.substring(0, 30) + '...', route: ['/app/notes'] });
      }
    });

    // Search Reminders
    this.reminders.reminders().forEach(r => {
      if (r.title.toLowerCase().includes(q)) {
        results.push({ id: r.id, type: 'reminder', title: r.title, subtitle: 'Reminder', route: ['/app/reminders'] });
      }
    });

    // Search Invoices
    this.invoices.invoices().forEach(i => {
      if (i.invoice_number.toLowerCase().includes(q)) {
        results.push({ id: i.id, type: 'invoice', title: i.invoice_number, subtitle: 'Invoice', route: ['/app/invoices'] });
      }
    });

    // Search Counters
    this.counters.counters().forEach(c => {
      if (c.name.toLowerCase().includes(q)) {
        results.push({ id: c.id, type: 'counter', title: c.name, subtitle: `Value: ${c.current_value}`, route: ['/app/counters', c.id] });
      }
    });

    return results.slice(0, 10); // Limit to top 10 results
  });

  async navigateTo(result: SearchResult) {
    this.query.set('');
    await this.router.navigate(result.route);
  }
}
