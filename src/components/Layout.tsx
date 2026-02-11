import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  QrCode, 
  History, 
  Wallet, 
  Store,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Hammer,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { signOut, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  // RESTRICÇÃO RÍGIDA: Apenas o utilizador com o login EXATO 'dev' vê o botão.
  const isDevUser = user?.usuario === 'dev';

  useEffect(() => {
    // Verifica status inicial da manutenção
    const checkMaintenance = async () => {
      const { data } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'manutencao')
        .single();
      if (data) setMaintenanceActive(data.valor.ativa);
    };
    checkMaintenance();

    // Escuta mudanças em tempo real
    const channel = supabase
      .channel('maintenance-global')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'configuracoes', filter: 'chave=eq.manutencao' }, 
        (payload) => {
          setMaintenanceActive(payload.new.valor.ativa);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'totem', label: 'Totem / Scanner', icon: QrCode },
    { id: 'presencas', label: 'Histórico', icon: History },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: Wallet },
    { id: 'cantina', label: 'Cantina & Loja', icon: Store },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  // Filtra itens e insere o botão Dev APENAS se o login for 'dev'
  const filteredMenuItems = menuItems.reduce((acc: any[], item) => {
    // Insere Painel Dev imediatamente acima de Configurações se for o 'dev'
    if (item.id === 'configuracoes' && isDevUser) {
      acc.push({ id: 'dev', label: 'Painel Dev', icon: Terminal });
    }

    const hasPermission = 
      user?.usuario === 'admin' || 
      user?.permissoes?.includes('configuracoes') || 
      user?.permissoes?.includes(item.id) || 
      (item.id === 'dev' && isDevUser);

    if (hasPermission) acc.push(item);
    return acc;
  }, []);

  const handleNavigation = (pageId: string) => {
    onNavigate(pageId);
    setIsMobileMenuOpen(false);
  };

  // TELA DE MANUTENÇÃO (Bloqueia todos menos o 'dev')
  if (maintenanceActive && !isDevUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
        <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center mb-8 animate-pulse border border-red-600/20">
          <Hammer size={48} className="text-red-600" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-4">
          Modo Manutenção
        </h1>
        <p className="text-slate-400 max-w-sm leading-relaxed font-medium">
          O sistema está em manutenção técnica. Voltaremos em breve.
        </p>
        <div className="mt-12 flex items-center gap-2 text-slate-700 text-[10px] font-bold uppercase tracking-widest border border-white/5 px-4 py-2 rounded-full bg-white/5">
           <ShieldAlert size={14} className="text-red-900" />
           <span>Alexandre Team Security protocol</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transform transition-all duration-300 ease-in-out
        lg:relative lg:translate-x-0 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}
        w-72
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className={`flex items-center gap-3 transition-opacity duration-300 ${isSidebarCollapsed && !isMobileMenuOpen ? 'lg:opacity-0' : 'opacity-100'}`}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden shrink-0">
               <img src="https://islanleite.com.br/wp-content/uploads/2023/08/logo-bjj-college.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            {(!isSidebarCollapsed || isMobileMenuOpen) && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none truncate">BJJ COLLEGE</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">Management System</p>
              </div>
            )}
          </div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10">
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button className="lg:hidden p-2 text-slate-400" onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto scrollbar-hide">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group
                ${currentPage === item.id 
                  ? 'bg-white text-slate-900 shadow-xl font-bold scale-[1.02]' 
                  : (item.id === 'dev' ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5')
                }
                ${isSidebarCollapsed && !isMobileMenuOpen ? 'lg:justify-center lg:px-0' : ''}
              `}
            >
              <item.icon size={20} className={currentPage === item.id ? 'text-slate-900' : ''} />
              {(!isSidebarCollapsed || isMobileMenuOpen) && <span className="uppercase tracking-wide text-xs truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 bg-slate-900/50">
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-bold text-xs uppercase tracking-widest">
            <LogOut size={18} />
            {(!isSidebarCollapsed || isMobileMenuOpen) && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white lg:rounded-l-[2.5rem] lg:shadow-2xl lg:my-2 lg:mr-2 border-l border-slate-100 relative">
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200">
            <Menu size={24} />
          </button>
          <span className="font-black text-slate-900 uppercase tracking-tighter text-sm italic">BJJ COLLEGE</span>
          <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-white">
            {(user?.nome || 'A').charAt(0).toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8 lg:p-10 bg-white">
          <div className="max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}