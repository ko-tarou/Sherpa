import { useState, useEffect } from 'react';
import { Task } from '../types';
import { apiClient } from '../services/api';

export const useTasks = (eventId: number | null) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      loadTasks(eventId);
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [eventId]);

  const loadTasks = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getTasks(id);
      setTasks(response.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの読み込みに失敗しました');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: Partial<Task>) => {
    if (!eventId) return;
    try {
      const response = await apiClient.createTask(eventId, taskData);
      setTasks(prev => [...prev, response.task]);
      return response.task;
    } catch (err) {
      throw err;
    }
  };

  const updateTask = async (id: number, taskData: Partial<Task>) => {
    try {
      const response = await apiClient.updateTask(id, taskData);
      setTasks(prev => prev.map(t => t.id === id ? response.task : t));
      return response.task;
    } catch (err) {
      throw err;
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await apiClient.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    reload: () => eventId && loadTasks(eventId),
  };
};
