import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import {
  checkmarkCircleOutline,
  pulseOutline,
  refreshOutline,
  removeOutline,
  sparklesOutline,
  volumeMediumOutline,
  volumeMuteOutline,
} from 'ionicons/icons';

import { CountersFacade } from '../../counters.facade';

@Component({
  selector: 'app-counter-detail',
  templateUrl: './counter-detail.page.html',
  styleUrls: ['./counter-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonIcon,
    IonBackButton,
    IonProgressBar,
  ],
})
export class CounterDetailPage implements OnInit, OnDestroy {
  readonly facade = inject(CountersFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly alertCtrl = inject(AlertController);

  readonly removeIcon = removeOutline;
  readonly resetIcon = refreshOutline;
  readonly soundIcon = volumeMediumOutline;
  readonly muteIcon = volumeMuteOutline;
  readonly hapticIcon = pulseOutline;
  readonly celebrateIcon = sparklesOutline;
  readonly completeIcon = checkmarkCircleOutline;

  private autoIncrementTimer: ReturnType<typeof setInterval> | null = null;
  private holdDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private holdStarted = false;
  private celebrationTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isCelebrating = signal(false);
  readonly targetReached = computed(() => {
    const counter = this.facade.currentCounter();
    return !!counter?.target_value && counter.current_value >= counter.target_value;
  });

  readonly progress = computed(() => {
    const counter = this.facade.currentCounter();
    if (!counter || !counter.target_value) return 0;
    return Math.min(1, counter.current_value / counter.target_value);
  });

  readonly remaining = computed(() => {
    const counter = this.facade.currentCounter();
    if (!counter?.target_value) return null;
    return Math.max(0, counter.target_value - counter.current_value);
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    await this.facade.selectCounter(id);
  }

  async ngOnDestroy(): Promise<void> {
    this.stopPressFlow();
    this.clearCelebration();
    await this.facade.persistToSync();
  }

  async increment(): Promise<void> {
    const before = this.facade.currentCounter();
    await this.facade.increment();
    this.maybeCelebrate(before?.current_value ?? 0);
  }

  async decrement(event?: Event): Promise<void> {
    event?.stopPropagation();
    this.clearCelebration();
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
            this.clearCelebration();
            void this.facade.reset();
          },
        },
      ],
    });
    await alert.present();
  }

  toggleSound(): void {
    this.facade.soundEnabled.set(!this.facade.soundEnabled());
  }

  toggleHaptics(): void {
    this.facade.hapticsEnabled.set(!this.facade.hapticsEnabled());
  }

  beginPress(event: Event): void {
    event.preventDefault();
    this.stopPressFlow(false);
    this.holdStarted = false;
    this.holdDelayTimer = setTimeout(() => {
      this.holdStarted = true;
      void this.increment();
      this.autoIncrementTimer = setInterval(() => {
        void this.increment();
      }, 140);
    }, 240);
  }

  async endPress(event?: Event): Promise<void> {
    event?.preventDefault();
    const usedHold = this.holdStarted;
    this.stopPressFlow(false);
    if (!usedHold) {
      await this.increment();
    }
  }

  cancelPress(event?: Event): void {
    event?.preventDefault();
    this.stopPressFlow(false);
  }

  private stopPressFlow(resetHoldState = true): void {
    if (this.holdDelayTimer) {
      clearTimeout(this.holdDelayTimer);
      this.holdDelayTimer = null;
    }
    if (this.autoIncrementTimer) {
      clearInterval(this.autoIncrementTimer);
      this.autoIncrementTimer = null;
    }
    if (resetHoldState) {
      this.holdStarted = false;
    }
  }

  private maybeCelebrate(previousValue: number): void {
    const counter = this.facade.currentCounter();
    if (!counter?.target_value) {
      return;
    }

    if (previousValue < counter.target_value && counter.current_value >= counter.target_value) {
      this.triggerConfetti();
    }
  }

  private triggerConfetti(): void {
    this.clearCelebration();
    this.isCelebrating.set(true);

    const colors = ['#ffffff', '#6ee7b7', '#a78bfa', '#f9a8d4', '#facc15'];
    const container = document.body;

    for (let i = 0; i < 70; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-particle';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.top = '-12px';
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      confetti.style.opacity = String(0.75 + Math.random() * 0.25);

      const duration = 2.2 + Math.random() * 1.8;
      confetti.style.animation = `confetti-fall ${duration}s linear forwards`;

      container.appendChild(confetti);
      setTimeout(() => confetti.remove(), duration * 1000);
    }

    this.celebrationTimer = setTimeout(() => {
      this.isCelebrating.set(false);
      this.celebrationTimer = null;
    }, 4200);
  }

  private clearCelebration(): void {
    this.isCelebrating.set(false);
    if (this.celebrationTimer) {
      clearTimeout(this.celebrationTimer);
      this.celebrationTimer = null;
    }
  }
}



