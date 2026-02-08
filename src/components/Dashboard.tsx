import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [stats, setStats] = useState({
    alunosAtivos: 0,
    receitaMensal: 0,
    despesasMensais: 0,
    lucro: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Configuração do Realtime (Escuta mudanças no banco)
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDashboardData() {
    try {
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

      // 1. Buscar Alunos Ativos
      const { count: alunosCount } = await supabase
        .from('alunos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ativo');

      // 2. Buscar Vendas (Loja) deste mês
      const { data: vendas } = await supabase
        .from('vendas')
        .select('total')
        .gte('data', primeiroDiaMes);
      
      const totalVendas = vendas?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

      // 3. Buscar Transações (Receitas e Despesas) deste mês
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('valor, tipo')
        .gte('data', primeiroDiaMes);

      let receitaTransacoes = 0;
      let despesas = 0;

      transacoes?.forEach(t => {
        if (t.tipo === 'Receita') receitaTransacoes += Number(t.valor);
        if (t.tipo === 'Despesa') despesas += Number(t.valor);
      });

      // Receita Total = Vendas na Loja + Receitas Lançadas (Mensalidades etc)
      const receitaTotal = totalVendas + receitaTransacoes;

      setStats({
        alunosAtivos: alunosCount || 0,
        receitaMensal: receitaTotal,
        despesasMensais: despesas,
        lucro: receitaTotal - despesas
      });

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">A carregar dados da academia...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Painel Geral</h2>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card: Receita */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Receita Mensal</p>
              <h3 className="text-2xl font-bold text-green-600">{formatMoney(stats.receitaMensal)}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400">Vendas + Mensalidades</p>
        </div>

        {/* Card: Despesas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Despesas</p>
              <h3 className="text-2xl font-bold text-red-600">{formatMoney(stats.despesasMensais)}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="text-red-600" size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400">Contas e Manutenção</p>
        </div>

        {/* Card: Lucro Líquido */}
        <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${stats.lucro >= 0 ? 'border-blue-500' : 'border-red-500'}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Lucro Líquido</p>
              <h3 className={`text-2xl font-bold ${stats.lucro >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                {formatMoney(stats.lucro)}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400">O que sobra no caixa</p>
        </div>

        {/* Card: Alunos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Alunos Ativos</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.alunosAtivos}</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400">Treinando regularmente</p>
        </div>
      </div>

      {/* Área de Gráfico/Avisos Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-500" /> 
            Resumo Financeiro
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Faturamento Bruto</span>
              <span className="font-semibold text-slate-900">{formatMoney(stats.receitaMensal)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Total de Saídas</span>
              <span className="font-semibold text-slate-900">{formatMoney(stats.despesasMensais)}</span>
            </div>
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-sm text-slate-500">
                Seu lucro atual é de <span className="font-bold text-blue-600">{((stats.lucro / (stats.receitaMensal || 1)) * 100).toFixed(0)}%</span> da receita.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-sm text-white flex flex-col justify-center items-center text-center">
          <h4 className="text-xl font-bold mb-2">BJJ COLLEGE</h4>
          <p className="text-slate-300 text-sm mb-4">Sistema de Gestão Integrado</p>
          <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <p className="font-mono text-lg font-bold text-green-400">ONLINE</p>
          </div>
        </div>
      </div>
    </div>
  );
}