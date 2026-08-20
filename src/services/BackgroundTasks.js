import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { db } from '../database/db';
import { recurrences, transactions } from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import { RecurrenceGenerator } from './RecurrenceGenerator';
import { Logger } from '../utils/logger';
import { performSilentDailyBackup } from './GoogleDriveBackup';
import { DebtsRepository } from './DebtsRepository';

const BACKGROUND_FETCH_TASK = 'background-recurrence-fetch';

export const materializeRecurrencesUpToToday = async () => {
  try {
    const activeRecurrences = await db.select().from(recurrences).where(eq(recurrences.isActive, 1));
    if (activeRecurrences.length === 0) return 0;

    const allTransactions = await db.select().from(transactions);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const virtualTxs = RecurrenceGenerator.generateVirtualTransactions(
      activeRecurrences,
      allTransactions,
      todayEnd.getTime()
    );

    let insertedCount = 0;

    for (const vtx of virtualTxs) {
      if (vtx.date <= todayEnd.getTime()) {
        const { id, isVirtual, iteration, ...txData } = vtx;
        const res = await db.insert(transactions).values({
          ...txData,
          isPending: 1, // force pending
        }).returning();
        insertedCount++;

        const newTxId = res[0]?.id;
        if (newTxId && txData.recurrenceId) {
          const globalDebts = await DebtsRepository.getByRecurrenceId(txData.recurrenceId);
          if (globalDebts && globalDebts.length > 0) {
            const parentRec = activeRecurrences.find(r => r.id === txData.recurrenceId);
            const parentAmount = parentRec ? parentRec.amount : 0;

            for (const d of globalDebts) {
              let newAmount = d.amount;
              if (d.ignoresInterest) {
                if (parentRec && parentRec.installments) {
                  newAmount = d.amount / parentRec.installments;
                } else {
                  newAmount = d.amount;
                }
              } else {
                if (parentAmount > 0) {
                  // Escala proporcionalmente para parcelamentos ou juros
                  newAmount = d.amount * (txData.amount / parentAmount);
                }
              }

              await DebtsRepository.add({
                personName: d.personName,
                type: d.type,
                amount: newAmount,
                date: txData.date, // align date with the transaction
                accountId: txData.accountId,
                transactionId: newTxId, // link specifically to this transaction
                recurrenceId: txData.recurrenceId,
                isPaid: d.isPaid,
                isPercentage: d.isPercentage,
                ignoresInterest: d.ignoresInterest,
                description: d.description || txData.note
              });
            }
          }
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Cobrança Pendente: ${txData.description}`,
            body: `Sua recorrência no valor de R$ ${txData.amount.toFixed(2)} vence hoje. Toque para aprovar!`,
            sound: true,
          },
          trigger: null,
        });
      }
    }

    return insertedCount;
  } catch (error) {
    Logger.error('materializeRecurrencesUpToToday', error);
    return 0;
  }
};

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const insertedCount = await materializeRecurrencesUpToToday();
  
  try {
    await performSilentDailyBackup();
  } catch (e) {
    Logger.error('Background Backup Error', e);
  }

  return insertedCount > 0 
    ? BackgroundTask.BackgroundTaskResult.Success 
    : BackgroundTask.BackgroundTaskResult.NoData;
});

export const registerBackgroundFetchAsync = async () => {
  return BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 60 * 60 * 24, // 24 hours
    stopOnTerminate: false,
    startOnBoot: true,
  });
};

export const unregisterBackgroundFetchAsync = async () => {
  return BackgroundTask.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
};
