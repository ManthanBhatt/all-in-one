import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { featureGuard } from './core/auth/feature.guard';
import { AppShellComponent } from './shared/components/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
        canActivate: [featureGuard('dashboard')],
      },
      {
        path: 'clients',
        loadComponent: () => import('./features/clients/pages/clients-list/clients-list.page').then((m) => m.ClientsListPage),
        canActivate: [featureGuard('clients')],
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/pages/projects-list/projects-list.page').then((m) => m.ProjectsListPage),
        canActivate: [featureGuard('projects')],
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/pages/tasks-list/tasks-list.page').then((m) => m.TasksListPage),
        canActivate: [featureGuard('tasks')],
      },
      {
        path: 'notes',
        loadComponent: () => import('./features/notes/pages/notes-list/notes-list.page').then((m) => m.NotesListPage),
        canActivate: [featureGuard('notes')],
      },
      {
        path: 'reminders',
        loadComponent: () => import('./features/reminders/pages/reminders-list/reminders-list.page').then((m) => m.RemindersListPage),
        canActivate: [featureGuard('reminders')],
      },
      {
        path: 'time',
        loadComponent: () => import('./features/time/pages/time-list/time-list.page').then((m) => m.TimeListPage),
        canActivate: [featureGuard('time')],
      },
      {
        path: 'invoices',
        loadComponent: () => import('./features/invoices/pages/invoices-list/invoices-list.page').then((m) => m.InvoicesListPage),
        canActivate: [featureGuard('invoices')],
      },
      {
        path: 'counters',
        loadComponent: () => import('./features/counters/pages/counters-list/counters-list.page').then((m) => m.CountersListPage),
        canActivate: [featureGuard('counters')],
      },
      {
        path: 'counters/:id',
        loadComponent: () => import('./features/counters/pages/counter-detail/counter-detail.page').then((m) => m.CounterDetailPage),
        canActivate: [featureGuard('counters')],
      },
      {
        path: 'ai-assistant',
        loadComponent: () => import('./features/ai-assistant/ai-assistant.page').then((m) => m.AIAssistantPage),
        canActivate: [featureGuard('ai-assistant')],
      },
      {
        path: 'ai-models',
        loadComponent: () => import('./features/ai-models/models.page').then((m) => m.AIModelsPage),
        canActivate: [featureGuard('ai-models')],
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/pages/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: 'app/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'app/dashboard',
  },
];
