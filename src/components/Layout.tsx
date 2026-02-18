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
      
      {/* HEADER MOBILE (TOPO) 
          Z-INDEX 40: Fica abaixo do menu quando ele abrir (que será Z-50)
      */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-40 sticky top-0">
        <h1 className="font-black italic tracking-tighter text-xl uppercase">BJJ College</h1>
        {/* Aqui só mostramos o ícone de abrir (Menu) */}
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 rounded hover:bg-slate-800">
          <Menu size={28} />
        </button>
      </div>

      {/* BACKDROP ESCURO (Fundo preto transparente quando menu abre) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR (MENU LATERAL)
          Z-INDEX 50: Garante que ele passe POR CIMA do topo
      */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          
          {/* CABEÇALHO DO MENU (LOGO + BOTÃO FECHAR) */}
          <div className="mb-10 flex justify-between items-start">
            {/* Logo Bonito (Sempre visível dentro do menu) */}
            <h1 className="font-black italic tracking-tighter text-3xl uppercase leading-none text-left">
              BJJ<br/><span className="text-blue-500">College</span>
            </h1>
            
            {/* Botão X para fechar (Só aparece no mobile dentro do menu) */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="md:hidden text-slate-400 hover:text-white transition-colors"
            >
              <X size={28}/>
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 uppercase text-xs tracking-widest ${currentPage === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon size={20} /> {item.label}
              </button>
            ))}
          </nav>
          
          <button onClick={() => signOut()} className="mt-6 flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-slate-400 hover:text-red-500 transition-all uppercase text-xs tracking-widest border-t border-slate-800">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-x-hidden bg-slate-50 relative h-[calc(100vh-64px)] md:h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
            {children}
        </div>
      </main>
    </div>
  );
}