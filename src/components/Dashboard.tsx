import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, TrendingDown, Wallet, Calendar, HandCoins, Users, 
  Banknote, QrCode, CreditCard
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    receitaBruta: 0,
    totalComissoes: 0,
    despesas: 0,
    saldoLiquido: 0,
    totalAlunosAtivos: 0, // Mudado para focar em ativos
    alunosPagantes: 0,    // Pagantes reais
    alunosInadimplentes: 0,
    pagtoDinheiro: 0,
    pagtoPix: 0,
    pagtoCredito: 0,
    pagtoDebito: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const hoje = new Date();
      const inicioMes = startOfMonth(hoje).toISOString();
      const fimMes = endOfMonth(hoje).toISOString();

      // 1. Transações
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('*')
        .gte('data', inicioMes)
        .lte('data', fimMes);

      // 2. Pagamentos Instrutores
      const { data: pagamentosInstrutores } = await supabase
        .from('pagamentos_instrutores')
        .select('valor_pago')
        .eq('mes_referencia', hoje.toISOString().slice(0, 7));

      // 3. Alunos (SOMENTE ATIVOS importam para a métrica de inadimplência)
      const { data: alunos } = await supabase.from('alunos').select('*').eq('status', 'Ativo');

      // --- CÁLCULOS FINANCEIROS ---
      let receita = 0;
      let despesas = 0;
      let pDinheiro = 0, pPix = 0, pCredito = 0, pDebito = 0;

      const totalComissoesPagas = pagamentosInstrutores?.reduce((acc, p) => acc + Number(p.valor_pago), 0) || 0;

      transacoes?.forEach(t => {
        const valor = Number(t.valor);
        if (t.tipo === 'Receita') {
            receita += valor;
            // Detalhamento
            if (t.detalhes_pagamento) {
                const dp = t.detalhes_pagamento;
                if (dp.metodos && Array.isArray(dp.metodos)) {
                    dp.metodos.forEach((m: any) => {
                        const v = Number(m.valor);
                        if (m.metodo === 'Dinheiro') pDinheiro += v;
                        else if (m.metodo === 'Pix') pPix += v;
                        else if (m.metodo === 'Cartao') pCredito += v; 
                    });
                } else if (dp.pagamento) {
                    const pag = dp.pagamento;
                    if (pag.metodo === 'Dinheiro') pDinheiro += valor;
                    else if (pag.metodo === 'Pix') pPix += valor;
                    else if (pag.metodo === 'Cartao') {
                        if (pag.tipo === 'Débito') pDebito += valor; else pCredito += valor;
                    }
                }
            } else {
                 // Fallback para transações antigas sem detalhe (assumindo Pix se não tiver info, ou ignorando do detalhe)
            }
        } else {
            despesas += valor;
        }
      });

      // --- CÁLCULOS ALUNOS (Lógica Corrigida) ---
      const totalAtivos = alunos?.length || 0;
      
      // Ids de alunos que têm receita esse mês
      const pagantesIds = new Set(transacoes?.filter(t => t.tipo === 'Receita' && t.aluno_id).map(t => t.aluno_id));
      
      // Aluno é pagante se: Tem pagamento no mês OU é bolsista total
      const pagantesReais = alunos?.filter(a => 
        pagantesIds.has(a.id) || (a.bolsista_jiujitsu && a.bolsista_musculacao)
      ).length || 0;

      const pendentes = totalAtivos - pagantesReais;

      setStats({
        receitaBruta: receita,
        totalComissoes: totalComissoesPagas,
        despesas: despesas,
        saldoLiquido: receita - despesas - totalComissoesPagas,
        totalAlunosAtivos: totalAtivos,
        alunosPagantes: pagantesReais,
        alunosInadimplentes: pendentes, // Se todos pagarem, isso será 0
        pagtoDinheiro: pDinheiro,
        pagtoPix: pPix,
        pagtoCredito: pCredito,
        pagtoDebito: pDebito
      });

    } catch (error) {
      console.error('Erro dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const Card = ({ title, value, icon: Icon, color, subtext }: any) => {
    const bgClass = color.includes('600') ? color.replace('text-', 'bg-').replace('600', '100') : color.replace('text-', 'bg-').replace('500', '100');
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className={`absolute -right-6 -top-6 opacity-5 p-4 rounded-full ${color.replace('text-', 'bg-')} transition-transform group-hover:scale-110`}><Icon size={100} /></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p><h3 className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</h3>{subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}</div>
            <div className={`p-3 rounded-xl ${bgClass} ${color}`}><Icon size={24} /></div>
        </div>
    );
  };

  const MiniCardPagamento = ({ titulo, valor, icon: Icon, corBg, corTexto }: any) => (
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${corBg} border-opacity-50 shadow-sm bg-white`}>
          <div className={`p-3 rounded-lg ${corBg} ${corTexto} bg-opacity-20`}><Icon size={20} /></div>
          <div><p className="text-xs font-bold uppercase text-slate-500">{titulo}</p><p className={`text-lg font-bold ${corTexto}`}>{valor}</p></div>
      </div>
  );

  const GraficoPizza = () => {
      const total = stats.receitaBruta || 1; 
      const pDespesas = (stats.despesas / total) * 100;
      const pComissoes = (stats.totalComissoes / total) * 100;
      const pLucro = ((stats.receitaBruta - stats.despesas - stats.totalComissoes) / total) * 100;
      const safeLucro = pLucro > 0 ? pLucro : 0;
      const degDespesas = (pDespesas * 3.6);
      const degComissoes = degDespesas + (pComissoes * 3.6);
      
      return (
          <div className="flex flex-col sm:flex-row items-center gap-8 justify-center h-full">
              <div className="w-48 h-48 rounded-full shadow-inner relative flex items-center justify-center border-4 border-white shadow-slate-200"
                style={{ background: `conic-gradient(#ef4444 0deg ${degDespesas}deg, #f97316 ${degDespesas}deg ${degComissoes}deg, #2563eb ${degComissoes}deg 360deg)` }}>
                  <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-sm"><span className="text-xs text-slate-400 uppercase font-bold">Entradas</span><span className="text-xl font-bold text-slate-800">R$ {stats.receitaBruta.toFixed(0)}</span></div>
              </div>
              <div className="space-y-4 w-full max-w-xs">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div><span className="text-sm font-medium text-slate-600">Saldo Líquido</span></div><span className="text-sm font-bold text-slate-800">{safeLucro.toFixed(1)}%</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-sm font-medium text-slate-600">Comissões</span></div><span className="text-sm font-bold text-slate-800">{pComissoes.toFixed(1)}%</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-sm font-medium text-slate-600">Despesas</span></div><span className="text-sm font-bold text-slate-800">{pDespesas.toFixed(1)}%</span></div>
              </div>
          </div>
      );
  };

  // Cálculo da porcentagem de pagantes
  const pctPagantes = stats.totalAlunosAtivos > 0 
    ? ((stats.alunosPagantes / stats.totalAlunosAtivos) * 100).toFixed(0) 
    : 0;

  if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Carregando painel...</div>;

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div><h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2><p className="text-slate-500 text-sm flex items-center gap-1"><Calendar size={14}/> {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Receita Bruta" value={`R$ ${stats.receitaBruta.toFixed(2)}`} icon={TrendingUp} color="text-green-600" subtext="Total recebido" />
        <Card title="Comissões Pagas" value={`R$ ${stats.totalComissoes.toFixed(2)}`} icon={HandCoins} color="text-orange-600" subtext="Repasse efetivado" />
        <Card title="Despesas" value={`R$ ${stats.despesas.toFixed(2)}`} icon={TrendingDown} color="text-red-600" subtext="Custos operacionais" />
        <Card title="Saldo Líquido" value={`R$ ${stats.saldoLiquido.toFixed(2)}`} icon={Wallet} color={stats.saldoLiquido >= 0 ? "text-blue-600" : "text-red-600"} subtext="Lucro Real (Livre)" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniCardPagamento titulo="Dinheiro" valor={`R$ ${stats.pagtoDinheiro.toFixed(2)}`} icon={Banknote} corBg="bg-green-50 border-green-100" corTexto="text-green-700" />
          <MiniCardPagamento titulo="Pix" valor={`R$ ${stats.pagtoPix.toFixed(2)}`} icon={QrCode} corBg="bg-teal-50 border-teal-100" corTexto="text-teal-700" />
          <MiniCardPagamento titulo="Crédito" valor={`R$ ${stats.pagtoCredito.toFixed(2)}`} icon={CreditCard} corBg="bg-blue-50 border-blue-100" corTexto="text-blue-700" />
          <MiniCardPagamento titulo="Débito" valor={`R$ ${stats.pagtoDebito.toFixed(2)}`} icon={CreditCard} corBg="bg-indigo-50 border-indigo-100" corTexto="text-indigo-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">Distribuição Financeira</h3>
              {stats.receitaBruta > 0 ? (<GraficoPizza />) : (<div className="h-48 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl">Sem dados financeiros suficientes.</div>)}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Users className="text-slate-900"/> Resumo Alunos (Ativos)</h3>
                <div className="flex-1 space-y-8">
                    <div>
                        <div className="flex justify-between items-end mb-2"><span className="text-sm font-medium text-slate-500">Total Ativos</span><span className="text-2xl font-bold text-slate-800">{stats.totalAlunosAtivos}</span></div>
                        <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-slate-800 h-full rounded-full" style={{ width: '100%' }}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2"><span className="text-sm font-medium text-green-600">Pagamento em Dia</span><span className="text-xl font-bold text-green-700">{pctPagantes}%</span></div>
                        <div className="w-full bg-green-100 h-2 rounded-full"><div className="bg-green-500 h-full rounded-full" style={{ width: `${pctPagantes}%` }}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2"><span className="text-sm font-medium text-red-600">Pendentes</span><span className="text-xl font-bold text-red-700">{100 - Number(pctPagantes)}%</span></div>
                        <div className="w-full bg-red-100 h-2 rounded-full"><div className="bg-red-500 h-full rounded-full" style={{ width: `${100 - Number(pctPagantes)}%` }}></div></div>
                        <p className="text-xs text-slate-400 mt-2 text-right">{stats.alunosInadimplentes} alunos pendentes</p>
                    </div>
                </div>
          </div>
      </div>
    </div>
  );
}