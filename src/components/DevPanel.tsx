import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Power, Terminal, ShieldAlert, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function DevPanel() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  // SEGURANÇA: Bloqueio visual para quem não é 'dev'
  // Nota: A proteção real também deve existir no Router/App.tsx
  const isAuthorized = user?.usuario === 'dev';

  useEffect(() => {
    if (!isAuthorized) return;
    fetchMaintenanceStatus();

    const channel = supabase
      .channel('dev_panel_status')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'configuracoes', filter: 'chave=eq.manutencao' }, 
        (payload) => {
          if (payload.new && payload.new.valor) {
            setIsMaintenance(payload.new.valor.ativa);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthorized]);

  async function fetchMaintenanceStatus() {
    try {
      const { data } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'manutencao')
        .single();
      
      if (data) setIsMaintenance(data.valor.ativa);
    } catch (e) {
      console.error("Erro ao buscar status", e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleMaintenance() {
    const newState = !isMaintenance;
    try {
      // Atualiza a tabela 'configuracoes'. O Layout.tsx vai escutar isso e bloquear os outros.
      const { error } = await supabase
        .from('configuracoes')
        .update({ valor: { ativa: newState } })
        .eq('chave', 'manutencao');

      if (error) throw error;
      
      addToast(newState ? "SISTEMA BLOQUEADO (Manutenção)" : "SISTEMA LIBERADO", newState ? "warning" : "success");
      setIsMaintenance(newState);
    } catch (err) {
      addToast("Erro ao atualizar manutenção. Verifique se a tabela 'configuracoes' existe.", "error");
    }
  }

  const handleHardRefresh = () => {
    addToast("Limpando cache local...", "info");
    setTimeout(() => window.location.reload(), 1000);
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed border-red-200 rounded-3xl bg-red-50">
        <Lock className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-black text-red-700 uppercase">Acesso Negado</h2>
        <p className="text-red-500 text-sm">Este painel é exclusivo para o utilizador 'dev'.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-slate-900 text-red-500 rounded-2xl shadow-xl border border-white/10">
          <Terminal size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Terminal Dev</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Controle de Infraestrutura</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DATA SCHEMA */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between min-h-[250px]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Database className="text-slate-400" size={20} />
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Data Schema</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">
              Sincronização forçada com o Supabase. Use caso note inconsistências nos dados.
            </p>
          </div>
          <button onClick={handleHardRefresh} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg">
            <RefreshCw size={16} /> Hard Refresh
          </button>
        </div>

        {/* MANUTENÇÃO */}
        <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 min-h-[250px] flex flex-col justify-between ${isMaintenance ? 'bg-red-50 border-red-500 shadow-xl' : 'bg-white border-slate-100'}`}>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Power className={isMaintenance ? 'text-red-600' : 'text-slate-400'} size={20} />
              <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Manutenção Global</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">
              Bloqueia o acesso de <strong>todos</strong> os utilizadores (exceto 'dev').
            </p>
          </div>
          <button onClick={toggleMaintenance} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${isMaintenance ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <ShieldAlert size={18} />
            {isMaintenance ? 'DESATIVAR MANUTENÇÃO' : 'ATIVAR MANUTENÇÃO'}
          </button>
        </div>
      </div>
    </div>
  );
}