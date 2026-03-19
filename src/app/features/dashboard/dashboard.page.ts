import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonTitle,
  IonToolbar,
  IonIcon,
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { pin, alertCircle, calendar } from 'ionicons/icons';

import { DashboardFacade } from './dashboard.facade';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar, IonIcon],
})
export class DashboardPage implements OnInit {
  readonly facade = inject(DashboardFacade);
  readonly pinIcon = pin;
  readonly alertIcon = alertCircle;
  readonly calendarIcon = calendar;

  async ngOnInit(): Promise<void> {
    await this.facade.load();
  }
}
