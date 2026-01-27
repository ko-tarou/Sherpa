import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiClient } from '../services/api';

const TOKEN_KEY = 'sherpa_token';
const USER_KEY = 'sherpa_user';

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as User;
    return u?.id ? u : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export const useUser = () => {
  const [user, setUserState] = useState<User | null>(() => loadStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !user) {
      loadUserFromToken();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserFromToken = async () => {
    try {
      const { user: fetchedUser } = await apiClient.getMe();
      setUserState(fetchedUser);
      saveStoredUser(fetchedUser);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    saveStoredUser(user);
  }, [user]);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
  }, []);

  const login = useCallback(async (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    const { user: fetchedUser } = await apiClient.getMe();
    setUserState(fetchedUser);
    saveStoredUser(fetchedUser);
    return fetchedUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUserState(null);
    saveStoredUser(null);
  }, []);

  return { user, setUser, login, logout, loading };
};
