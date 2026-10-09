import { useState, useCallback, useMemo } from 'react';
import { CategoryRepository } from '../services/CategoryRepository';

export const useCategories = () => {
  const [categoryList, setCategoryList] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const data = await CategoryRepository.getAll();
    setCategoryList(data);
    setLoading(false);
    return data;
  }, []);

  const saveCategory = useCallback(async (id, data) => {
    let savedId = id;
    if (id) {
      await CategoryRepository.update(id, data);
    } else {
      savedId = await CategoryRepository.add(data);
    }
    await loadCategories();
    return savedId;
  }, [loadCategories]);

  const deleteCategory = useCallback(async (id) => {
    await CategoryRepository.remove(id);
    await loadCategories();
  }, [loadCategories]);

  const reorderCategories = useCallback(async (ids) => {
    const orderedIds = new Set(ids.map(String));
    setCategoryList(current => {
      const byId = new Map(current.map(category => [String(category.id), category]));
      return [
        ...ids.map(id => byId.get(String(id))).filter(Boolean),
        ...current.filter(category => !orderedIds.has(String(category.id)))
      ];
    });
    try {
      await CategoryRepository.reorder(ids);
    } finally {
      await loadCategories();
    }
  }, [loadCategories]);

  const hookValue = useMemo(() => ({
    categoryList, loading, loadCategories, saveCategory, deleteCategory, reorderCategories
  }), [categoryList, loading, loadCategories, saveCategory, deleteCategory, reorderCategories]);

  return hookValue;
};
