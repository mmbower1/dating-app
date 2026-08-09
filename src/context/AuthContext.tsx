import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api/axios';
import type { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  age: number;
  dateOfBirth?: string;
  gender: string;
  interestedIn: string[];
  phone?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const CACHED_USER_KEY = 'lockheart_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem(CACHED_USER_KEY);
      return cached ? (JSON.parse(cached) as User) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  // Only block rendering if there is no token at all — if we have a token+cache, render instantly
  const [loading, setLoading] = useState(!localStorage.getItem('token'));

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { setLoading(false); return; }
    // Verify the token and refresh user data in the background
    api.get<User>('/auth/me')
      .then((res) => {
        setUser(res.data);
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem(CACHED_USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (data: RegisterData) => {
    const res = await api.post<AuthResponse>('/auth/register', data);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem(CACHED_USER_KEY);
    setToken(null);
    setUser(null);
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
