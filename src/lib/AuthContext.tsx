import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (formData: FormData) => Promise<void>;
  logout: () => void;
  register: (userData: any) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('aurora_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user', err);
      localStorage.removeItem('aurora_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (formData: FormData) => {
    const { access_token } = await api.auth.login(formData);
    localStorage.setItem('aurora_token', access_token);
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('aurora_token');
    setUser(null);
    window.location.href = '/login';
  };

  const register = async (userData: any) => {
    await api.auth.register(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
