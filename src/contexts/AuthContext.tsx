import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    const loadStorageData = async () => {
      const storedUser = localStorage.getItem('@BJJCollege:user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    loadStorageData();
  }, []);

  async function signIn(usuario: string, senha: string) {
    try {
      // Em vez de um SELECT normal, chamamos a função RPC que criamos no SQL.
      // Isso é muito mais seguro porque a senha digitada nunca é comparada no frontend.
      const { data, error } = await supabase.rpc('verificar_senha_usuario', {
        login_input: usuario,
        senha_input: senha
      });

      // A função retorna uma lista (tabela). Pegamos o primeiro item.
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
      localStorage.setItem('@BJJCollege:user', JSON.stringify(userData));

    } catch (error: any) {
      throw error;
    }
  }

  function signOut() {
    setUser(null);
    localStorage.removeItem('@BJJCollege:user');
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
