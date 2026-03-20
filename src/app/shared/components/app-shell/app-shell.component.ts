import { Component, computed, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonRouterOutlet,
  IonSearchbar,
  IonSplitPane,
  IonTitle,
  IonToolbar,
  MenuController,
} from '@ionic/angular/standalone';
import {
  albumsOutline,
  alertCircleOutline,
  checkboxOutline,
  clipboardOutline,
  cloudDoneOutline,
  cloudOfflineOutline,
  fingerPrintOutline,
  gridOutline,
  hardwareChipOutline,
  homeOutline,
  notificationsOutline,
  peopleOutline,
  refreshOutline,
  settingsOutline,
  sparklesOutline,
  timeOutline,
} from 'ionicons/icons';

import { SessionStore } from '../../../core/auth/session.store';
import { GlobalSearchService } from '../../../core/services/search.service';
import { SyncService } from '../../../core/sync/sync.service';
import { OfflineBannerComponent } from '../offline-banner/offline-banner.component';

@Component({
  selector: 'app-app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonRouterOutlet,
    IonSearchbar,
    IonSplitPane,
    IonTitle,
    IonToolbar,
    OfflineBannerComponent,
  ],
})
export class AppShellComponent {
  private readonly syncService = inject(SyncService);
  private readonly sessionStore = inject(SessionStore);
  protected readonly searchService = inject(GlobalSearchService);

  readonly indicatorState = this.syncService.indicatorState;
  readonly indicatorLabel = this.syncService.indicatorLabel;
  readonly syncIcons = {
    idle: refreshOutline,
    syncing: refreshOutline,
    synced: cloudDoneOutline,
    offline: cloudOfflineOutline,
    error: alertCircleOutline,
  };

  private readonly navigationItems = [
    { title: 'Dashboard', subtitle: 'Daily command center', path: '/app/dashboard', icon: homeOutline, feature: 'dashboard' },
    { title: 'Clients', subtitle: 'Accounts and billing context', path: '/app/clients', icon: peopleOutline, feature: 'clients' },
    { title: 'Projects', subtitle: 'Delivery pipeline', path: '/app/projects', icon: gridOutline, feature: 'projects' },
    { title: 'Tasks', subtitle: 'Execution board', path: '/app/tasks', icon: checkboxOutline, feature: 'tasks' },
    { title: 'Notes', subtitle: 'Captured context', path: '/app/notes', icon: albumsOutline, feature: 'notes' },
    { title: 'Reminders', subtitle: 'Follow-ups and deadlines', path: '/app/reminders', icon: notificationsOutline, feature: 'reminders' },
    { title: 'Time', subtitle: 'Tracked work', path: '/app/time', icon: timeOutline, feature: 'time' },
    { title: 'Invoices', subtitle: 'Billing control', path: '/app/invoices', icon: clipboardOutline, feature: 'invoices' },
    { title: 'Counters', subtitle: 'Ultra-fast counting', path: '/app/counters', icon: fingerPrintOutline, feature: 'counters' },
    { title: 'AI Assistant', subtitle: 'Workflow copilot', path: '/app/ai-assistant', icon: sparklesOutline, feature: 'ai-assistant' },
    { title: 'AI Models', subtitle: 'Local model hub', path: '/app/ai-models', icon: hardwareChipOutline, feature: 'ai-models' },
    { title: 'Settings', subtitle: 'Account and sync', path: '/app/settings', icon: settingsOutline },
  ];

  readonly navigation = computed(() => {
    const enabledFeatures = this.sessionStore.session().profile?.enabled_features ?? [];
    return this.navigationItems.filter((item) => !item.feature || enabledFeatures.includes(item.feature));
  });

  constructor(private menuCtrl: MenuController) {}

  protected closeMenu(): void {
    void this.menuCtrl.toggle();
  }
}
