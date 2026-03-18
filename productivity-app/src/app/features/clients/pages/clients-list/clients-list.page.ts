import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { ClientsFacade } from '../../clients.facade';
import { Client } from '../../../../core/models/domain.models';

@Component({
  selector: 'app-clients-list',
  templateUrl: './clients-list.page.html',
  styleUrls: ['./clients-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonModal, IonMenuButton, IonTitle, IonToolbar],
})
export class ClientsListPage implements OnInit {
  readonly facade = inject(ClientsFacade);
  readonly name = signal('');
  readonly company = signal('');
  readonly email = signal('');
  readonly editingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.facade.load();
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

  private resetForm(): void {
    this.editingId.set(null);
    this.name.set('');
    this.company.set('');
    this.email.set('');
  }
}
