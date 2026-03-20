import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSearchbar } from '@ionic/angular/standalone';

import { ClientsFacade } from '../../clients.facade';
import { addOutline, createOutline, trashOutline } from 'ionicons/icons';

import { Client } from '../../../../core/models/domain.models';

@Component({
  selector: 'app-clients-list',
  templateUrl: './clients-list.page.html',
  styleUrls: ['./clients-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonMenuButton, IonTitle, IonToolbar, IonSearchbar],
})
export class ClientsListPage implements OnInit {
  readonly facade = inject(ClientsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly addIcon = addOutline;
  readonly editIcon = createOutline;
  readonly deleteIcon = trashOutline;
  readonly name = signal('');
  readonly company = signal('');
  readonly email = signal('');
  readonly editingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    this.route.queryParamMap.subscribe((params) => {
      void this.handleRouteIntent(params.get('focus'), params.get('edit') === '1');
    });
  }

  openCreate(): void {
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openEdit(client: Client): void {
    this.editingId.set(client.id);
    this.name.set(client.name);
    this.company.set(client.company_name ?? '');
    this.email.set(client.email ?? '');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  async save(): Promise<void> {
    const editingId = this.editingId();
    if (editingId) {
      await this.facade.update(editingId, { name: this.name(), company_name: this.company(), email: this.email() });
    } else {
      await this.facade.create({ name: this.name(), company_name: this.company(), email: this.email() });
    }

    this.closeModal();
  }

  private async handleRouteIntent(focusId: string | null, shouldEdit: boolean): Promise<void> {
    if (!focusId) {
      return;
    }

    const client = this.facade.clients().find((item) => item.id === focusId);
    if (client && shouldEdit) {
      this.openEdit(client);
    }

    await this.clearRouteIntent();
  }

  private async clearRouteIntent(): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { focus: null, edit: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.name.set('');
    this.company.set('');
    this.email.set('');
  }
}

