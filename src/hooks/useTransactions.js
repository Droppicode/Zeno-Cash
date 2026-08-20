import { useState, useCallback } from 'react';
import { TransactionRepository } from '../services/TransactionRepository';
import { DateUtils } from '../utils/dateUtils';

import { RecurrenceRepository } from '../services/RecurrenceRepository';

import { materializeRecurrencesUpToToday } from '../services/BackgroundTasks';

export const useTransactions = () => {
  const [txList, setTxList] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const data = await TransactionRepository.getAll();
    setTxList(data);
    setLoading(false);
    return data;
  }, []);

  const addTransaction = async (data) => {
    const { recurrenceType, recurrenceData, splitDebts, ...txParams } = data;
    
    let newTxId = null;
    if (recurrenceType && recurrenceType !== 'single' && recurrenceData) {
      newTxId = await RecurrenceRepository.add({
        amount: txParams.amount,
        description: txParams.description,
        categoryId: txParams.categoryId,
        type: txParams.type,
        accountId: txParams.accountId,
        startDate: txParams.date || Date.now(),
        ...recurrenceData
      });

      await materializeRecurrencesUpToToday();
    } else {
      newTxId = await TransactionRepository.add({
        ...txParams,
        date: txParams.date || Date.now()
      });
    }
    
    const isRecurrence = recurrenceType && recurrenceType !== 'single' && recurrenceData;
    
    if (newTxId && splitDebts && splitDebts.length > 0) {
      const { DebtsRepository } = require('../services/DebtsRepository');
      for (const debt of splitDebts) {
        await DebtsRepository.add({
          personName: debt.personName,
          type: debt.type || 'owed',
          amount: debt.amount,
          date: debt.date || txParams.date || Date.now(),
          accountId: txParams.accountId,
          transactionId: isRecurrence ? null : newTxId,
          recurrenceId: isRecurrence ? newTxId : null,
          isPaid: debt.isPaid ? 1 : 0,
          isPercentage: debt.isPercentage ? 1 : 0,
          ignoresInterest: debt.ignoresInterest ? 1 : 0,
          description: debt.description || txParams.description
        });
      }
    }

    await loadTransactions();
  };

  const updateTransaction = async (id, data) => {
    const { splitDebts, ...txParams } = data;
    await TransactionRepository.update(id, txParams);
    
    if (splitDebts) {
      const { DebtsRepository } = require('../services/DebtsRepository');
      // Recalculate percentage debts if transaction amount changed
      // But it's easier to just remove old and insert new ones
      await DebtsRepository.removeByTransactionId(id);
      
      for (const debt of splitDebts) {
        await DebtsRepository.add({
          personName: debt.personName,
          type: debt.type || 'owed',
          amount: debt.amount,
          date: debt.date || txParams.date || Date.now(),
          accountId: txParams.accountId,
          transactionId: id,
          isPaid: debt.isPaid ? 1 : 0,
          isPercentage: debt.isPercentage ? 1 : 0,
          ignoresInterest: debt.ignoresInterest ? 1 : 0,
          description: debt.description || txParams.description
        });
      }
    }
    
    await loadTransactions();
  };

  const saveTransaction = async (id, data) => {
    if (id) {
      await updateTransaction(id, data);
    } else {
      await addTransaction(data);
    }
  };

  const removeTransaction = async (id) => {
    await TransactionRepository.remove(id);
    const { DebtsRepository } = require('../services/DebtsRepository');
    await DebtsRepository.removeByTransactionId(id);
    await loadTransactions();
  };

  const filterByPeriod = useCallback((transactions, periodKey) => {
    if (periodKey === 'all') return transactions;
    const limit = DateUtils.getLimitDateForPeriod(periodKey);
    return transactions.filter(t => t.date >= limit);
  }, []);

  return {
    txList,
    loading,
    loadTransactions,
    addTransaction,
    updateTransaction,
    saveTransaction,
    removeTransaction,
    filterByPeriod
  };
};
