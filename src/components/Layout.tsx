import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Coffee, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Terminal,
  GraduationCap,
  FileText // <--- Novo ícone importado
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { signOut, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
    { id: 'instrutores', label: 'Instrutores', icon: GraduationCap }, // <--- Novo Item
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'cantina', label: 'Cantina', icon: Coffee },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
    // Item secreto para devs
    { id: 'dev', label: 'Dev Panel', icon: Terminal, hidden: true }, 
  ];

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false); // Fecha o menu ao clicar (no mobile)
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Menu Lateral (Desktop: fixo, Mobile: slide-over) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BJJ COLLEGE</h1>
            <p className="text-slate-400 text-xs mt-1">Sistema de Gestão</p>
          </div>
          {/* Botão fechar (só mobile) */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {menuItems.filter(item => !item.hidden).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 px-4 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate text-white">Usuário</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
            </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* 2. Conteúdo Principal */}
      <main className="flex-1 h-screen overflow-y-auto w-full">
        {/* Barra Superior Mobile (Hambúrguer) */}
        <div className="md:hidden bg-white p-4 flex items-center justify-between border-b shadow-sm sticky top-0 z-40">
           <h1 className="font-bold text-lg text-slate-800">BJJ COLLEGE</h1>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
             <Menu size={24} />
           </button>
        </div>

        {/* Área de Conteúdo */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Overlay Escuro (Fundo quando menu mobile abre) */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}