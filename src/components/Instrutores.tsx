import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Trash2, 
  MessageCircle, 
  Wallet, 
  Calendar, 
  Users, 
  X, 
  XCircle // Ícone para cancelar
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '../contexts/ToastContext';

interface Instrutor {
  id: string;
  instrutor_nome: string;
  categoria: 'Adulto' | 'Infantil' | 'Kids';
  percentual: number;
  telefone: string;
  pago_neste_mes?: boolean;
}

export default function Instrutores() {
  const { addToast } = useToast();
  
  const [instrutores, setInstrutores] = useState<Instrutor[]>([]);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const [showForm, setShowForm] = useState(false);
  const [novaComissao, setNovaComissao] = useState({ instrutor_nome: '', categoria: 'Infantil', percentual: '', telefone: '' });

  useEffect(() => { fetchDados(); }, [mesSelecionado]);

  async function fetchDados() {
    try {
      setLoading(true);
      
      const { data: dataInstrutores } = await supabase.from('comissoes_config').select('*');
      
      // Busca pagamentos
      const { data: dataPagamentos } = await supabase
        .from('pagamentos_instrutores')
        .select('instrutor_id')
        .eq('mes_referencia', mesSelecionado);

      const pagamentosSet = new Set(dataPagamentos?.map(p => p.instrutor_id));

      const dataInicio = startOfMonth(parseISO(mesSelecionado + '-01')).toISOString();
      const dataFim = endOfMonth(parseISO(mesSelecionado + '-01')).toISOString();

      const { data: dataTransacoes } = await supabase
        .from('transacoes')
        .select(`valor, tipo, alunos (categoria)`)
        .eq('tipo', 'Receita')
        .gte('data', dataInicio)
        .lte('data', dataFim);

      const instrutoresMapeados = dataInstrutores?.map((inst: any) => ({
          ...inst,
          pago_neste_mes: pagamentosSet.has(inst.id)
      }));

      setInstrutores(instrutoresMapeados || []);
      setTransacoes(dataTransacoes || []);
    } catch (error) { 
        addToast('Erro ao carregar dados.', 'error'); 
    } finally { 
        setLoading(false); 
    }
  }

  function calcularComissao(instrutor: Instrutor) {
    const totalArrecadadoTurma = transacoes.filter(t => t.alunos?.categoria === instrutor.categoria).reduce((acc, t) => acc + Number(t.valor), 0);
    const valorComissao = totalArrecadadoTurma * (instrutor.percentual / 100);
    const qtdAlunosPagantes = transacoes.filter(t => t.alunos?.categoria === instrutor.categoria).length;
    return { totalArrecadadoTurma, valorComissao, qtdAlunosPagantes };
  }

  // --- AÇÕES ---

  async function handleMarcarComoPago(instrutor: Instrutor, valor: number) {
    if (!confirm(`Confirmar pagamento de R$ ${valor.toFixed(2)} para ${instrutor.instrutor_nome}?`)) return;
    try {
        const { error } = await supabase.from('pagamentos_instrutores').insert([{
            instrutor_id: instrutor.id,
            mes_referencia: mesSelecionado,
            valor_pago: valor
        }]);
        if (error) throw error;
        addToast('Pagamento registrado e computado no Dashboard!', 'success');
        fetchDados();
    } catch { addToast('Erro ao registrar.', 'error'); }
  }

  // NOVA FUNÇÃO DE CANCELAR
  async function handleCancelarPagamento(instrutor: Instrutor) {
    if (!confirm(`Cancelar o registro de pagamento de ${instrutor.instrutor_nome}? Isso removerá o valor do Dashboard.`)) return;
    try {
        const { error } = await supabase
            .from('pagamentos_instrutores')
            .delete()
            .eq('instrutor_id', instrutor.id)
            .eq('mes_referencia', mesSelecionado);
            
        if (error) throw error;
        addToast('Pagamento cancelado.', 'info');
        fetchDados();
    } catch { 
        addToast('Erro ao cancelar.', 'error'); 
    }
  }

  function enviarRelatorio(instrutor: Instrutor) {
    const telefoneLimpo = instrutor.telefone ? instrutor.telefone.replace(/\D/g, '') : '';
    if (!telefoneLimpo) { addToast('Sem telefone cadastrado.', 'error'); return; }
    
    const { valorComissao, qtdAlunosPagantes, totalArrecadadoTurma } = calcularComissao(instrutor);
    const nomeMes = format(parseISO(mesSelecionado + '-01'), 'MMMM', { locale: ptBR });
    const status = instrutor.pago_neste_mes ? "✅ PAGO" : "🕒 AGUARDANDO";

    const mensagem = `🥋 *Relatório BJJ College* - *${nomeMes}*\n\nOlá *${instrutor.instrutor_nome}*!\nTurma: ${instrutor.categoria}\nPagantes: ${qtdAlunosPagantes}\nFaturamento: R$ ${totalArrecadadoTurma.toFixed(2)}\nComissão: ${instrutor.percentual}%\n\n💰 *VALOR: R$ ${valorComissao.toFixed(2)}*\nStatus: ${status}`;
    window.open(`https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`, '_blank');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await supabase.from('comissoes_config').insert([{ ...novaComissao, percentual: parseFloat(novaComissao.percentual) }]);
      addToast('Salvo!', 'success'); setShowForm(false); setNovaComissao({ instrutor_nome: '', categoria: 'Infantil', percentual: '', telefone: '' }); fetchDados();
    } catch { addToast('Erro.', 'error'); }
  }

  async function handleDelete(id: string) { if(confirm('Remover instrutor?')) await supabase.from('comissoes_config').delete().eq('id', id); fetchDados(); }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg"><Users size={20} /></div>
            <h2 className="text-lg font-bold text-slate-800">Instrutores</h2>
        </div>
        <div className="flex gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg flex items-center px-3 gap-2">
                <Calendar size={16} className="text-slate-400" />
                <input type="month" value={mesSelecionado} onChange={e => setMesSelecionado(e.target.value)} className="bg-transparent outline-none text-slate-700 font-bold text-sm py-2" />
            </div>
            <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"><Plus size={18} /></button>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400">Carregando...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instrutores.map((inst) => {
                const { valorComissao, qtdAlunosPagantes } = calcularComissao(inst);
                
                return (
                    <div key={inst.id} className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col relative overflow-hidden transition-all ${inst.pago_neste_mes ? 'border-green-200 shadow-green-50' : 'border-slate-200'}`}>
                        
                        {/* ETIQUETA PAGO NA ESQUERDA */}
                        {inst.pago_neste_mes && (
                             <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg z-10 shadow-sm flex items-center gap-1">
                                <Wallet size={10} /> PAGO
                             </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4 mt-2">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg leading-tight">{inst.instrutor_nome}</h3>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    <span className={`w-2 h-2 rounded-full ${inst.categoria === 'Kids' ? 'bg-purple-500' : inst.categoria === 'Infantil' ? 'bg-blue-500' : 'bg-slate-800'}`}></span>
                                    Turma {inst.categoria} • {inst.percentual}%
                                </p>
                            </div>
                            <button onClick={() => handleDelete(inst.id)} className="text-red-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Excluir Instrutor"><Trash2 size={18}/></button>
                        </div>

                        <div className="flex-1 space-y-3 mb-5">
                            <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Alunos Pagantes</span>
                                <span className="font-bold text-slate-700 bg-slate-100 px-2 rounded">{qtdAlunosPagantes}</span>
                            </div>
                            <div className={`flex justify-between items-center p-3 rounded-lg border ${inst.pago_neste_mes ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                                <span className={`text-xs font-bold uppercase ${inst.pago_neste_mes ? 'text-green-700' : 'text-slate-500'}`}>{inst.pago_neste_mes ? 'Pago em Caixa' : 'A Receber'}</span>
                                <span className={`text-xl font-bold ${inst.pago_neste_mes ? 'text-green-700' : 'text-slate-800'}`}>R$ {valorComissao.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <button onClick={() => enviarRelatorio(inst)} className="bg-white border border-green-200 text-green-700 hover:bg-green-50 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"><MessageCircle size={16}/> WhatsApp</button>
                            
                            {/* BOTÃO ALTERNÁVEL (PAGAR / CANCELAR) */}
                            {inst.pago_neste_mes ? (
                                <button onClick={() => handleCancelarPagamento(inst)} className="bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"><XCircle size={16}/> Cancelar</button>
                            ) : (
                                <button onClick={() => handleMarcarComoPago(inst, valorComissao)} className="bg-slate-900 text-white hover:bg-slate-700 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"><Wallet size={16}/> Pagar</button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
                <div className="flex justify-between mb-4 items-center"><h3 className="font-bold text-lg text-slate-800">Novo Instrutor</h3><button onClick={()=>setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
                <form onSubmit={handleSave} className="space-y-3">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Nome</label><input className="w-full p-3 border rounded-lg bg-slate-50" required value={novaComissao.instrutor_nome} onChange={e=>setNovaComissao({...novaComissao, instrutor_nome: e.target.value})} placeholder="Nome" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label><input className="w-full p-3 border rounded-lg bg-slate-50" required value={novaComissao.telefone} onChange={e=>setNovaComissao({...novaComissao, telefone: e.target.value})} placeholder="Com DDD" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Turma</label><select className="w-full p-3 border rounded-lg bg-slate-50" value={novaComissao.categoria} onChange={e=>setNovaComissao({...novaComissao, categoria: e.target.value})}><option value="Adulto">Adulto</option><option value="Infantil">Infantil</option><option value="Kids">Kids</option></select></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Comissão %</label><input className="w-full p-3 border rounded-lg bg-slate-50" required type="number" placeholder="Ex: 50" value={novaComissao.percentual} onChange={e=>setNovaComissao({...novaComissao, percentual: e.target.value})} /></div>
                    <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold mt-2 shadow-lg hover:bg-slate-800">Salvar Cadastro</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}