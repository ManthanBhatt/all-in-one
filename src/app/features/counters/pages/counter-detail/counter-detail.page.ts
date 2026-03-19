import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonBackButton,
  IonFab,
  IonFabButton,
  AlertController,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { 
  addOutline, 
  removeOutline, 
  refreshOutline, 
  volumeMediumOutline, 
  volumeMuteOutline,
  pulseOutline,
} from 'ionicons/icons';

import { CountersFacade } from '../../counters.facade';

@Component({
  selector: 'app-counter-detail',
  templateUrl: './counter-detail.page.html',
  styleUrls: ['./counter-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonTitle,
    IonToolbar,
    IonIcon,
    IonBackButton,
    IonFab,
    IonFabButton,
    IonProgressBar,
  ],
})
export class CounterDetailPage implements OnInit, OnDestroy {
  readonly facade = inject(CountersFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly alertCtrl = inject(AlertController);

  readonly addIcon = addOutline;
  readonly removeIcon = removeOutline;
  readonly resetIcon = refreshOutline;
  readonly soundIcon = volumeMediumOutline;
  readonly muteIcon = volumeMuteOutline;
  readonly hapticIcon = pulseOutline;

  private autoIncrementTimer: any = null;

  readonly progress = computed(() => {
    const counter = this.facade.currentCounter();
    if (!counter || !counter.target_value) return 0;
    return Math.min(1, counter.current_value / counter.target_value);
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    await this.facade.selectCounter(id);
  }

  async ngOnDestroy(): Promise<void> {
    this.stopAutoIncrement();
    await this.facade.persistToSync();
  }

  async increment(event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const counter = this.facade.currentCounter();
    await this.facade.increment();
    
    if (counter?.target_value && this.facade.currentCounter()?.current_value === counter.target_value) {
      this.triggerConfetti();
    }
  }

  async decrement(event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    await this.facade.decrement();
  }

  async confirmReset(event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Reset Counter',
      message: 'Are you sure you want to reset this counter to zero?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Reset', 
          role: 'destructive',
          handler: () => {
            void this.facade.reset();
          }
        }
      ]
    });
    await alert.present();
  }

  toggleSound(): void {
    this.facade.soundEnabled.set(!this.facade.soundEnabled());
  }

  toggleHaptics(): void {
    this.facade.hapticsEnabled.set(!this.facade.hapticsEnabled());
  }

  startAutoIncrement(): void {
    this.stopAutoIncrement();
    this.autoIncrementTimer = setInterval(() => {
      void this.increment();
    }, 150);
  }

  stopAutoIncrement(): void {
    if (this.autoIncrementTimer) {
      clearInterval(this.autoIncrementTimer);
      this.autoIncrementTimer = null;
    }
  }

  private triggerConfetti(): void {
    const colors = ['#4fd1b5', '#c7f36b', '#f1c75b', '#ff7a59', '#38c27d'];
    const container = document.body;

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-particle';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.top = '-10px';
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      const duration = 2 + Math.random() * 3;
      confetti.style.animation = `confetti-fall ${duration}s linear forwards`;
      
      container.appendChild(confetti);
      
      setTimeout(() => {
        confetti.remove();
      }, duration * 1000);
    }
  }
}
