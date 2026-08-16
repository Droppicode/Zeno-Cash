import { useState, useCallback } from 'react';
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

  const saveAccount = async (id, data) => {
    if (id) {
      await AccountRepository.update(id, data);
    } else {
      await AccountRepository.add(data);
    }
    await loadAccounts();
  };

  const deleteAccount = async (id) => {
    await AccountRepository.remove(id);
    await loadAccounts();
  };

  return { accountList, loading, loadAccounts, saveAccount, deleteAccount };
};
