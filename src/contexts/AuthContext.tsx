import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem('bjj_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      setUser({ id: 'admin', email: 'admin@bjjcollege.com' });
    }
    setLoading(false);
  }, []);

  const login = (username: string, password: string) => {
    if (username === 'admin' && password === 'admin') {
      setIsAuthenticated(true);
      setUser({ id: 'admin', email: 'admin@bjjcollege.com' });
      localStorage.setItem('bjj_auth', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('bjj_auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
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
