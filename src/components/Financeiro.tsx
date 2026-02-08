import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Trash2, HandCoins } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '../contexts/ToastContext';

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'Receita' | 'Despesa';
  categoria: string;
  data: string;
  tipo_aula_id?: string; // Importante para calcular a comissão
}

interface TipoAula {
  id: string;
  nome: string;
}

export default function Financeiro() {
  const { addToast } = useToast();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [tiposAula, setTiposAula] = useState<TipoAula[]>([]);
  const [rateios, setRateios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [novaTransacao, setNovaTransacao] = useState({
    descricao: '',
    valor: '',
    tipo: 'Despesa',
    categoria: 'Fixa',
    data: new Date().toISOString().split('T')[0],
    tipo_aula_id: ''
  });

  useEffect(() => {
    fetchDados();

    const channel = supabase
      .channel('financeiro_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => fetchDados())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDados() {
    try {
      setLoading(true);
      // 1. Buscar Transações
      const { data: transacoesData, error: transError } = await supabase
        .from('transacoes')
        .select('*')
        .order('data', { ascending: false });
      
      if (transError) throw transError;

      // 2. Buscar Regras de Comissões (Rateio)
      const { data: rateiosData } = await supabase
        .from('rateio_config')
        .select('*');

      // 3. Buscar Tipos de Aula (Para o formulário)
      const { data: aulasData } = await supabase
        .from('tipos_aula')
        .select('id, nome')
        .eq('ativo', true);

      setTransacoes(transacoesData || []);
      setRateios(rateiosData || []);
      setTiposAula(aulasData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      addToast('Erro ao carregar financeiro.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = {
        descricao: novaTransacao.descricao,
        valor: parseFloat(novaTransacao.valor),
        tipo: novaTransacao.tipo,
        categoria: novaTransacao.categoria,
        data: novaTransacao.data
      };

      // Se for receita e tiver turma selecionada, adiciona o ID
      if (novaTransacao.tipo === 'Receita' && novaTransacao.tipo_aula_id) {
        payload.tipo_aula_id = novaTransacao.tipo_aula_id;
      }

      const { error } = await supabase.from('transacoes').insert([payload]);

      if (error) throw error;

      setShowForm(false);
      setNovaTransacao({
        descricao: '',
        valor: '',
        tipo: 'Despesa',
        categoria: 'Fixa',
        data: new Date().toISOString().split('T')[0],
        tipo_aula_id: ''
      });
      
      fetchDados();
      addToast('Lançamento salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      addToast('Erro ao salvar transação.', 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja apagar este lançamento?')) return;
    try {
      const { error } = await supabase.from('transacoes').delete().eq('id', id);
      if (error) throw error;
      addToast('Lançamento removido.', 'success');
    } catch (error) {
      console.error('Erro ao deletar:', error);
      addToast('Erro ao remover lançamento.', 'error');
    }
  }

  // --- CÁLCULOS FINANCEIROS ---
  let totalReceitas = 0;
  let totalDespesas = 0;
  let totalComissoes = 0;

  transacoes.forEach((t) => {
    const valor = Number(t.valor);

    if (t.tipo === 'Receita') {
      totalReceitas += valor;

      // Calcular Comissão se houver turma vinculada
      if (t.tipo_aula_id && rateios.length > 0) {
        const regras = rateios.filter((r: any) => r.tipo_aula_id === t.tipo_aula_id);
        regras.forEach((r: any) => {
          const comissao = valor * (Number(r.percentual) / 100);
          totalComissoes += comissao;
        });
      }
    } else {
      totalDespesas += valor;
    }
  });

  // Saldo Líquido = Receitas - Despesas - Comissões
  const saldo = totalReceitas - totalDespesas - totalComissoes;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
        >
          <Plus size={20} />
          Novo Lançamento
        </button>
      </div>

      {/* Cards de Resumo - Agora com 4 Colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entradas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-medium">Entradas Brutas</span>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-green-600">
            R$ {totalReceitas.toFixed(2)}
          </h3>
        </div>

        {/* Saídas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-medium">Despesas Operacionais</span>
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="text-red-600" size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-red-600">
            R$ {totalDespesas.toFixed(2)}
          </h3>
        </div>

        {/* Comissões (NOVO) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-medium">Repasse Instrutores</span>
            <div className="p-2 bg-orange-100 rounded-lg">
              <HandCoins className="text-orange-600" size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-orange-600">
            R$ {totalComissoes.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Descontado do saldo</p>
        </div>

        {/* Saldo Real */}
        <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${saldo >= 0 ? 'border-blue-500' : 'border-red-500'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-medium">Lucro Líquido</span>
            <div className="p-2 bg-slate-100 rounded-lg">
              <DollarSign className="text-slate-600" size={20} />
            </div>
          </div>
          <h3 className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
            R$ {saldo.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Após comissões</p>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-semibold text-slate-700">
          Histórico de Movimentações
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando financeiro...</div>
        ) : transacoes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhuma movimentação registrada.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-sm">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transacoes.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600 flex items-center gap-2">
                    <Calendar size={16} />
                    {format(new Date(t.data), 'dd/MM/yyyy')}
                  </td>
                  <td className="p-4 font-medium text-slate-900">
                    {t.descricao}
                    {t.tipo === 'Receita' && t.tipo_aula_id && (
                       <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                         Comissionado
                       </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {t.categoria}
                    </span>
                  </td>
                  <td className={`p-4 text-right font-bold ${t.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.tipo === 'Receita' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nova Transação */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Novo Lançamento</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNovaTransacao({...novaTransacao, tipo: 'Receita'})}
                    className={`p-2 rounded-lg border font-medium ${
                      novaTransacao.tipo === 'Receita' 
                        ? 'bg-green-50 border-green-500 text-green-700' 
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovaTransacao({...novaTransacao, tipo: 'Despesa'})}
                    className={`p-2 rounded-lg border font-medium ${
                      novaTransacao.tipo === 'Despesa' 
                        ? 'bg-red-50 border-red-500 text-red-700' 
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    Despesa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: Conta de Luz, Mensalidade..."
                  value={novaTransacao.descricao}
                  onChange={e => setNovaTransacao({...novaTransacao, descricao: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-2 border rounded-lg"
                    value={novaTransacao.valor}
                    onChange={e => setNovaTransacao({...novaTransacao, valor: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 border rounded-lg"
                    value={novaTransacao.data}
                    onChange={e => setNovaTransacao({...novaTransacao, data: e.target.value})}
                  />
                </div>
              </div>

              {/* SELEÇÃO DE TURMA (Apenas para Receita) */}
              {novaTransacao.tipo === 'Receita' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Turma / Origem (Opcional)</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white"
                    value={novaTransacao.tipo_aula_id}
                    onChange={e => setNovaTransacao({...novaTransacao, tipo_aula_id: e.target.value})}
                  >
                    <option value="">Sem Turma Específica</option>
                    {tiposAula.map(aula => (
                      <option key={aula.id} value={aula.id}>{aula.nome}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Selecione para calcular comissão do professor.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                <select
                  className="w-full p-2 border rounded-lg bg-white"
                  value={novaTransacao.categoria}
                  onChange={e => setNovaTransacao({...novaTransacao, categoria: e.target.value})}
                >
                  <optgroup label="Despesas">
                    <option value="Fixa">Fixa (Luz, Água, Aluguel)</option>
                    <option value="Variável">Variável (Manutenção, Limpeza)</option>
                    <option value="Pessoal">Pagamento Pessoal</option>
                  </optgroup>
                  <optgroup label="Receitas">
                    <option value="Mensalidade">Mensalidade</option>
                    <option value="Venda">Venda de Produtos</option>
                    <option value="Outro">Outros</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}