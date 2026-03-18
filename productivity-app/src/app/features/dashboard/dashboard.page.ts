import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';

import { DashboardFacade } from './dashboard.facade';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar],
})
export class DashboardPage implements OnInit {
  readonly facade = inject(DashboardFacade);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
  }
}
