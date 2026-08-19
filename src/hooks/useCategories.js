import { useState, useCallback } from 'react';
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

  const saveCategory = async (id, data) => {
    let savedId = id;
    if (id) {
      await CategoryRepository.update(id, data);
    } else {
      savedId = await CategoryRepository.add(data);
    }
    await loadCategories();
    return savedId;
  };

  const deleteCategory = async (id) => {
    await CategoryRepository.remove(id);
    await loadCategories();
  };

  return { categoryList, loading, loadCategories, saveCategory, deleteCategory };
};
