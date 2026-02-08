import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transacao {
  id: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  tipo_aula_id: string | null;
}

interface TipoAula {
  id: string;
  nome: string;
}

interface Instrutor {
  id: string;
  nome: string;
}

interface RateioConfig {
  id: string;
  instrutor_id: string;
  tipo_aula_id: string;
  percentual: number;
  instrutor?: { nome: string };
  tipo_aula?: { nome: string };
}

const categoriasDespesas = [
  'Aluguel',
  'Energia',
  'Internet',
  'Água',
  'Limpeza',
  'Manutenção',
  'Material Esportivo',
  'Marketing',
  'Outros',
];

export default function Financeiro() {
  const [activeView, setActiveView] = useState<'transacoes' | 'rateio'>('transacoes');
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [tiposAula, setTiposAula] = useState<TipoAula[]>([]);
  const [instrutores, setInstrutores] = useState<Instrutor[]>([]);
  const [rateios, setRateios] = useState<RateioConfig[]>([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showRateioForm, setShowRateioForm] = useState(false);

  const [transactionForm, setTransactionForm] = useState({
    tipo: 'Receita',
    categoria: '',
    descricao: '',
    valor: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    tipo_aula_id: '',
  });

  const [rateioForm, setRateioForm] = useState({
    instrutor_id: '',
    tipo_aula_id: '',
    percentual: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [transacoesRes, tiposAulaRes, instrutoresRes, rateiosRes] = await Promise.all([
      supabase.from('transacoes').select('*').order('data', { ascending: false }),
      supabase.from('tipos_aula').select('*').order('nome'),
      supabase.from('instrutores').select('*').order('nome'),
      supabase
        .from('rateio_config')
        .select(`
          *,
          instrutor:instrutores(nome),
          tipo_aula:tipos_aula(nome)
        `),
    ]);

    if (transacoesRes.data) setTransacoes(transacoesRes.data);
    if (tiposAulaRes.data) setTiposAula(tiposAulaRes.data);
    if (instrutoresRes.data) setInstrutores(instrutoresRes.data);
    if (rateiosRes.data) setRateios(rateiosRes.data as any);
  }

  async function handleTransactionSubmit(e: React.FormEvent) {
    e.preventDefault();

    await supabase.from('transacoes').insert([
      {
        tipo: transactionForm.tipo,
        categoria: transactionForm.categoria,
        descricao: transactionForm.descricao,
        valor: parseFloat(transactionForm.valor),
        data: transactionForm.data,
        tipo_aula_id: transactionForm.tipo_aula_id || null,
      },
    ]);

    setShowTransactionForm(false);
    setTransactionForm({
      tipo: 'Receita',
      categoria: '',
      descricao: '',
      valor: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      tipo_aula_id: '',
    });
    loadData();
  }

  async function handleRateioSubmit(e: React.FormEvent) {
    e.preventDefault();

    await supabase.from('rateio_config').insert([
      {
        instrutor_id: rateioForm.instrutor_id,
        tipo_aula_id: rateioForm.tipo_aula_id,
        percentual: parseFloat(rateioForm.percentual),
      },
    ]);

    setShowRateioForm(false);
    setRateioForm({
      instrutor_id: '',
      tipo_aula_id: '',
      percentual: '',
    });
    loadData();
  }

  async function deleteRateio(id: string) {
    await supabase.from('rateio_config').delete().eq('id', id);
    loadData();
  }

  function calculateRateioReport() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transacoes.filter((t) => {
      const tDate = new Date(t.data);
      return (
        t.tipo === 'Receita' &&
        t.tipo_aula_id &&
        tDate.getMonth() + 1 === currentMonth &&
        tDate.getFullYear() === currentYear
      );
    });

    const report: {
      tipo_aula: string;
      receita: number;
      instrutor: string;
      comissao: number;
      lucro: number;
    }[] = [];

    tiposAula.forEach((tipoAula) => {
      const rateioConfig = rateios.find((r) => r.tipo_aula_id === tipoAula.id);
      const receita = monthlyTransactions
        .filter((t) => t.tipo_aula_id === tipoAula.id)
        .reduce((sum, t) => sum + t.valor, 0);

      if (receita > 0) {
        const comissao = rateioConfig ? (receita * rateioConfig.percentual) / 100 : 0;
        const lucro = receita - comissao;

        report.push({
          tipo_aula: tipoAula.nome,
          receita,
          instrutor: rateioConfig?.instrutor?.nome || '-',
          comissao,
          lucro,
        });
      }
    });

    return report;
  }

  const totals = transacoes.reduce(
    (acc, t) => {
      if (t.tipo === 'Receita') {
        acc.receitas += t.valor;
      } else {
        acc.despesas += t.valor;
      }
      return acc;
    },
    { receitas: 0, despesas: 0 }
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Financeiro</h1>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm">Total Receitas</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">R$ {totals.receitas.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm">Total Despesas</p>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">R$ {totals.despesas.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm">Saldo</p>
          </div>
          <p
            className={`text-2xl font-bold ${
              totals.receitas - totals.despesas >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            R$ {(totals.receitas - totals.despesas).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveView('transacoes')}
              className={`px-6 py-4 font-medium ${
                activeView === 'transacoes'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Transações
            </button>
            <button
              onClick={() => setActiveView('rateio')}
              className={`px-6 py-4 font-medium ${
                activeView === 'rateio'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Comissões (Rateio)
            </button>
          </nav>
        </div>

        {activeView === 'transacoes' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowTransactionForm(!showTransactionForm)}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Nova Transação</span>
              </button>
            </div>

            {showTransactionForm && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo *
                      </label>
                      <select
                        value={transactionForm.tipo}
                        onChange={(e) =>
                          setTransactionForm({ ...transactionForm, tipo: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="Receita">Receita</option>
                        <option value="Despesa">Despesa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoria *
                      </label>
                      {transactionForm.tipo === 'Despesa' ? (
                        <select
                          value={transactionForm.categoria}
                          onChange={(e) =>
                            setTransactionForm({ ...transactionForm, categoria: e.target.value })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Selecione...</option>
                          {categoriasDespesas.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={transactionForm.categoria}
                          onChange={(e) =>
                            setTransactionForm({ ...transactionForm, categoria: e.target.value })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Mensalidade"
                          required
                        />
                      )}
                    </div>
                  </div>

                  {transactionForm.tipo === 'Receita' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Aula (opcional)
                      </label>
                      <select
                        value={transactionForm.tipo_aula_id}
                        onChange={(e) =>
                          setTransactionForm({ ...transactionForm, tipo_aula_id: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Nenhum</option>
                        {tiposAula.map((tipo) => (
                          <option key={tipo.id} value={tipo.id}>
                            {tipo.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={transactionForm.descricao}
                      onChange={(e) =>
                        setTransactionForm({ ...transactionForm, descricao: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={transactionForm.valor}
                        onChange={(e) =>
                          setTransactionForm({ ...transactionForm, valor: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data *
                      </label>
                      <input
                        type="date"
                        value={transactionForm.data}
                        onChange={(e) =>
                          setTransactionForm({ ...transactionForm, data: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowTransactionForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transacoes.map((transacao) => (
                    <tr key={transacao.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {format(new Date(transacao.data), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            transacao.tipo === 'Receita'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {transacao.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transacao.categoria}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transacao.descricao}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">
                        <span
                          className={
                            transacao.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {transacao.tipo === 'Receita' ? '+' : '-'} R${' '}
                          {transacao.valor.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transacoes.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nenhuma transação cadastrada
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'rateio' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowRateioForm(!showRateioForm)}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Nova Configuração</span>
              </button>
            </div>

            {showRateioForm && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <form onSubmit={handleRateioSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instrutor *
                    </label>
                    <select
                      value={rateioForm.instrutor_id}
                      onChange={(e) =>
                        setRateioForm({ ...rateioForm, instrutor_id: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {instrutores.map((instrutor) => (
                        <option key={instrutor.id} value={instrutor.id}>
                          {instrutor.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Aula *
                    </label>
                    <select
                      value={rateioForm.tipo_aula_id}
                      onChange={(e) =>
                        setRateioForm({ ...rateioForm, tipo_aula_id: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {tiposAula.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Percentual de Comissão (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={rateioForm.percentual}
                      onChange={(e) =>
                        setRateioForm({ ...rateioForm, percentual: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowRateioForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Configurações de Comissão
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Instrutor
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Tipo de Aula
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Percentual
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rateios.map((rateio) => (
                      <tr key={rateio.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-800">
                          {rateio.instrutor?.nome}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">
                          {rateio.tipo_aula?.nome}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">
                          {rateio.percentual}%
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => deleteRateio(rateio.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rateios.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Nenhuma configuração cadastrada
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Relatório de Comissões (Mês Atual)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Tipo de Aula
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                        Receita Total
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Instrutor
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                        Comissão
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                        Lucro Academia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calculateRateioReport().map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-800">{item.tipo_aula}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-800">
                          R$ {item.receita.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">{item.instrutor}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">
                          R$ {item.comissao.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                          R$ {item.lucro.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {calculateRateioReport().length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Nenhuma receita com tipo de aula cadastrada este mês
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
