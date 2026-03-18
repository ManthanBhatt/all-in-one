import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonMenu,
  IonRouterOutlet,
  IonSplitPane,
  IonTitle,
  IonToolbar,
  MenuController
} from '@ionic/angular/standalone';
import {
  albumsOutline,
  alertCircleOutline,
  checkboxOutline,
  clipboardOutline,
  cloudOfflineOutline,
  gridOutline,
  homeOutline,
  notificationsOutline,
  peopleOutline,
  refreshOutline,
  settingsOutline,
  timeOutline,
  cloudDoneOutline,
} from 'ionicons/icons';

import { SyncService } from '../../../core/sync/sync.service';
import { OfflineBannerComponent } from '../offline-banner/offline-banner.component';

@Component({
  selector: 'app-app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  standalone: true,
  imports: [
    NgFor,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenu,
    IonRouterOutlet,
    IonSplitPane,
    IonTitle,
    IonToolbar,
    OfflineBannerComponent,
  ],
})
export class AppShellComponent {
  private readonly syncService = inject(SyncService);

  readonly indicatorState = this.syncService.indicatorState;
  readonly indicatorLabel = this.syncService.indicatorLabel;
  readonly syncIcons = {
    idle: refreshOutline,
    syncing: refreshOutline,
    synced: cloudDoneOutline,
    offline: cloudOfflineOutline,
    error: alertCircleOutline,
  };

  readonly navigation = [
    { title: 'Dashboard', subtitle: 'Daily command center', path: '/app/dashboard', icon: homeOutline },
    { title: 'Clients', subtitle: 'Accounts and billing context', path: '/app/clients', icon: peopleOutline },
    { title: 'Projects', subtitle: 'Delivery pipeline', path: '/app/projects', icon: gridOutline },
    { title: 'Tasks', subtitle: 'Execution board', path: '/app/tasks', icon: checkboxOutline },
    { title: 'Notes', subtitle: 'Captured context', path: '/app/notes', icon: albumsOutline },
    { title: 'Reminders', subtitle: 'Follow-ups and deadlines', path: '/app/reminders', icon: notificationsOutline },
    { title: 'Time', subtitle: 'Tracked work', path: '/app/time', icon: timeOutline },
    { title: 'Invoices', subtitle: 'Billing control', path: '/app/invoices', icon: clipboardOutline },
    { title: 'Settings', subtitle: 'Account and sync', path: '/app/settings', icon: settingsOutline },
  ];

  constructor(private menuCtrl: MenuController) { }

  protected closeMenu() {
    this.menuCtrl.toggle();
  }
}
