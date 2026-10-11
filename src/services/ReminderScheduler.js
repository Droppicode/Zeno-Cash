import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { eq } from 'drizzle-orm';
import { db } from '../database/db';
import { accounts, debts, recurrences, settings, transactions } from '../database/schema';
import { buildReminders, DEFAULT_REMINDER_CONFIG } from '../utils/Reminders';
import { Logger } from '../utils/logger';

const REMINDER_KIND = 'reminder';

export const loadReminderConfig = async () => {
  const [row] = await db.select().from(settings).where(eq(settings.key, 'reminderConfig'));
  try {
    return { ...DEFAULT_REMINDER_CONFIG, ...(row ? JSON.parse(row.value) : {}) };
  } catch {
    return DEFAULT_REMINDER_CONFIG;
  }
};

const cancelScheduledReminders = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter(item => item.content?.data?.kind === REMINDER_KIND)
    .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
};

export const rescheduleReminders = async () => {
  if (Platform.OS === 'web') return [];
  try {
    const config = await loadReminderConfig();
    const [accountRows, txRows, recurrenceRows, debtRows] = await Promise.all([
      db.select().from(accounts),
      db.select().from(transactions),
      db.select().from(recurrences),
      db.select().from(debts)
    ]);
    const reminders = buildReminders({ accounts: accountRows, transactions: txRows, recurrences: recurrenceRows, debts: debtRows, config });

    await cancelScheduledReminders();
    for (const reminder of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: `reminder:${reminder.id}`,
        content: { title: reminder.title, body: reminder.body, data: { kind: REMINDER_KIND } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminder.date) }
      });
    }
    return reminders;
  } catch (err) {
    Logger.error('rescheduleReminders', err);
    return [];
  }
};
