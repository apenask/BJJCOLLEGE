import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Receipt, ShoppingBag, 
  Settings, LogOut, Menu, X, BarChart3, GraduationCap, QrCode 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'instrutores', label: 'Instrutores', icon: GraduationCap },
    { id: 'financeiro', label: 'Financeiro', icon: Receipt },
    { id: 'loja', label: 'Loja', icon: ShoppingBag },
    { id: 'pix', label: 'Pix', icon: QrCode },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-50">
        <h1 className="font-black italic tracking-tighter text-xl uppercase">BJJ College</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="mb-10">
            <h1 className="font-black italic tracking-tighter text-3xl uppercase leading-none text-center md:text-left">BJJ<br/><span className="text-blue-500">College</span></h1>
          </div>
          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 uppercase text-xs tracking-widest ${currentPage === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon size={20} /> {item.label}
              </button>
            ))}
          </nav>
          <button onClick={() => signOut()} className="mt-auto flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-slate-400 hover:text-red-500 transition-all uppercase text-xs tracking-widest">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50 relative">
        <div className="p-4 md:p-10 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}