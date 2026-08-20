import { useState, useCallback, useMemo } from 'react';
import { TransactionRepository } from '../services/TransactionRepository';
import { DateUtils } from '../utils/dateUtils';

import { RecurrenceRepository } from '../services/RecurrenceRepository';

import { materializeRecurrencesUpToToday } from '../services/BackgroundTasks';

export const useTransactions = () => {
  const [txList, setTxList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cachedBalances, setCachedBalances] = useState({ income: 0, expense: 0, total: 0 });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    await TransactionRepository.initMonthlyBalances();
    const data = await TransactionRepository.getAll();
    setTxList(data);
    setLoading(false);
    return data;
  }, []);

  const loadMonthlyBalances = useCallback(async (selectedMonths) => {
    if (!selectedMonths || selectedMonths.length === 0) return;
    const balances = await TransactionRepository.getMonthlyBalances(selectedMonths);
    let inTotal = 0;
    let outTotal = 0;
    balances.forEach(b => {
      inTotal += b.income;
      outTotal += b.expense;
    });
    setCachedBalances({ income: inTotal, expense: outTotal, total: inTotal - outTotal });
  }, []);

  const addTransaction = useCallback(async (data) => {
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
  }, [loadTransactions]);

  const updateTransaction = useCallback(async (id, data) => {
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
  }, [loadTransactions]);

  const saveTransaction = useCallback(async (id, data) => {
    if (id) {
      await updateTransaction(id, data);
    } else {
      await addTransaction(data);
    }
  }, [updateTransaction, addTransaction]);

  const removeTransaction = useCallback(async (id) => {
    await TransactionRepository.remove(id);
    const { DebtsRepository } = require('../services/DebtsRepository');
    await DebtsRepository.removeByTransactionId(id);
    await loadTransactions();
  }, [loadTransactions]);

  const filterByPeriod = useCallback((transactions, periodKey) => {
    if (periodKey === 'all') return transactions;
    if (Array.isArray(periodKey)) {
      return transactions.filter(t => {
        const d = new Date(t.date);
        const yyyyMM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return periodKey.includes(yyyyMM);
      });
    }
    const limit = DateUtils.getLimitDateForPeriod(periodKey);
    return transactions.filter(t => t.date >= limit);
  }, []);

  const hookValue = useMemo(() => ({
    txList,
    loading,
    loadTransactions,
    addTransaction,
    updateTransaction,
    saveTransaction,
    removeTransaction,
    filterByPeriod,
    cachedBalances,
    loadMonthlyBalances
  }), [
    txList, loading, loadTransactions, addTransaction, updateTransaction, 
    saveTransaction, removeTransaction, filterByPeriod, cachedBalances, loadMonthlyBalances
  ]);

  return hookValue;
};
