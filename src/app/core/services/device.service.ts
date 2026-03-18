import { Injectable, signal } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private readonly id = signal(`device-${uuidv4()}`);

  deviceId(): string {
    return this.id();
  }
}
