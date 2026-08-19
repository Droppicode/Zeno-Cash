import { useState, useCallback } from 'react';
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

  const addDebt = async (data) => {
    await DebtsRepository.add({
      ...data,
      date: data.date || Date.now()
    });
    await loadDebts();
  };

  const updateDebt = async (id, data) => {
    await DebtsRepository.update(id, data);
    await loadDebts();
  };

  const removeDebt = async (id) => {
    await DebtsRepository.remove(id);
    await loadDebts();
  };

  const getUniqueNames = async () => {
    return await DebtsRepository.getUniqueNames();
  };

  return {
    debtsList,
    loading,
    loadDebts,
    addDebt,
    updateDebt,
    removeDebt,
    getUniqueNames
  };
};
