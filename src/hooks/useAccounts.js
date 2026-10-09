import { useState, useCallback, useMemo } from 'react';
import { AccountRepository } from '../services/AccountRepository';

export const useAccounts = () => {
  const [accountList, setAccountList] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const data = await AccountRepository.getAll();
    setAccountList(data);
    setLoading(false);
    return data;
  }, []);

  const saveAccount = useCallback(async (id, data) => {
    let savedId = id;
    if (id) {
      await AccountRepository.update(id, data);
    } else {
      savedId = await AccountRepository.add(data);
    }
    await loadAccounts();
    return savedId;
  }, [loadAccounts]);

  const deleteAccount = useCallback(async (id) => {
    await AccountRepository.remove(id);
    await loadAccounts();
  }, [loadAccounts]);

  const reorderAccounts = useCallback(async (ids) => {
    const orderedIds = new Set(ids.map(String));
    setAccountList(current => {
      const byId = new Map(current.map(account => [String(account.id), account]));
      return [
        ...ids.map(id => byId.get(String(id))).filter(Boolean),
        ...current.filter(account => !orderedIds.has(String(account.id)))
      ];
    });
    try {
      await AccountRepository.reorder(ids);
    } finally {
      await loadAccounts();
    }
  }, [loadAccounts]);

  const hookValue = useMemo(() => ({
    accountList, loading, loadAccounts, saveAccount, deleteAccount, reorderAccounts
  }), [accountList, loading, loadAccounts, saveAccount, deleteAccount, reorderAccounts]);

  return hookValue;
};
