import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, User, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '../contexts/ToastContext';

interface Presenca {
  id: string;
  data_aula: string;
  alunos: {
    nome: string;
    graduacao: string;
    foto_url: string;
  };
}

export default function Presencas() {
  const { addToast } = useToast();
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]); // Hoje

  useEffect(() => {
    fetchPresencas();

    const channel = supabase
      .channel('presencas_list_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presencas' }, () => fetchPresencas())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filtroData]);

  async function fetchPresencas() {
    try {
      setLoading(true);
      const inicioDia = `${filtroData}T00:00:00`;
      const fimDia = `${filtroData}T23:59:59`;

      const { data, error } = await supabase
        .from('presencas')
        .select(`
          id,
          data_aula,
          alunos (
            nome,
            graduacao,
            foto_url
          )
        `)
        .gte('data_aula', inicioDia)
        .lte('data_aula', fimDia)
        .order('data_aula', { ascending: false });

      if (error) throw error;
      setPresencas(data || []);
    } catch (error) {
      console.error('Erro ao buscar presenças:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja apagar este registro de presença?')) return;
    try {
      const { error } = await supabase.from('presencas').delete().eq('id', id);
      if (error) throw error;
      addToast('Presença removida com sucesso.', 'success');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      addToast('Erro ao excluir presença.', 'error');
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="text-blue-600" />
          Histórico de Treinos
        </h2>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-sm text-slate-500 font-medium pl-2">Data:</span>
          <input 
            type="date" 
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="outline-none text-slate-800 font-medium bg-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 animate-pulse">Carregando registos...</div>
      ) : presencas.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Nenhum treino registado</h3>
          <p className="text-slate-500">Ninguém marcou presença nesta data.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Total de Alunos: {presencas.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {presencas.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                    {p.alunos?.foto_url ? (
                      <img src={p.alunos.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{p.alunos?.nome || 'Aluno Desconhecido'}</h4>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                      {p.alunos?.graduacao}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                    <Clock size={16} className="text-blue-500" />
                    <span className="font-mono font-medium">
                      {format(parseISO(p.data_aula), 'HH:mm')}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Apagar Presença"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}