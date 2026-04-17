import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { STORAGE_KEYS, SESSION_CONFIG } from '../lib/config';

interface User {
  id: string;
  nome: string;
  usuario: string;
  permissoes: string[];
}

interface AuthContextData {
  user: User | null;
  session: boolean;
  loading: boolean;
  signIn: (usuario: string, senha: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para verificar se a sessão expirou
  const isSessionExpired = (): boolean => {
    const timestamp = localStorage.getItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
    if (!timestamp) return true;
    
    const loginTime = parseInt(timestamp, 10);
    const now = Date.now();
    return (now - loginTime) > SESSION_CONFIG.EXPIRATION_MS;
  };

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

        if (storedUser) {
          // Verifica se a sessão expirou
          if (isSessionExpired()) {
            console.log('Sessão expirada. Fazendo logout...');
            localStorage.removeItem(STORAGE_KEYS.USER);
            localStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
            setUser(null);
          } else {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              localStorage.removeItem(STORAGE_KEYS.USER);
              localStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados da sessão:', error);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
      } finally {
        setLoading(false);
      }
    };

    loadStorageData();
  }, []);

  async function signIn(usuario: string, senha: string) {
    try {
      // Validação via RPC no Supabase (seguro)
      const { data, error } = await supabase.rpc('verificar_senha_usuario', {
        login_input: usuario,
        senha_input: senha
      });

      const result = data && data[0];

      if (error || !result || !result.sucesso) {
        throw new Error('Usuário ou senha incorretos.');
      }

      const permissoesFormatadas = typeof result.permissoes === 'string' 
        ? JSON.parse(result.permissoes) 
        : (result.permissoes || []);

      const userData = {
        id: result.id,
        nome: result.nome,
        usuario: result.usuario,
        permissoes: permissoesFormatadas
      };

      setUser(userData);
      
      // Salva usuário E timestamp da sessão
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, Date.now().toString());

    } catch (error: any) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  function signOut() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session: !!user,
      loading, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
