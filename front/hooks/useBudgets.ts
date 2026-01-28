import { useState, useEffect } from 'react';
import { Budget } from '../types';
import { apiClient } from '../services/api';

export const useBudgets = (eventId: number | null) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadBudgets(eventId);
    } else {
      setBudgets([]);
      setLoading(false);
    }
  }, [eventId]);

  const loadBudgets = async (id: number) => {
    try {
      setLoading(true);
      const res = await apiClient.getBudgets(id);
      setBudgets(res.budgets);
    } catch (err) {
      console.error('Error loading budgets:', err);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async (data: { category: string; type: 'income' | 'expense'; planned_amount: number; actual_amount?: number }) => {
    if (!eventId) return;
    const res = await apiClient.createBudget(eventId, data);
    setBudgets((prev) => [...prev, res.budget]);
    return res.budget;
  };

  const updateBudget = async (id: number, data: Partial<Pick<Budget, 'category' | 'type' | 'planned_amount' | 'actual_amount'>>) => {
    const res = await apiClient.updateBudget(id, data);
    setBudgets((prev) => prev.map((b) => (b.id === id ? res.budget : b)));
    return res.budget;
  };

  const deleteBudget = async (id: number) => {
    await apiClient.deleteBudget(id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  return {
    budgets,
    loading,
    createBudget,
    updateBudget,
    deleteBudget,
    reload: () => (eventId ? loadBudgets(eventId) : undefined),
  };
};
