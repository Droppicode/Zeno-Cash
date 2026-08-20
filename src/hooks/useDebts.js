import { useState, useCallback, useMemo } from 'react';
import { DebtsRepository } from '../services/DebtsRepository';

export const useDebts = () => {
  const [debtsList, setDebtsList] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDebts = useCallback(async () => {
    setLoading(true);
    const data = await DebtsRepository.getAll();
    setDebtsList(data);
    setLoading(false);
    return data;
  }, []);

  const addDebt = useCallback(async (data) => {
    await DebtsRepository.add({
      ...data,
      date: data.date || Date.now()
    });
    await loadDebts();
  }, [loadDebts]);

  const updateDebt = useCallback(async (id, data) => {
    await DebtsRepository.update(id, data);
    await loadDebts();
  }, [loadDebts]);

  const removeDebt = useCallback(async (id) => {
    await DebtsRepository.remove(id);
    await loadDebts();
  }, [loadDebts]);

  const getByTransactionId = useCallback(async (txId) => {
    return await DebtsRepository.getByTransactionId(txId);
  }, []);

  const getUniqueNames = useCallback(async () => {
    return await DebtsRepository.getUniqueNames();
  }, []);

  const hookValue = useMemo(() => ({
    debtsList,
    loading,
    loadDebts,
    addDebt,
    updateDebt,
    removeDebt,
    getByTransactionId,
    getUniqueNames
  }), [debtsList, loading, loadDebts, addDebt, updateDebt, removeDebt, getByTransactionId, getUniqueNames]);

  return hookValue;
};
