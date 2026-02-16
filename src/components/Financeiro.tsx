import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Trash2, Edit, X, Banknote, QrCode, CreditCard, CheckCircle } from 'lucide-react';
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
  detalhes_pagamento?: any;
}

interface ItemPagamento {
  metodo: string;
  valor: string;
}

export default function Financeiro() {
  const { addToast } = useToast();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTurma, setFiltroTurma] = useState<'Geral' | 'Adulto' | 'Infantil' | 'Kids' | 'Loja'>('Geral');
  
  const [showForm, setShowForm] = useState(false);

  // --- ESTADO PARA O ALERTA PERSONALIZADO ---
  const [customAlert, setCustomAlert] = useState({ 
    show: false, 
    title: '', 
    message: '', 
    onConfirm: () => {}, 
    type: 'danger' as 'danger' | 'success' 
  });
  
  // Estado do Formulário
  const [formData, setFormData] = useState({
    id: '',
    descricao: '',
    tipo: 'Receita' as 'Receita' | 'Despesa',
    categoria: 'Mensalidade',
    data: new Date().toISOString().split('T')[0],
  });

  // NOVO: Estado para gerenciar múltiplos métodos de pagamento no formulário
  const [itensPagamento, setItensPagamento] = useState<ItemPagamento[]>([
    { metodo: 'Dinheiro', valor: '' }
  ]);

  useEffect(() => { fetchDados(); }, []);

  async function fetchDados() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('transacoes').select(`*, alunos (nome, categoria)`).order('data', { ascending: false });
      if (error) throw error;
      setTransacoes(data || []);
    } catch { addToast('Erro ao carregar.', 'error'); } finally { setLoading(false); }
  }

  // --- LÓGICA DE FILTRO E SOMA DETALHADA ---
  const transacoesFiltradas = transacoes.filter(t => {
    if (filtroTurma === 'Geral') return true;
    if (filtroTurma === 'Loja') return t.categoria === 'Venda Loja';
    if (t.tipo === 'Receita' && t.alunos) return t.alunos.categoria === filtroTurma;
    return false;
  });

  const detalhamento = transacoesFiltradas.reduce((acc, t) => {
    if (t.tipo === 'Despesa') return acc;
    
    // Tenta somar pelos métodos detalhados (prioridade)
    if (t.detalhes_pagamento?.metodos && Array.isArray(t.detalhes_pagamento.metodos)) {
        t.detalhes_pagamento.metodos.forEach((m: any) => {
            const v = Number(m.valor);
            if (m.metodo === 'Dinheiro') acc.dinheiro += v;
            else if (m.metodo === 'Pix') acc.pix += v;
            else if (m.metodo === 'Cartao') acc.credito += v;
            else if (m.metodo === 'Debito') acc.debito += v;
        });
    } 
    // Fallback para estrutura antiga ou pagamento único
    else if (t.detalhes_pagamento?.pagamento) {
        const pag = t.detalhes_pagamento.pagamento;
        const v = Number(t.valor);
        if (pag.metodo === 'Dinheiro') acc.dinheiro += v;
        else if (pag.metodo === 'Pix') acc.pix += v;
        else if (pag.metodo === 'Cartao') {
            if (pag.tipo === 'Débito') acc.debito += v; else acc.credito += v;
        }
    } else {
        // Se não tiver detalhes, assume dinheiro (ou ignora, dependendo da regra de negócio)
        // acc.dinheiro += Number(t.valor); 
    }
    
    return acc;
  }, { receitas: 0, despesas: 0, dinheiro: 0, pix: 0, credito: 0, debito: 0 });

  const resumo = transacoesFiltradas.reduce((acc, t) => {
    const val = Number(t.valor);
    if (t.tipo === 'Receita') acc.receitas += val; else acc.despesas += val;
    return acc;
  }, { receitas: 0, despesas: 0 });

  function renderPagamentoInfo(t: Transacao) {
      if (!t.detalhes_pagamento) return <span className="text-slate-400">-</span>;
      const dp = t.detalhes_pagamento;
      
      // Renderiza múltiplos métodos
      if (dp.metodos && Array.isArray(dp.metodos)) {
          return (
            <div className="flex flex-col gap-1">
                {dp.metodos.map((m: any, idx: number) => (
                    <span key={idx} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block w-fit">
                        {m.metodo}: R${Number(m.valor).toFixed(2)}
                    </span>
                ))}
            </div>
          );
      }
      
      // Renderiza método único (legado)
      if (dp.pagamento?.metodo) {
          const m = dp.pagamento.metodo;
          const detalhe = m === 'Cartao' ? `(${dp.pagamento.tipo || ''} ${dp.pagamento.parcelas || ''}x)` : '';
          return <span className="text-xs font-medium text-slate-700">{m} {detalhe}</span>;
      }
      return <span className="text-slate-400">-</span>;
  }

  const MiniCard = ({ label, value, icon: Icon, colorClass }: any) => (
      <div className={`flex items-center gap-3 p-3 rounded-xl border border-opacity-50 bg-white ${colorClass}`}>
          <div className="p-2 rounded-lg bg-white bg-opacity-50"><Icon size={16}/></div>
          <div><p className="text-[10px] uppercase font-bold text-slate-500">{label}</p><p className="font-bold text-slate-800">{value}</p></div>
      </div>
  );

  function handleEdit(t: Transacao) {
    // 1. Recupera os métodos de pagamento existentes
    let metodosIniciais: ItemPagamento[] = [];

    if (t.detalhes_pagamento?.metodos && Array.isArray(t.detalhes_pagamento.metodos)) {
        // Se já for o novo formato de array
        metodosIniciais = t.detalhes_pagamento.metodos.map((m: any) => ({
            metodo: m.metodo,
            valor: String(m.valor)
        }));
    } else if (t.detalhes_pagamento?.pagamento) {
        // Se for o formato antigo (objeto único)
        metodosIniciais = [{
            metodo: t.detalhes_pagamento.pagamento.metodo || 'Dinheiro',
            valor: String(t.valor)
        }];
    } else {
        // Fallback total
        metodosIniciais = [{ metodo: 'Dinheiro', valor: String(t.valor) }];
    }

    setItensPagamento(metodosIniciais);

    setFormData({ 
        id: t.id, 
        descricao: t.descricao, 
        tipo: t.tipo, 
        categoria: t.categoria, 
        data: t.data
    });
    setShowForm(true);
  }

  function handleNovoLancamento() {
      setFormData({ 
          id: '', 
          descricao: '', 
          tipo: 'Receita', 
          categoria: 'Mensalidade', 
          data: new Date().toISOString().split('T')[0] 
      });
      setItensPagamento([{ metodo: 'Dinheiro', valor: '' }]);
      setShowForm(true);
  }

  // Funções para manipular a lista de pagamentos no form
  function updateItemPagamento(index: number, field: keyof ItemPagamento, value: string) {
      const newItens = [...itensPagamento];
      newItens[index] = { ...newItens[index], [field]: value };
      setItensPagamento(newItens);
  }

  function addItemPagamento() {
      setItensPagamento([...itensPagamento, { metodo: 'Dinheiro', valor: '' }]);
  }

  function removeItemPagamento(index: number) {
      if (itensPagamento.length === 1) return; // Mantém pelo menos um
      const newItens = itensPagamento.filter((_, i) => i !== index);
      setItensPagamento(newItens);
  }

  // Calcula o total dinamicamente baseado nos inputs
  const totalCalculado = itensPagamento.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (totalCalculado <= 0) {
          addToast('O valor total deve ser maior que zero.', 'error');
          return;
      }

      // Monta o objeto de detalhes padronizado como 'metodos' (array)
      // Isso resolve o problema de edição futura
      const detalhes = {
          metodos: itensPagamento.map(item => ({
              metodo: item.metodo,
              valor: Number(item.valor)
          })),
          // Mantemos compatibilidade básica se necessário, mas o sistema agora prioriza 'metodos'
          pagamento: {
              metodo: itensPagamento.length > 1 ? 'Misto' : itensPagamento[0].metodo
          }
      };

      const payload = { 
          descricao: formData.descricao, 
          valor: totalCalculado, // O valor total é a soma dos métodos
          tipo: formData.tipo, 
          categoria: formData.categoria, 
          data: formData.data,
          detalhes_pagamento: detalhes 
      };

      if (formData.id) await supabase.from('transacoes').update(payload).eq('id', formData.id); 
      else await supabase.from('transacoes').insert([payload]);
      
      addToast('Salvo!', 'success'); 
      setShowForm(false); 
      fetchDados();
    } catch { addToast('Erro ao salvar.', 'error'); }
  }

  async function handleDelete(id: string) { 
    try {
        await supabase.from('transacoes').delete().eq('id', id); 
        addToast('Lançamento removido!', 'success');
        fetchDados(); 
    } catch {
        addToast('Erro ao excluir lançamento.', 'error');
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
          <button onClick={handleNovoLancamento} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex gap-2 hover:bg-slate-800 shadow-sm">
              <Plus size={20} /> Novo Lançamento
          </button>
      </div>

      {/* ... (Barras de filtro e Cards de Resumo permanecem iguais) ... */}
      <div className="flex p-1 bg-slate-200 rounded-xl w-full max-w-2xl overflow-x-auto">
          {['Geral', 'Adulto', 'Infantil', 'Kids', 'Loja'].map((cat) => (
              <button key={cat} onClick={() => setFiltroTurma(cat as any)} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filtroTurma === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{cat === 'Geral' || cat === 'Loja' ? cat : `Turma ${cat}`}</button>
          ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm"><div className="flex justify-between mb-2"><span className="text-slate-500 text-sm font-medium">Entradas</span><TrendingUp size={18} className="text-green-600"/></div><h3 className="text-2xl font-bold text-green-600">R$ {resumo.receitas.toFixed(2)}</h3></div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm"><div className="flex justify-between mb-2"><span className="text-slate-500 text-sm font-medium">Saídas</span><TrendingDown size={18} className="text-red-600"/></div><h3 className="text-2xl font-bold text-red-600">R$ {resumo.despesas.toFixed(2)}</h3></div>
        <div className={`bg-white p-5 rounded-xl border-l-4 shadow-sm ${resumo.receitas - resumo.despesas >= 0 ? 'border-blue-500' : 'border-red-500'}`}><div className="flex justify-between mb-2"><span className="text-slate-500 text-sm font-medium">Saldo</span><DollarSign size={18} className="text-slate-600"/></div><h3 className={`text-2xl font-bold ${resumo.receitas - resumo.despesas >= 0 ? 'text-blue-900' : 'text-red-600'}`}>R$ {(resumo.receitas - resumo.despesas).toFixed(2)}</h3></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniCard label="Dinheiro" value={`R$ ${detalhamento.dinheiro.toFixed(0)}`} icon={Banknote} colorClass="border-green-200 bg-green-50 text-green-700" />
          <MiniCard label="Pix" value={`R$ ${detalhamento.pix.toFixed(0)}`} icon={QrCode} colorClass="border-teal-200 bg-teal-50 text-teal-700" />
          <MiniCard label="Crédito" value={`R$ ${detalhamento.credito.toFixed(0)}`} icon={CreditCard} colorClass="border-blue-200 bg-blue-50 text-blue-700" />
          <MiniCard label="Débito" value={`R$ ${detalhamento.debito.toFixed(0)}`} icon={CreditCard} colorClass="border-indigo-200 bg-indigo-50 text-indigo-700" />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider"><tr><th className="p-4">Data</th><th className="p-4">Descrição</th><th className="p-4">Categoria</th><th className="p-4">Pagamento</th><th className="p-4 text-right">Valor</th><th className="p-4 text-right"></th></tr></thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                {transacoesFiltradas.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 group">
                    <td className="p-4 text-slate-600 flex gap-2 items-center"><Calendar size={14}/> {format(new Date(t.data), 'dd/MM/yy')}</td>
                    <td className="p-4 font-medium text-slate-900">{t.descricao}{t.alunos && <span className="block text-xs text-slate-400 font-normal">{t.alunos.nome}</span>}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{t.categoria}</span></td>
                    <td className="p-4 align-top">{renderPagamentoInfo(t)}</td>
                    <td className={`p-4 text-right font-bold ${t.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{t.tipo === 'Receita' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}</td>
                    <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleEdit(t)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                        <button 
                            onClick={() => setCustomAlert({
                                show: true, title: 'Apagar Registro?', message: `Deseja realmente remover "${t.descricao}"?`, type: 'danger', onConfirm: () => handleDelete(t.id)
                            })} 
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                            <Trash2 size={16}/>
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between mb-4"><h3 className="font-bold">Lançamento / Edição</h3><button onClick={()=>setShowForm(false)}><X/></button></div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input className="w-full p-2 border rounded" required placeholder="Descrição (Ex: Compra Tablet)" value={formData.descricao} onChange={e=>setFormData({...formData, descricao: e.target.value})} />
                    
                    <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <label className="text-xs font-bold text-slate-500 uppercase">Métodos de Pagamento</label>
                        {itensPagamento.map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <select 
                                    className="p-2 border rounded text-sm w-1/3" 
                                    value={item.metodo} 
                                    onChange={e => updateItemPagamento(index, 'metodo', e.target.value)}
                                >
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Pix">Pix</option>
                                    <option value="Cartao">Cartão</option>
                                    <option value="Debito">Débito</option>
                                </select>
                                <input 
                                    className="p-2 border rounded text-sm flex-1" 
                                    type="number" step="0.01" 
                                    placeholder="Valor" 
                                    value={item.valor} 
                                    onChange={e => updateItemPagamento(index, 'valor', e.target.value)} 
                                />
                                {itensPagamento.length > 1 && (
                                    <button type="button" onClick={() => removeItemPagamento(index)} className="text-red-500 hover:bg-red-100 p-2 rounded"><Trash2 size={16}/></button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addItemPagamento} className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:underline">
                            <Plus size={14}/> Adicionar outro meio
                        </button>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                            <span className="font-bold text-slate-600 text-sm">Total da Transação:</span>
                            <span className="font-bold text-lg text-slate-800">R$ {totalCalculado.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select className="p-2 border rounded" value={formData.tipo} onChange={e=>setFormData({...formData, tipo: e.target.value as any})}><option value="Receita">Receita (+)</option><option value="Despesa">Despesa (-)</option></select>
                        <input className="p-2 border rounded" type="date" value={formData.data} onChange={e=>setFormData({...formData, data: e.target.value})} />
                    </div>

                    <select className="w-full p-2 border rounded" value={formData.categoria} onChange={e=>setFormData({...formData, categoria: e.target.value})}><option value="Mensalidade">Mensalidade</option><option value="Venda">Venda Loja</option><option value="Fixa">Despesa Fixa</option><option value="Variável">Despesa Variável</option><option value="Pessoal">Pessoal</option></select>
                    
                    <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                        Salvar Lançamento
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL DE ALERTA PERSONALIZADO (Mantido igual) */}
      {customAlert.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center border border-white">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${customAlert.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {customAlert.type === 'danger' ? <Trash2 size={40} /> : <CheckCircle size={40} />}
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic mb-2">{customAlert.title}</h3>
            <p className="text-slate-500 mb-8 leading-relaxed font-medium">{customAlert.message}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { customAlert.onConfirm(); setCustomAlert({ ...customAlert, show: false }); }}
                className={`w-full py-4 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all ${customAlert.type === 'danger' ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700' : 'bg-green-600 text-white shadow-green-200 hover:bg-green-700'}`}
              >
                Confirmar
              </button>
              <button 
                onClick={() => setCustomAlert({ ...customAlert, show: false })}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-bold uppercase text-xs tracking-widest hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}