import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Injectable({
  providedIn: 'root',
})
export class HapticsService {
  async impact(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
    await Haptics.impact({ style });
  }

  async vibrate(): Promise<void> {
    await Haptics.vibrate();
  }
}
