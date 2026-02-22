import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Trash2, Edit3, X, 
  Banknote, QrCode, CreditCard, Search, Bell, CheckCircle, AlertCircle, 
  FileText, Repeat, CalendarClock, ArrowRight 
} from 'lucide-react';
import { format, isSameDay, isAfter, isBefore, addDays, parseISO, addMonths, addWeeks } from 'date-fns';
import { useToast } from '../contexts/ToastContext';

interface Transacao {
  id: string; 
  descricao: string; 
  valor: number; 
  tipo: 'Receita' | 'Despesa' | 'Pendente' | 'Conta a Pagar'; 
  categoria: string; 
  data: string; 
  aluno_id?: string; 
  alunos?: { nome: string, categoria: string, plano_tipo?: string }; 
  detalhes_pagamento?: any; 
  mes_referencia?: string;
}

interface ItemPagamento { metodo: string; valor: string; }

export default function Financeiro() {
  const { addToast } = useToast();
  
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [contasPagar, setContasPagar] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<'extrato' | 'contas_pagar'>('extrato');
  
  // Atualizado para os novos filtros de adulto
  const [filtroTurma, setFiltroTurma] = useState<'Geral' | 'Adulto (Todos)' | 'Adulto (3 Dias)' | 'Adulto (2 Dias)' | 'Infantil' | 'Kids' | 'Loja'>('Geral');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', message: '', onConfirm: () => {}, type: 'danger' as 'danger' | 'success' });

  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));

  const [formData, setFormData] = useState({ 
    id: '', descricao: '', tipo: 'Receita' as any, categoria: 'Mensalidade', 
    data: new Date().toISOString().split('T')[0], codigo_barras: '' 
  });
  const [itensPagamento, setItensPagamento] = useState<ItemPagamento[]>([{ metodo: 'Dinheiro', valor: '' }]);
  
  const [isParcelamento, setIsParcelamento] = useState(false);
  const [configParcelas, setConfigParcelas] = useState({ qtd: 2, intervalo: 'Mensal' });
  const [parcelasPreview, setParcelasPreview] = useState<any[]>([]);

  useEffect(() => { fetchDados(); }, []);

  async function fetchDados() {
    try {
      setLoading(true);
      // Alterado para buscar também o plano_tipo do aluno
      const { data, error } = await supabase.from('transacoes')
        .select(`*, alunos (nome, categoria, plano_tipo)`)
        .neq('tipo', 'Pendente') 
        .order('data', { ascending: false });
      
      if (error) throw error;
      
      const todos = data || [];
      setTransacoes(todos.filter((t: Transacao) => t.tipo === 'Receita' || t.tipo === 'Despesa'));
      setContasPagar(todos.filter((t: Transacao) => t.tipo === 'Conta a Pagar').sort((a:Transacao, b:Transacao) => a.data.localeCompare(b.data)));
      
    } catch { addToast('Erro ao carregar.', 'error'); } finally { setLoading(false); }
  }

  async function handleDelete(transacao: Transacao) { 
    try {
        if (transacao.categoria === 'Venda Loja' && transacao.detalhes_pagamento?.itens) {
            const itens = transacao.detalhes_pagamento.itens;
            if (Array.isArray(itens)) {
                for (const item of itens) {
                    if (item.produto_id && item.qtd) {
                        const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single();
                        if (prod) await supabase.from('produtos').update({ estoque: prod.estoque + Number(item.qtd) }).eq('id', item.produto_id);
                    }
                }
            }
        }
        await supabase.from('transacoes').delete().eq('id', transacao.id); 
        addToast('Apagado com sucesso!', 'success');
        fetchDados(); 
    } catch (error) { console.error(error); addToast('Erro ao excluir.', 'error'); }
  }

  async function handleBaixarConta(conta: Transacao) {
    try {
        await supabase.from('transacoes').update({
            tipo: 'Despesa', 
            descricao: `${conta.descricao}`
        }).eq('id', conta.id);
        
        addToast('Conta paga! Agora ela aparece no Extrato.', 'success');
        fetchDados();
    } catch { addToast('Erro ao dar baixa.', 'error'); }
  }

  function handleNovoLancamento() { 
      setFormData({ 
          id: '', descricao: '', tipo: view === 'contas_pagar' ? 'Conta a Pagar' : 'Receita', 
          categoria: 'Mensalidade', data: new Date().toISOString().split('T')[0], codigo_barras: '' 
      }); 
      setItensPagamento([{ metodo: 'Dinheiro', valor: '' }]); 
      setIsParcelamento(false);
      setParcelasPreview([]);
      setShowForm(true); 
  }

  function handleToggleParcelamento() {
      const novoEstado = !isParcelamento;
      setIsParcelamento(novoEstado);
      setParcelasPreview([]);
      if (novoEstado && formData.tipo === 'Despesa') {
          setFormData(prev => ({ ...prev, tipo: 'Conta a Pagar' }));
          addToast('Modo Parcelado: Tipo alterado para "Conta a Pagar" (Agendamento).', 'info');
      }
  }

  function handleEdit(t: Transacao) {
      setFormData({
          id: t.id, descricao: t.descricao, tipo: t.tipo, categoria: t.categoria,
          data: t.data, codigo_barras: t.detalhes_pagamento?.codigo_barras || ''
      });
      
      if (t.detalhes_pagamento?.metodos) {
          setItensPagamento(t.detalhes_pagamento.metodos.map((m: any) => ({ metodo: m.metodo, valor: m.valor.toString() })));
      } else {
          setItensPagamento([{ metodo: 'Dinheiro', valor: t.valor.toString() }]);
      }

      setIsParcelamento(false); 
      setParcelasPreview([]);
      setShowForm(true);
  }

  function gerarParcelasPreview() {
      const valorTotal = itensPagamento.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
      const valorParcela = valorTotal / configParcelas.qtd;
      const novasParcelas = [];
      
      let dataBase = parseISO(formData.data);

      for (let i = 0; i < configParcelas.qtd; i++) {
          let dataVenc = dataBase;
          if (i > 0) {
              if (configParcelas.intervalo === 'Mensal') dataVenc = addMonths(dataBase, i);
              else if (configParcelas.intervalo === 'Semanal') dataVenc = addWeeks(dataBase, i);
          }
          
          novasParcelas.push({
              id_temp: i,
              descricao: `${formData.descricao} (${i + 1}/${configParcelas.qtd})`,
              valor: valorParcela.toFixed(2),
              data: format(dataVenc, 'yyyy-MM-dd')
          });
      }
      setParcelasPreview(novasParcelas);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const detalhesBase = { 
          metodos: itensPagamento.map(item => ({ metodo: item.metodo, valor: Number(item.valor) })),
          codigo_barras: formData.codigo_barras
      };
      
      if (isParcelamento && parcelasPreview.length > 0) {
          const payloadBatch = parcelasPreview.map(p => ({
              descricao: p.descricao,
              valor: Number(p.valor),
              tipo: formData.tipo, 
              categoria: formData.categoria,
              data: p.data,
              detalhes_pagamento: { ...detalhesBase, metodos: [{ metodo: 'Parcelado', valor: Number(p.valor) }] }
          }));
          const { error } = await supabase.from('transacoes').insert(payloadBatch);
          if (error) throw error;
      } else {
          const valorTotal = itensPagamento.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
          const payload = { 
              descricao: formData.descricao, valor: valorTotal, tipo: formData.tipo, 
              categoria: formData.categoria, data: formData.data, detalhes_pagamento: detalhesBase 
          };

          if (formData.id) await supabase.from('transacoes').update(payload).eq('id', formData.id); 
          else await supabase.from('transacoes').insert([payload]);
      }

      addToast('Salvo com sucesso!', 'success'); setShowForm(false); fetchDados();
    } catch { addToast('Erro ao salvar.', 'error'); }
  }

  // --- FILTROS MÁGICOS DE MÊS E TURMA ---
  const targetRef = format(parseISO(`${mesSelecionado}-01`), 'MM/yyyy');

  const transacoesFiltradas = transacoes.filter(t => {
    // Filtro de Mês (Baseado na referência ou na data)
    const ref = t.mes_referencia || format(parseISO(t.data), 'MM/yyyy');
    if (ref !== targetRef) return false;

    // Nova Lógica de Filtro por Turma/Plano
    let matchTurma = false;
    
    if (filtroTurma === 'Geral') {
        matchTurma = true;
    } else if (filtroTurma === 'Loja') {
        matchTurma = t.categoria === 'Venda Loja';
    } else if (t.tipo === 'Receita' && t.alunos) {
        if (filtroTurma === 'Adulto (Todos)') {
            matchTurma = t.alunos.categoria === 'Adulto' && (!t.alunos.plano_tipo || t.alunos.plano_tipo === 'Todos os dias');
        } else if (filtroTurma === 'Adulto (3 Dias)') {
            matchTurma = t.alunos.categoria === 'Adulto' && t.alunos.plano_tipo === '3 Dias';
        } else if (filtroTurma === 'Adulto (2 Dias)') {
            matchTurma = t.alunos.categoria === 'Adulto' && t.alunos.plano_tipo === '2 Dias';
        } else {
            matchTurma = t.alunos.categoria === filtroTurma;
        }
    }

    const matchBusca = t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || (t.alunos?.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchTurma && matchBusca;
  });

  const contasPagarFiltradas = contasPagar.filter(t => {
      const ref = t.mes_referencia || format(parseISO(t.data), 'MM/yyyy');
      return ref === targetRef;
  });

  const resumo = transacoesFiltradas.reduce((acc, t) => { const val = Number(t.valor); if (t.tipo === 'Receita') acc.receitas += val; else acc.despesas += val; return acc; }, { receitas: 0, despesas: 0 });
  
  const detalhamento = transacoesFiltradas.reduce((acc, t) => {
    if (t.tipo !== 'Receita') return acc;
    if (t.detalhes_pagamento?.metodos && Array.isArray(t.detalhes_pagamento.metodos)) {
        t.detalhes_pagamento.metodos.forEach((m: any) => {
            const v = Number(m.valor);
            if (m.metodo === 'Dinheiro') acc.dinheiro += v; else if (m.metodo === 'Pix') acc.pix += v; else if (m.metodo === 'Cartao') acc.credito += v; else if (m.metodo === 'Debito') acc.debito += v;
        });
    } else if (t.detalhes_pagamento?.pagamento) {
        const pag = t.detalhes_pagamento.pagamento; const v = Number(t.valor);
        if (pag.metodo === 'Dinheiro') acc.dinheiro += v; else if (pag.metodo === 'Pix') acc.pix += v; else if (pag.metodo === 'Cartao') { if (pag.tipo === 'Débito') acc.debito += v; else acc.credito += v; }
    }
    return acc;
  }, { dinheiro: 0, pix: 0, credito: 0, debito: 0 });

  const hoje = new Date();
  const amanha = addDays(hoje, 1);
  const temNotificacao = contasPagarFiltradas.some(c => {
      const d = parseISO(c.data);
      return isSameDay(d, hoje) || isSameDay(d, amanha) || isBefore(d, hoje);
  });

  function getStatusColor(dataString: string) {
      const d = dataString; const h = format(hoje, 'yyyy-MM-dd');
      if (d < h) return 'bg-red-50 border-red-100 text-red-600'; 
      if (d === h) return 'bg-yellow-50 border-yellow-100 text-yellow-600'; 
      return 'bg-green-50 border-green-100 text-green-600'; 
  }

  const MiniCard = ({ label, value, icon: Icon, colorClass }: any) => (
      <div className={`flex items-center gap-3 p-3 rounded-2xl border border-opacity-50 bg-white shadow-sm ${colorClass}`}>
          <div className="p-2.5 rounded-xl bg-white bg-opacity-60">
            <Icon size={18}/>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold opacity-70">{label}</p>
            <p className="font-bold text-lg">{value}</p>
          </div>
      </div>
  );

  const TransactionCard = ({ t, isConta = false }: { t: Transacao, isConta?: boolean }) => {
      const statusColor = isConta ? getStatusColor(t.data) : (t.tipo === 'Receita' ? 'text-green-600' : 'text-red-600');
      return (
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-3 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                  <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">{t.categoria}</span>
                      <h4 className="font-bold text-slate-800 text-lg leading-tight">{t.descricao}</h4>
                      {t.alunos && <span className="text-xs text-slate-500">{t.alunos.nome} <span className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">{t.alunos.plano_tipo || 'Padrão'}</span></span>}
                  </div>
                  <div className={`font-black text-lg ${isConta ? 'text-slate-700' : statusColor}`}>
                      {!isConta && (t.tipo === 'Receita' ? '+' : '-')} R$ {Number(t.valor).toFixed(2)}
                  </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className={`flex items-center gap-2 text-sm font-medium ${isConta ? (statusColor.includes('red') ? 'text-red-600' : statusColor.includes('yellow') ? 'text-yellow-600' : 'text-slate-500') : 'text-slate-500'}`}>
                      <Calendar size={16}/> {format(parseISO(t.data), 'dd/MM/yy')}
                      {isConta && <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${statusColor}`}>
                          {statusColor.includes('red') ? 'Vencida' : statusColor.includes('yellow') ? 'Hoje' : 'Em Aberto'}
                      </span>}
                  </div>
                  <div className="flex gap-2">
                      {isConta && (
                          <button onClick={() => setCustomAlert({show: true, title: 'Confirmar Pagamento', message: `Deseja baixar "${t.descricao}"? Ela será movida para o Extrato como Despesa realizada.`, type: 'success', onConfirm: () => handleBaixarConta(t)})} className="p-2 rounded-xl bg-green-50 text-green-600 active:scale-95 transition-transform"><CheckCircle size={20}/></button>
                      )}
                      <button onClick={() => handleEdit(t)} className="p-2 rounded-xl bg-blue-50 text-blue-600 active:scale-95 transition-transform"><Edit3 size={20}/></button>
                      <button onClick={() => setCustomAlert({show: true, title: 'Excluir', message: 'Tem certeza?', type: 'danger', onConfirm: () => handleDelete(t)})} className="p-2 rounded-xl bg-red-50 text-red-600 active:scale-95 transition-transform"><Trash2 size={20}/></button>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="animate-fadeIn pb-24 md:pb-10 max-w-full overflow-hidden">
      
      <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Financeiro</h2>
                  <p className="text-slate-500 text-sm">Gerencie o fluxo de caixa do CT.</p>
              </div>
              
              <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto self-start items-center gap-2">
                  <div className="flex bg-white px-2 rounded-xl shadow-sm border border-slate-200">
                      <Calendar className="text-blue-500" size={18} />
                      <input 
                          type="month" 
                          value={mesSelecionado}
                          onChange={(e) => setMesSelecionado(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 font-bold text-slate-700 text-sm w-36"
                      />
                  </div>
                  
                  <button onClick={() => setView('extrato')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'extrato' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Extrato</button>
                  <button onClick={() => setView('contas_pagar')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${view === 'contas_pagar' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      A Pagar
                      {temNotificacao && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ring-2 ring-white"></span>}
                  </button>
              </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {view === 'extrato' ? (
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                    {['Geral', 'Adulto (Todos)', 'Adulto (3 Dias)', 'Adulto (2 Dias)', 'Infantil', 'Kids', 'Loja'].map((cat) => (
                        <button 
                            key={cat} 
                            onClick={() => setFiltroTurma(cat as any)} 
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${filtroTurma === cat ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {cat === 'Geral' ? 'Tudo' : cat}
                        </button>
                    ))}
                </div>
              ) : <div className="hidden md:block"></div>}
              
              <div className="flex gap-2 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"/>
                 </div>
                 <button onClick={handleNovoLancamento} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 whitespace-nowrap">
                    <Plus size={20} /> <span className="hidden md:inline">Novo Lançamento</span>
                 </button>
              </div>
          </div>
      </div>

      {/* --- DASHBOARD EXTRATO --- */}
      {view === 'extrato' && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><div className="flex justify-between mb-1"><span className="text-slate-400 text-xs font-bold uppercase">Entradas</span><div className="p-1.5 bg-green-50 rounded-lg text-green-600"><TrendingUp size={16}/></div></div><h3 className="text-2xl font-black text-slate-800">R$ {resumo.receitas.toFixed(2)}</h3></div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><div className="flex justify-between mb-1"><span className="text-slate-400 text-xs font-bold uppercase">Saídas (Pagas)</span><div className="p-1.5 bg-red-50 rounded-lg text-red-600"><TrendingDown size={16}/></div></div><h3 className="text-2xl font-black text-slate-800">R$ {resumo.despesas.toFixed(2)}</h3></div>
                <div className={`bg-white p-5 rounded-2xl border-l-4 shadow-sm ${resumo.receitas - resumo.despesas >= 0 ? 'border-blue-500' : 'border-red-500'}`}><div className="flex justify-between mb-1"><span className="text-slate-400 text-xs font-bold uppercase">Saldo Líquido</span><div className="p-1.5 bg-slate-100 rounded-lg text-slate-600"><DollarSign size={16}/></div></div><h3 className={`text-2xl font-black ${resumo.receitas - resumo.despesas >= 0 ? 'text-blue-600' : 'text-red-600'}`}>R$ {(resumo.receitas - resumo.despesas).toFixed(2)}</h3></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniCard label="Dinheiro" value={`R$ ${detalhamento.dinheiro.toFixed(0)}`} icon={Banknote} colorClass="border-green-200 bg-green-50 text-green-700" />
                <MiniCard label="Pix" value={`R$ ${detalhamento.pix.toFixed(0)}`} icon={QrCode} colorClass="border-teal-200 bg-teal-50 text-teal-700" />
                <MiniCard label="Crédito" value={`R$ ${detalhamento.credito.toFixed(0)}`} icon={CreditCard} colorClass="border-blue-200 bg-blue-50 text-blue-700" />
                <MiniCard label="Débito" value={`R$ ${detalhamento.debito.toFixed(0)}`} icon={CreditCard} colorClass="border-indigo-200 bg-indigo-50 text-indigo-700" />
            </div>

            <div className="md:hidden flex flex-col gap-2">
                {transacoesFiltradas.length > 0 ? transacoesFiltradas.map(t => <TransactionCard key={t.id} t={t} />) : <div className="text-center p-8 text-slate-400">Nenhum registro neste filtro.</div>}
            </div>

            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <tr><th className="p-5">Data</th><th className="p-5">Descrição</th><th className="p-5">Categoria</th><th className="p-5 text-right">Valor</th><th className="p-5 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {transacoesFiltradas.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 group transition-colors">
                            <td className="p-5 font-mono text-slate-500">{format(parseISO(t.data), 'dd/MM/yy')}</td>
                            <td className="p-5 font-medium">
                                {t.descricao}
                                {t.alunos && <div className="text-xs text-slate-400 font-normal mt-0.5">{t.alunos.nome} • <span className="italic">{t.alunos.plano_tipo || 'Padrão'}</span></div>}
                            </td>
                            <td className="p-5"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{t.categoria}</span></td>
                            <td className={`p-5 text-right font-bold ${t.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{t.tipo === 'Receita' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}</td>
                            <td className="p-5 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(t)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg"><Edit3 size={18}/></button>
                                    <button onClick={() => setCustomAlert({show: true, title: 'Apagar?', message: `Remover "${t.descricao}"?`, type: 'danger', onConfirm: () => handleDelete(t)})} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={18}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- DASHBOARD CONTAS A PAGAR --- */}
      {view === 'contas_pagar' && (
        <div className="space-y-4">
             {temNotificacao && (
                  <div className="bg-orange-50 border border-orange-200 text-orange-900 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                      <div className="bg-orange-100 p-2 rounded-full"><Bell size={20} className="text-orange-600" /></div>
                      <div><p className="font-bold text-sm">Contas Vencendo</p><p className="text-xs opacity-80">Você tem contas para pagar hoje ou amanhã.</p></div>
                  </div>
              )}

             <div className="md:hidden flex flex-col gap-2">
                {contasPagarFiltradas.length > 0 ? contasPagarFiltradas.map(t => <TransactionCard key={t.id} t={t} isConta={true} />) : <div className="text-center p-8 text-slate-400">Nenhuma conta agendada para este mês.</div>}
            </div>

            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <tr><th className="p-5">Vencimento</th><th className="p-5">Descrição</th><th className="p-5">Status</th><th className="p-5 text-right">Valor</th><th className="p-5 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {contasPagarFiltradas.map(t => {
                            const statusColor = getStatusColor(t.data);
                            return (
                                <tr key={t.id} className="hover:bg-slate-50 group transition-colors">
                                    <td className="p-5 font-bold text-slate-600 flex items-center gap-2"><Calendar size={16}/>{format(parseISO(t.data), 'dd/MM/yy')}</td>
                                    <td className="p-5 font-medium">{t.descricao}<div className="text-xs text-slate-400">{t.detalhes_pagamento?.codigo_barras || t.categoria}</div></td>
                                    <td className="p-5"><span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase ${statusColor}`}>{statusColor.includes('red') ? 'Vencida' : statusColor.includes('yellow') ? 'Vence Hoje' : 'Em Aberto'}</span></td>
                                    <td className="p-5 text-right font-bold">R$ {Number(t.valor).toFixed(2)}</td>
                                    <td className="p-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button title="Pagar" onClick={() => setCustomAlert({show: true, title: 'Confirmar Pagamento', message: `Confirmar pagamento de ${t.descricao}?`, type: 'success', onConfirm: () => handleBaixarConta(t)})} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg"><CheckCircle size={18}/></button>
                                            <button title="Editar" onClick={() => handleEdit(t)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg"><Edit3 size={18}/></button>
                                            <button title="Excluir" onClick={() => setCustomAlert({show: true, title: 'Apagar?', message: 'Remover conta?', type: 'danger', onConfirm: () => handleDelete(t)})} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
            <div className="bg-white rounded-t-[2rem] md:rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col animate-slideUp md:animate-fadeIn">
                
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2rem] md:rounded-t-3xl sticky top-0 z-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">{formData.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                        <p className="text-xs text-slate-500">{formData.id ? 'Ajuste os dados abaixo' : 'Preencha os dados do financeiro'}</p>
                    </div>
                    <button onClick={()=>setShowForm(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20}/></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    
                    {!formData.id && (
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                            <button type="button" onClick={() => { setIsParcelamento(false); setParcelasPreview([]); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isParcelamento ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Único</button>
                            <button type="button" onClick={handleToggleParcelamento} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isParcelamento ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Repeat size={14}/> Recorrente / Parcelado</button>
                        </div>
                    )}

                    {isParcelamento && parcelasPreview.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <CalendarClock size={20} />
                                <div className="text-xs">
                                    <span className="font-bold block">Conferência de Agendamento</span>
                                    Isso criará <strong>{parcelasPreview.length} Contas a Pagar</strong>. Elas não afetarão o saldo até você dar baixa.
                                </div>
                            </div>
                            
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {parcelasPreview.map((p, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div className="text-xs font-bold text-slate-400 w-8 text-center">{idx+1}x</div>
                                        <input type="date" value={p.data} onChange={e => {
                                            const newArr = [...parcelasPreview]; newArr[idx].data = e.target.value; setParcelasPreview(newArr);
                                        }} className="bg-white border rounded p-1 text-sm w-32" />
                                        <input type="text" value={p.descricao} onChange={e => {
                                            const newArr = [...parcelasPreview]; newArr[idx].descricao = e.target.value; setParcelasPreview(newArr);
                                        }} className="bg-white border rounded p-1 text-sm flex-1 min-w-0" />
                                        <input type="number" step="0.01" value={p.valor} onChange={e => {
                                            const newArr = [...parcelasPreview]; newArr[idx].valor = e.target.value; setParcelasPreview(newArr);
                                        }} className="bg-white border rounded p-1 text-sm w-20 text-right" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setParcelasPreview([])} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl">Voltar</button>
                                <button onClick={handleSubmit} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200">Confirmar ({parcelasPreview.length}x)</button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Descrição</label>
                                    <input className="w-full p-3 bg-slate-50 border-transparent focus:bg-white border focus:border-blue-500 rounded-xl transition-all font-medium" required placeholder="Ex: Kimono, Conta de Luz..." value={formData.descricao} onChange={e=>setFormData({...formData, descricao: e.target.value})} />
                                </div>

                                {isParcelamento && (
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center"><h4 className="font-bold text-blue-800 text-sm">Configurar Repetição</h4><Repeat size={16} className="text-blue-500"/></div>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-blue-600 uppercase">Qtd. Parcelas</label>
                                                <input type="number" min="2" max="60" className="w-full p-2 rounded-lg border-blue-200 focus:ring-blue-500" value={configParcelas.qtd} onChange={e => setConfigParcelas({...configParcelas, qtd: Number(e.target.value)})} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-blue-600 uppercase">Intervalo</label>
                                                <select className="w-full p-2 rounded-lg border-blue-200 bg-white" value={configParcelas.intervalo} onChange={e => setConfigParcelas({...configParcelas, intervalo: e.target.value})}>
                                                    <option value="Mensal">Mensal</option><option value="Semanal">Semanal</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{isParcelamento ? 'Valor TOTAL (será dividido)' : 'Valor e Métodos'}</label>
                                    {itensPagamento.map((item, index) => (
                                        <div key={index} className="flex gap-2">
                                            {!isParcelamento && view !== 'contas_pagar' && (
                                                <select className="p-3 bg-slate-50 border rounded-xl text-sm font-medium w-1/3" value={item.metodo} onChange={e => {const n=[...itensPagamento]; n[index].metodo=e.target.value; setItensPagamento(n)}}><option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartao">Cartão</option></select>
                                            )}
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                                <input className="w-full p-3 pl-8 bg-slate-50 border rounded-xl font-bold text-slate-700" type="number" step="0.01" placeholder="0,00" value={item.valor} onChange={e => {const n=[...itensPagamento]; n[index].valor=e.target.value; setItensPagamento(n)}} />
                                            </div>
                                            {!isParcelamento && itensPagamento.length > 1 && <button type="button" onClick={() => {const n=[...itensPagamento];n.splice(index,1);setItensPagamento(n)}} className="text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18}/></button>}
                                        </div>
                                    ))}
                                    {!isParcelamento && view !== 'contas_pagar' && <button type="button" onClick={()=>{setItensPagamento([...itensPagamento, {metodo:'Dinheiro', valor:''}])}} className="text-xs text-blue-600 font-bold ml-1 hover:underline">+ Adicionar outro método</button>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tipo do Lançamento</label>
                                        <select className="w-full p-3 bg-slate-50 border rounded-xl font-medium" disabled={view === 'contas_pagar'} value={formData.tipo} onChange={e=>setFormData({...formData, tipo: e.target.value as any})}>
                                            {view === 'contas_pagar' 
                                                ? <option value="Conta a Pagar">Conta a Pagar</option> 
                                                : <>
                                                    <option value="Receita">Receita (Entrada)</option>
                                                    <option value="Despesa">Despesa (JÁ PAGO)</option>
                                                    <option value="Conta a Pagar">Conta a Pagar (A VENCER)</option>
                                                  </>
                                            }
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{view === 'contas_pagar' || isParcelamento || formData.tipo === 'Conta a Pagar' ? 'Vencimento' : 'Data do Pagamento'}</label>
                                        <input className="w-full p-3 bg-slate-50 border rounded-xl font-medium text-slate-600" type="date" value={formData.data} onChange={e=>setFormData({...formData, data: e.target.value})} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Categoria</label>
                                    <select className="w-full p-3 bg-slate-50 border rounded-xl font-medium" value={formData.categoria} onChange={e=>setFormData({...formData, categoria: e.target.value})}><option value="Mensalidade">Mensalidade</option><option value="Venda">Venda Loja</option><option value="Fixa">Despesa Fixa</option><option value="Variável">Despesa Variável</option><option value="Pessoal">Pessoal</option><option value="Infraestrutura">Infraestrutura</option></select>
                                </div>

                                {(view === 'contas_pagar' || formData.tipo === 'Conta a Pagar' || isParcelamento) && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Código de Barras / Info Boleto</label>
                                        <div className="flex items-center bg-yellow-50 border border-yellow-100 rounded-xl px-3">
                                            <FileText className="text-yellow-600" size={18}/>
                                            <input className="w-full p-3 bg-transparent border-none focus:ring-0 text-sm text-yellow-800 placeholder-yellow-800/50" placeholder="Digite ou cole aqui..." value={formData.codigo_barras} onChange={e=>setFormData({...formData, codigo_barras: e.target.value})} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button type="button" onClick={isParcelamento ? gerarParcelasPreview : handleSubmit} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-slate-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                                {isParcelamento ? <>Próximo: Revisar Agendamento <ArrowRight size={20}/></> : (formData.id ? 'Salvar Alterações' : 'Concluir Lançamento')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
      )}

      {customAlert.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center animate-bounceIn">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${customAlert.type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{customAlert.type === 'danger' ? <Trash2 size={36} /> : <CheckCircle size={36} />}</div>
            <h3 className="text-2xl font-black mb-2 text-slate-800">{customAlert.title}</h3>
            <p className="text-slate-500 mb-8">{customAlert.message}</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { customAlert.onConfirm(); setCustomAlert({ ...customAlert, show: false }); }} className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg ${customAlert.type === 'danger' ? 'bg-red-500 shadow-red-200' : 'bg-green-600 shadow-green-200'}`}>Confirmar</button>
              <button onClick={() => setCustomAlert({ ...customAlert, show: false })} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}