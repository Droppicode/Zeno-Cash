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
    if (id) {
      await AccountRepository.update(id, data);
    } else {
      await AccountRepository.add(data);
    }
    await loadAccounts();
  }, [loadAccounts]);

  const deleteAccount = useCallback(async (id) => {
    await AccountRepository.remove(id);
    await loadAccounts();
  }, [loadAccounts]);

  const hookValue = useMemo(() => ({
    accountList, loading, loadAccounts, saveAccount, deleteAccount
  }), [accountList, loading, loadAccounts, saveAccount, deleteAccount]);

  return hookValue;
};
