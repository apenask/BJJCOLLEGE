import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, TrendingUp, TrendingDown, DollarSign, Activity, HandCoins, BarChart3, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth, startOfYear, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '../contexts/ToastContext';

export default function Dashboard() {
  const { addToast } = useToast();
  const [stats, setStats] = useState({
    alunosAtivos: 0,
    receitaMensal: 0,
    despesasMensais: 0,
    comissoes: 0,
    lucro: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('6'); // Estado para o filtro (Padrão: 6 meses)

  useEffect(() => {
    fetchDashboardData();

    // Recriamos a subscrição quando o período muda para garantir que a função use o estado correto
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [periodo]); // Dependência adicionada: recarrega se mudar o período

  async function fetchDashboardData() {
    try {
      const hoje = new Date();
      const primeiroDiaMesAtual = startOfMonth(hoje).toISOString();
      
      // Definição da Data de Início do Gráfico com base no filtro
      let dataInicioGrafico;
      let mesesParaMostrar;

      if (periodo === 'ytd') {
        dataInicioGrafico = startOfYear(hoje).toISOString();
        mesesParaMostrar = differenceInMonths(hoje, startOfYear(hoje));
      } else {
        const meses = parseInt(periodo) - 1; // -1 porque inclui o mês atual
        dataInicioGrafico = startOfMonth(subMonths(hoje, meses)).toISOString();
        mesesParaMostrar = meses;
      }

      // --- 1. DADOS DO MÊS ATUAL (KPIs - Sempre fixos no mês atual) ---
      
      const { count: alunosCount } = await supabase
        .from('alunos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ativo');

      const { data: vendasMes } = await supabase
        .from('vendas')
        .select('total')
        .gte('data', primeiroDiaMesAtual);
      
      const totalVendasMes = vendasMes?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

      const { data: transacoesMes } = await supabase
        .from('transacoes')
        .select('valor, tipo, tipo_aula_id')
        .gte('data', primeiroDiaMesAtual);

      const { data: rateios } = await supabase.from('rateio_config').select('*');

      let receitaTransacoesMes = 0;
      let despesasMes = 0;
      let totalComissoesMes = 0;

      transacoesMes?.forEach((t: any) => {
        const valor = Number(t.valor);
        if (t.tipo === 'Receita') {
          receitaTransacoesMes += valor;
          if (t.tipo_aula_id && rateios) {
            const regras = rateios.filter((r: any) => r.tipo_aula_id === t.tipo_aula_id);
            regras.forEach((r: any) => {
              totalComissoesMes += valor * (Number(r.percentual) / 100);
            });
          }
        } else {
          despesasMes += valor;
        }
      });

      const receitaTotalMes = totalVendasMes + receitaTransacoesMes;
      const lucroLiquidoMes = receitaTotalMes - despesasMes - totalComissoesMes;

      setStats({
        alunosAtivos: alunosCount || 0,
        receitaMensal: receitaTotalMes,
        despesasMensais: despesasMes,
        comissoes: totalComissoesMes,
        lucro: lucroLiquidoMes
      });

      // --- 2. DADOS HISTÓRICOS (GRÁFICO - Dinâmico) ---
      
      const { data: histTransacoes } = await supabase
        .from('transacoes')
        .select('valor, tipo, data')
        .gte('data', dataInicioGrafico);
        
      const { data: histVendas } = await supabase
        .from('vendas')
        .select('total, data')
        .gte('data', dataInicioGrafico);

      // Agrupar dados por mês
      const monthlyStats = new Map();
      
      // Inicializar os meses vazios para o período selecionado
      for (let i = mesesParaMostrar; i >= 0; i--) {
        const d = subMonths(hoje, i);
        const key = format(d, 'yyyy-MM');
        monthlyStats.set(key, { 
          label: format(d, 'MMM', { locale: ptBR }).toUpperCase(),
          receita: 0, 
          despesa: 0 
        });
      }

      // Preencher com Transações
      histTransacoes?.forEach((t: any) => {
        const dateKey = t.data.substring(0, 7); // yyyy-MM
        if (monthlyStats.has(dateKey)) {
          const entry = monthlyStats.get(dateKey);
          if (t.tipo === 'Receita') entry.receita += Number(t.valor);
          else entry.despesa += Number(t.valor);
        }
      });

      // Preencher com Vendas da Loja
      histVendas?.forEach((v: any) => {
        const dataVenda = new Date(v.data);
        const dateKey = format(dataVenda, 'yyyy-MM');
        if (monthlyStats.has(dateKey)) {
          const entry = monthlyStats.get(dateKey);
          entry.receita += Number(v.total);
        }
      });

      setChartData(Array.from(monthlyStats.values()));

    } catch (error) {
      console.error('Erro dashboard:', error);
      addToast('Erro ao atualizar painel.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const margemLucro = stats.receitaMensal > 0 
    ? ((stats.lucro / stats.receitaMensal) * 100).toFixed(0) 
    : '0';

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">A carregar dados...</div>;
  }

  const maxChartValue = Math.max(
    ...chartData.map(d => Math.max(d.receita, d.despesa)), 
    100
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painel Geral</h2>
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full capitalize">
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        
        {/* Receita */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-1 bg-green-500"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receita Bruta</p>
              <h3 className="text-xl font-bold text-green-700 mt-1">{formatMoney(stats.receitaMensal)}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Despesas</p>
              <h3 className="text-xl font-bold text-red-700 mt-1">{formatMoney(stats.despesasMensais)}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <TrendingDown size={20} />
            </div>
          </div>
        </div>

        {/* Comissões */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1 bg-orange-500"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instrutores</p>
              <h3 className="text-xl font-bold text-orange-700 mt-1">{formatMoney(stats.comissoes)}</h3>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <HandCoins size={20} />
            </div>
          </div>
        </div>

        {/* Lucro */}
        <div className={`bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden`}>
          <div className={`absolute right-0 top-0 h-full w-1 ${stats.lucro >= 0 ? 'bg-blue-600' : 'bg-red-600'}`}></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lucro Real</p>
              <h3 className={`text-xl font-bold mt-1 ${stats.lucro >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatMoney(stats.lucro)}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        {/* Alunos */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1 bg-purple-500"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alunos Ativos</p>
              <h3 className="text-xl font-bold text-purple-700 mt-1">{stats.alunosAtivos}</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO DE FLUXO DE CAIXA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              Fluxo de Caixa
            </h4>
            
            {/* SELETOR DE PERÍODO */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <Calendar size={14} className="text-slate-400 ml-2" />
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium py-1 pr-8 cursor-pointer outline-none"
              >
                <option value="3">Últimos 3 meses</option>
                <option value="6">Últimos 6 meses</option>
                <option value="12">Últimos 12 meses</option>
                <option value="ytd">Ano Atual (YTD)</option>
              </select>
            </div>
          </div>

          {/* Área do Gráfico */}
          <div className="h-64 w-full flex items-end justify-between gap-2 sm:gap-4 overflow-x-auto pb-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center justify-end h-full flex-1 group relative min-w-[30px]">
                
                {/* Barras Container */}
                <div className="flex gap-1 items-end justify-center w-full h-full">
                  {/* Barra Receita */}
                  <div 
                    className="w-2 sm:w-5 bg-green-500 rounded-t-sm transition-all duration-500 relative hover:bg-green-400 cursor-pointer"
                    style={{ height: `${(data.receita / maxChartValue) * 100}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                      Rec: {formatMoney(data.receita)}
                    </div>
                  </div>

                  {/* Barra Despesa */}
                  <div 
                    className="w-2 sm:w-5 bg-red-500 rounded-t-sm transition-all duration-500 relative hover:bg-red-400 cursor-pointer"
                    style={{ height: `${(data.despesa / maxChartValue) * 100}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                      Desp: {formatMoney(data.despesa)}
                    </div>
                  </div>
                </div>

                {/* Legenda do Mês */}
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-2 truncate w-full text-center">{data.label}</span>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center gap-4 text-xs font-bold mt-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-sm"></div> Receitas
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-sm"></div> Despesas
            </div>
          </div>
        </div>

        {/* Resumo Lateral */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col justify-center">
            <h4 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Activity size={20} className="text-blue-600" /> 
              Saúde Financeira
            </h4>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Margem de Lucro</span>
                  <span className={`font-bold ${Number(margemLucro) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margemLucro}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full ${Number(margemLucro) > 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min(Math.abs(Number(margemLucro)), 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-2">Resumo do Mês</p>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Entradas</span>
                  <span className="font-semibold text-green-700">{formatMoney(stats.receitaMensal)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Saídas (Total)</span>
                  <span className="font-semibold text-red-700">{formatMoney(stats.despesasMensais + stats.comissoes)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-dashed">
                  <span className="text-xs font-bold text-slate-800 uppercase">Resultado</span>
                  <span className={`font-bold ${stats.lucro >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {formatMoney(stats.lucro)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}