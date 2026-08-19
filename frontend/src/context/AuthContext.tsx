import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, usersAPI } from '../lib/api';

interface TailorProfile {
  bio?: string | null;
  specialties?: string[] | null;
  basePricingMin?: number | null;
  basePricingMax?: number | null;
  portfolioImages?: string[] | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  tailor?: TailorProfile | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<any>;
  registerVerify: (data: any) => Promise<void>;
  oauth: (data: any) => Promise<void>;
  googleLogin: (data: { credential?: string; token?: string; role?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: any) => Promise<void>;
  switchRole: (role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      usersAPI.getMe()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (data: any) => {
    const res = await authAPI.register(data);
    return res.data;
  };

  const registerVerify = async (data: any) => {
    const res = await authAPI.registerVerify(data);
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    setLoading(false);
  };

  const oauth = async (data: any) => {
    const res = await authAPI.oauth(data);
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const googleLogin = async (data: { credential?: string; token?: string; role?: string }) => {
    const res = await authAPI.googleAuth(data);
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (data: any) => {
    const res = await usersAPI.updateMe(data);
    setUser(res.data.user);
  };

  const switchRole = async (newRole: string) => {
    const res = await usersAPI.switchRole(newRole);
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
    }
    if (res.data.user) {
      setUser(res.data.user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, registerVerify, oauth, googleLogin, logout, updateUser, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}