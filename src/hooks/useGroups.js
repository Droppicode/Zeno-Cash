import { useState, useCallback, useMemo } from 'react';
import { GroupsRepository } from '../services/GroupsRepository';

export const useGroups = () => {
  const [groupList, setGroupList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [txGroupMap, setTxGroupMap] = useState({});

  const loadGroups = useCallback(async (options) => {
    setLoading(true);
    const data = await GroupsRepository.getAll(options);
    setGroupList(data);
    setLoading(false);
    return data;
  }, []);

  const saveGroup = useCallback(async (id, data) => {
    let savedId = id;
    if (id) {
      await GroupsRepository.update(id, data);
    } else {
      savedId = await GroupsRepository.add(data);
    }
    await loadGroups({ includeArchived: true });
    return savedId;
  }, [loadGroups]);

  const deleteGroup = useCallback(async (id) => {
    await GroupsRepository.remove(id);
    await loadGroups({ includeArchived: true });
  }, [loadGroups]);

  const reorderGroups = useCallback(async (ids) => {
    const orderedIds = new Set(ids.map(String));
    setGroupList(current => {
      const byId = new Map(current.map(group => [String(group.id), group]));
      return [
        ...ids.map(id => byId.get(String(id))).filter(Boolean),
        ...current.filter(group => !orderedIds.has(String(group.id)))
      ];
    });
    try {
      await GroupsRepository.reorder(ids);
    } finally {
      await loadGroups({ includeArchived: true });
    }
  }, [loadGroups]);

  const loadTxGroupMap = useCallback(async () => {
    const map = await GroupsRepository.getTransactionGroupMap();
    setTxGroupMap(map);
    return map;
  }, []);

  const hookValue = useMemo(() => ({
    groupList,
    loading,
    loadGroups,
    saveGroup,
    deleteGroup,
    reorderGroups,
    txGroupMap,
    loadTxGroupMap
  }), [groupList, loading, loadGroups, saveGroup, deleteGroup, reorderGroups, txGroupMap, loadTxGroupMap]);

  return hookValue;
};
