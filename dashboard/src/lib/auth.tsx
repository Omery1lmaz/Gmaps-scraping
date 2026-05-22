import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'leadflow_auth_token';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionStatus?: 'active' | 'inactive' | 'canceled' | 'expired';
  subscriptionExpiresAt?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setGlobalAuthToken(token: string | null) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setGlobalAuthToken(token);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    axios.get(`${API_URL}/auth/me`)
      .then((res) => {
        if (!cancelled) setUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setGlobalAuthToken(null);
        queryClient.clear();
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const applySession = (nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setGlobalAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/auth/me`);
      setUser(res.data);
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    token,
    loading,
    login: async (email, password) => {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      applySession(res.data.token, res.data.user);
    },
    register: async (name, email, password) => {
      const res = await axios.post(`${API_URL}/auth/register`, { name, email, password });
      applySession(res.data.token, res.data.user);
    },
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      setGlobalAuthToken(null);
      setToken(null);
      setUser(null);
      queryClient.clear();
    },
    refreshUser,
  }), [loading, token, user, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
