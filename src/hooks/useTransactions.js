import { useState, useCallback } from 'react';
import { TransactionRepository } from '../services/TransactionRepository';
import { DateUtils } from '../utils/dateUtils';

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
    await TransactionRepository.add({
      ...data,
      date: data.date || Date.now()
    });
    await loadTransactions();
  };

  const removeTransaction = async (id) => {
    await TransactionRepository.remove(id);
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
    removeTransaction,
    filterByPeriod
  };
};
