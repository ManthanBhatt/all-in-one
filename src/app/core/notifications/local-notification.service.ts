import { Injectable } from '@angular/core';
import { Capacitor, PermissionState } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { Reminder, Task } from '../models/domain.models';

@Injectable({
  providedIn: 'root',
})
export class LocalNotificationService {
  private readonly webTimers = new Map<string, number>();
  private channelReady = false;

  async scheduleReminder(reminder: Reminder): Promise<void> {
    await this.scheduleAt({
      key: `reminder:${reminder.id}`,
      title: reminder.title,
      body: 'Reminder from Freelancer OS',
      atIso: reminder.remind_at,
      nativeId: this.notificationId(`reminder:${reminder.id}`),
      extra: { reminderId: reminder.id, type: 'reminder' },
    });
  }

  async cancelReminder(reminderId: string): Promise<void> {
    await this.cancelScheduled(`reminder:${reminderId}`);
  }

  async scheduleTask(task: Task): Promise<void> {
    if (!task.due_at || task.status === 'complete') {
      await this.cancelTask(task.id);
      return;
    }

    await this.scheduleAt({
      key: `task:${task.id}`,
      title: task.title,
      body: 'Task due now in Freelancer OS',
      atIso: task.due_at,
      nativeId: this.notificationId(`task:${task.id}`),
      extra: { taskId: task.id, type: 'task' },
    });
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.cancelScheduled(`task:${taskId}`);
  }

  async getPermissionState(): Promise<PermissionState> {
    if (Capacitor.isNativePlatform()) {
      const permissions = await LocalNotifications.checkPermissions();
      return permissions.display;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    return this.toPermissionState(Notification.permission);
  }

  async requestPermission(): Promise<PermissionState> {
    if (Capacitor.isNativePlatform()) {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === 'granted') {
        await this.prepareNativeNotifications();
        return current.display;
      }

      const requested = await LocalNotifications.requestPermissions();
      if (requested.display === 'granted') {
        await this.prepareNativeNotifications();
      }
      return requested.display;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    return this.toPermissionState(permission);
  }

  async requestExactAlarmPermission(): Promise<PermissionState> {
    if (!Capacitor.isNativePlatform()) {
      return 'granted';
    }

    const current = await LocalNotifications.checkExactNotificationSetting();
    if (current.exact_alarm === 'granted') {
      return current.exact_alarm;
    }

    const changed = await LocalNotifications.changeExactNotificationSetting();
    return changed.exact_alarm;
  }

  private async scheduleAt(input: {
    key: string;
    title: string;
    body: string;
    atIso: string;
    nativeId: number;
    extra: Record<string, unknown>;
  }): Promise<void> {
    const scheduledAt = new Date(input.atIso);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      return;
    }

    await this.cancelScheduled(input.key, input.nativeId);

    if (Capacitor.isNativePlatform()) {
      try {
        const display = await this.requestPermission();
        if (display !== 'granted') {
          return;
        }

        await this.prepareNativeNotifications();
        await LocalNotifications.schedule({
          notifications: [
            {
              id: input.nativeId,
              title: input.title,
              body: input.body,
              schedule: { at: scheduledAt, allowWhileIdle: true },
              channelId: 'freelancer-os-reminders',
              extra: input.extra,
            },
          ],
        });
        return;
      } catch {
        return;
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    if (permission !== 'granted') {
      return;
    }

    const delay = scheduledAt.getTime() - Date.now();
    const timerId = window.setTimeout(() => {
      new Notification(input.title, {
        body: input.body,
        tag: input.key,
      });
      this.webTimers.delete(input.key);
    }, delay);

    this.webTimers.set(input.key, timerId);
  }

  private async cancelScheduled(key: string, nativeId?: number): Promise<void> {
    const timerId = this.webTimers.get(key);
    if (timerId !== undefined && typeof window !== 'undefined') {
      window.clearTimeout(timerId);
      this.webTimers.delete(key);
    }

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: nativeId ?? this.notificationId(key) }],
      });
    } catch {
      return;
    }
  }

  private notificationId(id: string): number {
    return id
      .split('')
      .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0) >>> 0;
  }

  private toPermissionState(permission: NotificationPermission): PermissionState {
    switch (permission) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      default:
        return 'prompt';
    }
  }

  private async prepareNativeNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.channelReady) {
      return;
    }

    try {
      await LocalNotifications.createChannel({
        id: 'freelancer-os-reminders',
        name: 'Freelancer OS reminders',
        description: 'Task and reminder alerts',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#FF7A59',
      });
    } catch {
      // Channel may already exist.
    }

    this.channelReady = true;
  }
}
