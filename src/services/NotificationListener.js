import { DeviceEventEmitter, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CurrencyUtils } from '../utils/currencyUtils';

import { db } from '../database/db';
import { transactions, accounts } from '../database/schema';
import { eq, gte } from 'drizzle-orm';
import { parseBankNotification } from './notificationParser';
import { TransactionRepository } from './TransactionRepository';
import { enrichPendingTransaction, getNotificationAiConfig } from './notificationEnricher';
import { cardPaymentTag, pickNotificationAccounts } from './notificationAccounts';

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

export const headlessNotificationListener = async ({ notification }) => {
  try {
    if (!notification) return;
    
    const parsed = typeof notification === 'string' ? JSON.parse(notification) : notification;
    
    // Ignora notificações muito antigas (mais de 10 minutos) para evitar crash ao reconectar o Expo após dias offline
    const notifTime = Number(parsed.time || parsed.postTime) || Date.now();
    if (Date.now() - notifTime > 600000) {
      return;
    }
    
    const parsedTx = parseBankNotification(parsed);
    if (!parsedTx) return;

    const { amount, type, description: txDesc, rawText } = parsedTx;
    const note = rawText.substring(0, 100);

    const recentFromNotifications = await db.select().from(transactions)
      .where(gte(transactions.date, Date.now() - DUPLICATE_WINDOW_MS));
    if (recentFromNotifications.some(tx => tx.amount === amount && tx.type === type && tx.sourceText === rawText)) return;

    const accountsData = await db.select().from(accounts);
    const { accountId: accId, cardId } = pickNotificationAccounts(accountsData, parsedTx);

    const aiConfig = await getNotificationAiConfig().catch(() => null);

    const newTx = {
      amount,
      type,
      description: txDesc,
      date: Date.now(),
      categoryId: null,
      accountId: accId,
      isPending: 1,
      note: cardId ? `${note} ${cardPaymentTag(cardId)}` : note,
      sourceText: rawText,
      aiStatus: aiConfig ? 'pending' : null
    };

    const [inserted] = await db.insert(transactions).values(newTx).returning({ id: transactions.id });
    await TransactionRepository.recalculateMonth(newTx.date);
    DeviceEventEmitter.emit('refreshTransactions');

    let final = { description: txDesc, amount };
    if (aiConfig && inserted?.id) {
      try {
        const suggestion = await enrichPendingTransaction({ txId: inserted.id, parsed: parsedTx, config: aiConfig });
        if (suggestion) final = suggestion;
      } catch (error) {
        console.log('Sugestão da IA indisponível:', error?.message);
        await db.update(transactions).set({ aiStatus: 'failed' }).where(eq(transactions.id, inserted.id));
      }
      await TransactionRepository.recalculateMonth(newTx.date);
      DeviceEventEmitter.emit('refreshTransactions');
    }

    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: final.description,
          body: `Pendência de R$ ${CurrencyUtils.formatDisplay(final.amount)} salva. Toque para aprovar!`,
          sound: true,
        },
        trigger: null,
      });
    }
    
  } catch (error) {
    console.error('Erro ao processar notificação headless:', error);
  }
};
