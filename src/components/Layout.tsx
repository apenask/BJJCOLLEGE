import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, DollarSign, ShoppingCart, Settings, LogOut, QrCode, History } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  // Agora recuperamos o 'user' para verificar as suas permissões
  const { signOut, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'totem', label: 'Totem / Scanner', icon: QrCode },
    { id: 'presencas', label: 'Histórico', icon: History },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'cantina', label: 'Cantina & Loja', icon: ShoppingCart },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  // 1. Filtra os itens com base nas permissões do utilizador
  const filteredMenuItems = menuItems.filter(item => {
    // Se for o admin mestre (login 'admin') ou tiver permissão de 'configuracoes' (Admin total), vê tudo
    if (user?.usuario === 'admin' || user?.permissoes?.includes('configuracoes')) {
      return true;
    }
    // Caso contrário, só mostra se o ID do menu estiver na lista de permissões do utilizador
    return user?.permissoes?.includes(item.id);
  });

  // 2. Proteção de Redirecionamento
  // Se o utilizador entrar e estiver numa página que não tem permissão (ex: Dashboard),
  // manda-o para a primeira página que ele pode ver.
  useEffect(() => {
    if (user && user.usuario !== 'admin' && !user.permissoes?.includes('configuracoes')) {
       // Se a página atual NÃO está na lista de permitidas
       if (!user.permissoes?.includes(currentPage)) {
          // Redireciona para a primeira permissão disponível (ex: 'totem')
          if (user.permissoes && user.permissoes.length > 0) {
             onNavigate(user.permissoes[0]);
          }
       }
    }
  }, [currentPage, user, onNavigate]);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-wider">BJJ COLLEGE</h1>
          <p className="text-xs text-slate-400 mt-1">
             {/* Mostra o nome do utilizador logado */}
             {user?.nome ? `Olá, ${user.nome.split(' ')[0]}` : 'Gestão Inteligente'}
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {/* Renderiza apenas os menus filtrados */}
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          {filteredMenuItems.length === 0 && (
             <div className="text-center text-slate-500 text-xs p-4 border border-slate-800 rounded bg-slate-800/50">
               Sem permissões de acesso. Contacte o administrador.
             </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-10">
          <div>
             <h1 className="font-bold">BJJ COLLEGE</h1>
             <p className="text-[10px] text-slate-400">{user?.nome || 'Admin'}</p>
          </div>
          <button onClick={signOut}><LogOut size={20} /></button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden bg-white border-t border-slate-200 flex justify-around p-2 overflow-x-auto">
          {filteredMenuItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`p-2 rounded-lg flex flex-col items-center gap-1 min-w-[60px] ${
                currentPage === item.id ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <item.icon size={24} />
              <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}