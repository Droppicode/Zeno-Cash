import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { eq } from 'drizzle-orm';
import { db } from '../database/db';
import { categories, settings, transactions } from '../database/schema';
import { CurrencyUtils } from '../utils/currencyUtils';
import { computeMacroBudgets, monthKeyOf, newBudgetAlerts } from '../utils/MacroBudgets';
import { Logger } from '../utils/logger';

const SENT_KEY = 'budgetAlertsSent';

const readSetting = async (key) => {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
};

export const checkBudgetAlerts = async () => {
  try {
    const uiConfig = await readSetting('uiConfig');
    if (uiConfig?.homeShowBudgets === false) return [];

    const monthKey = monthKeyOf(Date.now());
    const [categoryRows, txRows] = await Promise.all([
      db.select().from(categories),
      db.select().from(transactions)
    ]);
    const [macroBudgets, macroOptions] = await Promise.all([readSetting('macroBudgets'), readSetting('macroOptions')]);
    const budgets = computeMacroBudgets(categoryRows, txRows, [monthKey], macroBudgets || {}, macroOptions || []);
    const sent = (await readSetting(SENT_KEY) || []).filter(key => key.startsWith(monthKey));
    const alerts = newBudgetAlerts(budgets, sent, monthKey);
    if (alerts.length === 0) return [];

    if (Platform.OS !== 'web') {
      for (const alert of alerts) {
        const percent = Math.round(alert.threshold * 100);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: alert.threshold >= 1 ? `Limite de ${alert.macro} estourado` : `${alert.macro} chegou a ${percent}% do limite`,
            body: `R$ ${CurrencyUtils.formatDisplay(alert.spent)} de R$ ${CurrencyUtils.formatDisplay(alert.limit)} neste mês.`
          },
          trigger: null
        });
      }
    }

    const value = JSON.stringify([...sent, ...alerts.map(a => a.key)]);
    await db.insert(settings).values({ key: SENT_KEY, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
    return alerts;
  } catch (err) {
    Logger.error('checkBudgetAlerts', err);
    return [];
  }
};
