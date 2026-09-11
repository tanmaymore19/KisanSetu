import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types.js';
import { api } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;
  selectedRoleForAuth: UserRole | null;
  setSelectedRoleForAuth: (role: UserRole | null) => void;
  login: (identifier: string, password: string, expectedRole?: UserRole) => Promise<void>;
  register: (data: any) => Promise<void>;
  saveSession: (token: string, user: User) => void;
  logout: () => void;
  switchRole: (newRole: UserRole, instantLogin?: boolean) => Promise<void>;
  quickDemoLogin: (username: 'rajesh_farmer' | 'anita_orchards' | 'tanmay123' | 'admin_master') => Promise<void>;
  updateUser: (updatedUser: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'f2h_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRoleForAuth, setSelectedRoleForAuth] = useState<UserRole | null>(null);

  // Restore persistent session from localStorage on startup
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.token && parsed?.user) {
          setUser(parsed.user);
          setToken(parsed.token);
          // Sync with server in background
          api.getMe(parsed.user.id)
            .then((res) => {
              setUser(res.user);
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: parsed.token, user: res.user }));
            })
            .catch(() => {
              // keep local cached session if server is momentarily slow
            });
        }
      }
    } catch (e) {
      console.error('Session load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = (newToken: string, newUser: User) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, user: newUser }));
  };

  const login = async (identifier: string, password: string, expectedRole?: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.login(identifier, password, expectedRole);
      saveSession(res.token, res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      saveSession(res.token, res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (user?.username) {
      localStorage.setItem('f2h_last_username', user.username);
    }
    const previousRole = user?.role || null;
    setUser(null);
    setToken(null);
    setSelectedRoleForAuth(previousRole);
    localStorage.removeItem(STORAGE_KEY);
  };

  const switchRole = async (newRole: UserRole, instantLogin = true) => {
    setSelectedRoleForAuth(newRole);
    if (!instantLogin) {
      if (user?.username) {
        localStorage.setItem('f2h_last_username', user.username);
      }
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // Seamless instant login to destination dashboard
    setIsLoading(true);
    try {
      if (newRole === 'admin') {
        const res = await api.login('Adminf&c_19', 'Tfarm19/1#', 'admin');
        saveSession(res.token, res.user);
      } else if (newRole === 'farmer') {
        const res = await api.login('rajesh_farmer', 'Farmer@123', 'farmer');
        saveSession(res.token, res.user);
      } else {
        const res = await api.login('tanmay123', 'Consumer@123', 'consumer');
        saveSession(res.token, res.user);
      }
    } catch (err) {
      console.error('Seamless switch failed, dropping to role auth screen', err);
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = async (
    username: 'rajesh_farmer' | 'anita_orchards' | 'tanmay123' | 'admin_master'
  ) => {
    setIsLoading(true);
    try {
      if (username === 'admin_master') {
        const res = await api.login('Adminf&c_19', 'Tfarm19/1#', 'admin');
        saveSession(res.token, res.user);
        return;
      }
      const password = username.includes('farmer') || username.includes('orchards')
        ? 'Farmer@123'
        : 'Consumer@123';
      const role = username.includes('farmer') || username.includes('orchards')
        ? 'farmer'
        : 'consumer';
      const res = await api.login(username, password, role);
      saveSession(res.token, res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    if (token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: updatedUser }));
    }
  };

  const refreshUser = async () => {
    if (user) {
      try {
        const res = await api.getMe(user.id);
        updateUser(res.user);
      } catch (err) {
        console.error('Failed to refresh user:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isLoading,
        selectedRoleForAuth,
        setSelectedRoleForAuth,
        login,
        register,
        saveSession,
        logout,
        switchRole,
        quickDemoLogin,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
