import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Trash2, Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../contexts/ToastContext';

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'Receita' | 'Despesa';
  categoria: string;
  data: string;
  aluno_id?: string;
  alunos?: { nome: string, categoria: string };
}

export default function Financeiro() {
  const { addToast } = useToast();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTurma, setFiltroTurma] = useState<'Geral' | 'Adulto' | 'Infantil' | 'Kids'>('Geral');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    descricao: '',
    valor: '',
    tipo: 'Receita' as 'Receita' | 'Despesa',
    categoria: 'Mensalidade',
    data: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { fetchDados(); }, []);

  async function fetchDados() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transacoes')
        .select(`*, alunos (nome, categoria)`)
        .order('data', { ascending: false });
      if (error) throw error;
      setTransacoes(data || []);
    } catch { addToast('Erro ao carregar.', 'error'); } 
    finally { setLoading(false); }
  }

  // ... (Funções handleEdit, handleSubmit, handleDelete iguais ao anterior, mas sem comissões)
  function handleEdit(t: Transacao) {
    setFormData({ id: t.id, descricao: t.descricao, valor: String(t.valor), tipo: t.tipo, categoria: t.categoria, data: t.data });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { descricao: formData.descricao, valor: parseFloat(formData.valor), tipo: formData.tipo, categoria: formData.categoria, data: formData.data };
      if (formData.id) await supabase.from('transacoes').update(payload).eq('id', formData.id);
      else await supabase.from('transacoes').insert([payload]);
      
      addToast('Salvo!', 'success');
      setShowForm(false);
      setFormData({ id: '', descricao: '', valor: '', tipo: 'Receita', categoria: 'Mensalidade', data: new Date().toISOString().split('T')[0] });
      fetchDados();
    } catch { addToast('Erro ao salvar.', 'error'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apagar lançamento?')) return;
    await supabase.from('transacoes').delete().eq('id', id);
    fetchDados();
  }

  const transacoesFiltradas = transacoes.filter(t => {
    if (filtroTurma === 'Geral') return true;
    if (t.tipo === 'Receita' && t.alunos) return t.alunos.categoria === filtroTurma;
    return false;
  });

  const resumo = transacoesFiltradas.reduce((acc, t) => {
    const val = Number(t.valor);
    if (t.tipo === 'Receita') acc.receitas += val; else acc.despesas += val;
    return acc;
  }, { receitas: 0, despesas: 0 });

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
        <button onClick={() => setShowForm(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex gap-2 hover:bg-slate-800 shadow-sm">
            <Plus size={20} /> Novo Lançamento
        </button>
      </div>

      <div className="flex p-1 bg-slate-200 rounded-xl w-full max-w-xl">
          {(['Geral', 'Adulto', 'Infantil', 'Kids'] as const).map((cat) => (
              <button key={cat} onClick={() => setFiltroTurma(cat)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${filtroTurma === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{cat}</button>
          ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between mb-2"><span className="text-slate-500 text-sm font-medium">Entradas</span><TrendingUp size={18} className="text-green-600"/></div>
          <h3 className="text-2xl font-bold text-green-600">R$ {resumo.receitas.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between mb-2"><span className="text-slate-500 text-sm font-medium">Saídas</span><TrendingDown size={18} className="text-red-600"/></div>
          <h3 className="text-2xl font-bold text-red-600">R$ {resumo.despesas.toFixed(2)}</h3>
        </div>
        <div className={`bg-white p-5 rounded-xl border-l-4 shadow-sm ${resumo.receitas - resumo.despesas >= 0 ? 'border-blue-500' : 'border-red-500'}`}>
          <div className="flex justify-between mb-2"><span className="text-slate-500 text-sm font-medium">Saldo</span><DollarSign size={18} className="text-slate-600"/></div>
          <h3 className={`text-2xl font-bold ${resumo.receitas - resumo.despesas >= 0 ? 'text-blue-900' : 'text-red-600'}`}>R$ {(resumo.receitas - resumo.despesas).toFixed(2)}</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr><th className="p-4">Data</th><th className="p-4">Descrição</th><th className="p-4">Categoria</th><th className="p-4 text-right">Valor</th><th className="p-4 text-right"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                {transacoesFiltradas.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 group">
                    <td className="p-4 text-slate-600 flex gap-2 items-center"><Calendar size={14}/> {format(new Date(t.data), 'dd/MM/yy')}</td>
                    <td className="p-4 font-medium text-slate-900">{t.descricao}{t.alunos && <span className="ml-2 text-xs text-slate-400 font-normal">({t.alunos.nome})</span>}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{t.categoria}</span></td>
                    <td className={`p-4 text-right font-bold ${t.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{t.tipo === 'Receita' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}</td>
                    <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleEdit(t)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                        <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between mb-4"><h3 className="font-bold">Lançamento</h3><button onClick={()=>setShowForm(false)}><X/></button></div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input className="w-full p-2 border rounded" required placeholder="Descrição" value={formData.descricao} onChange={e=>setFormData({...formData, descricao: e.target.value})} />
                    <input className="w-full p-2 border rounded" type="number" step="0.01" required placeholder="Valor" value={formData.valor} onChange={e=>setFormData({...formData, valor: e.target.value})} />
                    <div className="grid grid-cols-2 gap-2">
                        <select className="p-2 border rounded" value={formData.tipo} onChange={e=>setFormData({...formData, tipo: e.target.value as any})}><option>Receita</option><option>Despesa</option></select>
                        <input className="p-2 border rounded" type="date" value={formData.data} onChange={e=>setFormData({...formData, data: e.target.value})} />
                    </div>
                    <select className="w-full p-2 border rounded" value={formData.categoria} onChange={e=>setFormData({...formData, categoria: e.target.value})}><option>Mensalidade</option><option>Venda</option><option>Fixa</option><option>Variável</option></select>
                    <button className="w-full bg-slate-900 text-white py-2 rounded font-bold">Salvar</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}