import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
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
      },
      {
        path: 'clients',
        loadComponent: () => import('./features/clients/pages/clients-list/clients-list.page').then((m) => m.ClientsListPage),
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/pages/projects-list/projects-list.page').then((m) => m.ProjectsListPage),
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/pages/tasks-list/tasks-list.page').then((m) => m.TasksListPage),
      },
      {
        path: 'notes',
        loadComponent: () => import('./features/notes/pages/notes-list/notes-list.page').then((m) => m.NotesListPage),
      },
      {
        path: 'reminders',
        loadComponent: () => import('./features/reminders/pages/reminders-list/reminders-list.page').then((m) => m.RemindersListPage),
      },
      {
        path: 'time',
        loadComponent: () => import('./features/time/pages/time-list/time-list.page').then((m) => m.TimeListPage),
      },
      {
        path: 'invoices',
        loadComponent: () => import('./features/invoices/pages/invoices-list/invoices-list.page').then((m) => m.InvoicesListPage),
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
