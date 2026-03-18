import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import { SessionStore } from '../auth/session.store';

@Injectable({
  providedIn: 'root',
})
export class AppTitleService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly sessionStore = inject(SessionStore);
  private readonly section = signal('Workspace');

  constructor() {
    this.section.set(this.resolveSection(this.router.url));

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.section.set(this.resolveSection(event.urlAfterRedirects));
      }
    });

    effect(() => {
      const profile = this.sessionStore.session().profile;
      const section = this.section();
      const name = this.resolveName(profile?.full_name ?? '', profile?.email ?? '');
      const title = `${name} > ${section}`;
      const description = this.resolveDescription(section);
      const canonical = this.resolveCanonicalUrl();

      this.title.setTitle(title);
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ name: 'robots', content: 'index, follow' });
      this.meta.updateTag({ property: 'og:title', content: title });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ property: 'og:type', content: 'website' });
      this.meta.updateTag({ property: 'og:url', content: canonical });
      this.meta.updateTag({ name: 'twitter:title', content: title });
      this.meta.updateTag({ name: 'twitter:description', content: description });
      this.updateCanonical(canonical);
    });
  }

  private resolveSection(url: string): string {
    if (url.includes('/auth/login')) {
      return 'Login';
    }
    if (url.includes('/auth/register')) {
      return 'Register';
    }
    if (url.includes('/app/dashboard')) {
      return 'Dashboard';
    }
    if (url.includes('/app/clients')) {
      return 'Clients';
    }
    if (url.includes('/app/projects')) {
      return 'Projects';
    }
    if (url.includes('/app/tasks')) {
      return 'Tasks';
    }
    if (url.includes('/app/notes')) {
      return 'Notes';
    }
    if (url.includes('/app/reminders')) {
      return 'Reminders';
    }
    if (url.includes('/app/time')) {
      return 'Time';
    }
    if (url.includes('/app/invoices')) {
      return 'Invoices';
    }
    if (url.includes('/app/settings')) {
      return 'Settings';
    }
    return 'Workspace';
  }

  private resolveName(fullName: string, email: string): string {
    const trimmedName = fullName.trim();
    if (trimmedName) {
      return trimmedName;
    }

    const localPart = email.split('@')[0]?.trim();
    if (localPart) {
      return localPart;
    }

    return 'Freelancer OS';
  }

  private resolveDescription(section: string): string {
    switch (section) {
      case 'Login':
        return 'Sign in to your offline-first freelancer workspace for clients, tasks, reminders, invoices, and projects.';
      case 'Register':
        return 'Create your Freelancer OS account to manage clients, projects, tasks, reminders, time entries, and invoices.';
      case 'Dashboard':
        return 'View your freelance control center with active clients, projects, open tasks, reminders, and billing visibility.';
      case 'Clients':
        return 'Manage client accounts, billing context, and relationship history in your freelancer workspace.';
      case 'Projects':
        return 'Track project delivery, client-linked work, and recent project tasks in one place.';
      case 'Tasks':
        return 'Organize tasks by workflow stage, connect tasks to projects, and keep deadlines visible with notifications.';
      case 'Notes':
        return 'Capture notes, ideas, and working context for your freelance projects and clients.';
      case 'Reminders':
        return 'Schedule reminders and follow-ups with time-based notifications across web and mobile.';
      case 'Time':
        return 'Track work sessions and billable time for your freelance projects and clients.';
      case 'Invoices':
        return 'Create and manage invoices in your offline-first freelance billing workflow.';
      case 'Settings':
        return 'Control sync, account state, and workspace settings for Freelancer OS.';
      default:
        return 'Offline-first freelancer workspace for clients, projects, tasks, notes, reminders, time tracking, and invoices.';
    }
  }

  private resolveCanonicalUrl(): string {
    const origin = this.document.location?.origin ?? 'https://freelancer-os.app';
    const path = this.router.url || '/';
    return `${origin}${path}`;
  }

  private updateCanonical(url: string): void {
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }
}
