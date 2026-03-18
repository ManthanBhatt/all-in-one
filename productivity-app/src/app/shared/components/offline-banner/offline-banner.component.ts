import { Component, computed, inject } from '@angular/core';
import { IonBadge } from '@ionic/angular/standalone';

import { ConnectivityService } from '../../../core/sync/connectivity.service';

@Component({
  selector: 'app-offline-banner',
  templateUrl: './offline-banner.component.html',
  styleUrls: ['./offline-banner.component.scss'],
  standalone: true,
  imports: [IonBadge],
})
export class OfflineBannerComponent {
  private readonly connectivityService = inject(ConnectivityService);

  readonly label = computed(() => (this.connectivityService.isOnline() ? 'Online' : 'Offline'));
  readonly tone = computed(() => (this.connectivityService.isOnline() ? 'success' : 'warning'));
}
