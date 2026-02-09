import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, DollarSign, ShoppingCart, Settings, LogOut, QrCode, History } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'totem', label: 'Totem / Scanner', icon: QrCode },
    { id: 'presencas', label: 'Histórico', icon: History }, // Botão Adicionado
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'cantina', label: 'Cantina & Loja', icon: ShoppingCart },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-wider">BJJ COLLEGE</h1>
          <p className="text-xs text-slate-400 mt-1">Gestão Inteligente</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
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
          <h1 className="font-bold">BJJ COLLEGE</h1>
          <button onClick={signOut}><LogOut size={20} /></button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden bg-white border-t border-slate-200 flex justify-around p-2">
          {menuItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`p-2 rounded-lg flex flex-col items-center gap-1 ${
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