import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, DollarSign, ShoppingBag, Settings, LogOut, Menu, GraduationCap, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Layout({ children, currentPage, onNavigate }: any) {
  const { signOut, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('Usuário');

  useEffect(() => {
    async function getProfile() {
      if (!user?.email) return;
      
      // Extrai o login do email (ex: dev@email.com vira dev)
      const loginLogado = user.email.split('@')[0];

      const { data } = await supabase
        .from('app_usuarios')
        .select('nome, usuario')
        .eq('usuario', loginLogado)
        .maybeSingle();

      if (data) {
        // Exibe o login (dev) conforme solicitado
        setNomeUsuario(data.usuario || data.nome);
      }
    }
    getProfile();
  }, [user]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'instrutores', label: 'Instrutores', icon: GraduationCap },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'loja', label: 'Loja', icon: ShoppingBag },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight italic">BJJ COLLEGE</h1>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentPage === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
              <item.icon size={20} /> <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 px-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white uppercase shadow-inner">
                    {nomeUsuario.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate text-white">Olá, {nomeUsuario}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Acesso Master</p>
                </div>
            </div>
            <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-bold text-xs uppercase tracking-widest">
                <LogOut size={16} /> Sair
            </button>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto">
        <div className="md:hidden bg-white p-4 flex justify-between border-b sticky top-0 z-40">
           <span className="font-bold italic">BJJ COLLEGE</span>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg"><Menu size={20}/></button>
        </div>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
    </div>
  );
}