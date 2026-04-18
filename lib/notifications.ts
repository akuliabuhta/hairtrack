/**
 * Local procedure-reminder notifications.
 *
 * Web has no notifications API for Expo — we early-return everywhere so
 * the app still works in the browser preview.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Procedure } from './types';

let configured = false;

async function configure() {
  if (configured || Platform.OS === 'web') return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('procedures', {
      name: 'Напоминания о процедурах',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await configure();
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function buildTrigger(timeHHMM: string): Notifications.NotificationTriggerInput | null {
  const [h, m] = timeHHMM.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: h,
    minute: m,
  } as Notifications.DailyTriggerInput;
}

/**
 * Replace all scheduled notifications for a single procedure.
 * Returns the array of new identifiers so the caller can persist them.
 */
export async function rescheduleProcedure(p: Procedure, enabled: boolean): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  await configure();

  // Drop any previous notifications tagged with this procedure id.
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.procedureId === p.id)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  if (!enabled || p.archivedAt) return [];

  const ids: string[] = [];
  for (const time of p.reminderTimes) {
    const trigger = buildTrigger(time);
    if (!trigger) continue;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: p.name,
          body: `Время процедуры — ${p.amount} ${p.unit}`,
          data: { procedureId: p.id, time },
        },
        trigger,
      });
      ids.push(id);
    } catch (err) {
      console.warn('[notifications] schedule failed', err);
    }
  }
  return ids;
}

export async function cancelAll(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
