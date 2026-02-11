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
  session: boolean; // Mantido para compatibilidade
  loading: boolean;
  signIn: (usuario: string, pass: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ao abrir o app, verifica se já existe um usuário salvo no "cache" do navegador
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
      // 1. Busca o usuário na nossa tabela personalizada
      const { data, error } = await supabase
        .from('app_usuarios')
        .select('*')
        .eq('usuario', usuario)
        .eq('senha', senha) // Verifica usuario E senha
        .single();

      // 2. Se der erro ou não encontrar
      if (error || !data) {
        throw new Error('Usuário ou senha incorretos.');
      }

      // 3. Se ativo for falso, bloqueia
      if (data.ativo === false) {
        throw new Error('Este utilizador foi desativado.');
      }

      // 4. Prepara os dados do usuário para salvar
      // Garante que permissões seja um array (mesmo se vier string do banco)
      const permissoesFormatadas = typeof data.permissoes === 'string' 
        ? JSON.parse(data.permissoes) 
        : (data.permissoes || []);

      const userData = {
        id: data.id,
        nome: data.nome,
        usuario: data.usuario,
        permissoes: permissoesFormatadas
      };

      // 5. Salva no estado e no LocalStorage (para não deslogar ao atualizar a página)
      setUser(userData);
      localStorage.setItem('@BJJCollege:user', JSON.stringify(userData));

    } catch (error: any) {
      // Repassa o erro para a tela de Login mostrar
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
      session: !!user, // Se tem user, tem sessão
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