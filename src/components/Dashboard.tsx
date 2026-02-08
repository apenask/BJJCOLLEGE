import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KPIData {
  receitaMensal: number;
  despesasMensal: number;
  lucroLiquido: number;
  totalAlunos: number;
}

interface RecentActivity {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data: string;
}

export default function Dashboard() {
  const [kpis, setKpis] = useState<KPIData>({
    receitaMensal: 0,
    despesasMensal: 0,
    lucroLiquido: 0,
    totalAlunos: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('*')
      .gte('data', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .order('data', { ascending: false });

    const { data: alunos } = await supabase
      .from('alunos')
      .select('id, status');

    let receitas = 0;
    let despesas = 0;

    transacoes?.forEach((t) => {
      if (t.tipo === 'Receita') {
        receitas += Number(t.valor);
      } else {
        despesas += Number(t.valor);
      }
    });

    const totalAlunos = alunos?.filter((a) => a.status === 'Ativo').length || 0;

    setKpis({
      receitaMensal: receitas,
      despesasMensal: despesas,
      lucroLiquido: receitas - despesas,
      totalAlunos,
    });

    setRecentActivities(
      transacoes?.slice(0, 5).map((t) => ({
        id: t.id,
        tipo: t.tipo,
        descricao: t.descricao || t.categoria,
        valor: Number(t.valor),
        data: t.data,
      })) || []
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Receita Mensal</p>
          <p className="text-2xl font-bold text-gray-800">
            R$ {kpis.receitaMensal.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Despesas</p>
          <p className="text-2xl font-bold text-gray-800">
            R$ {kpis.despesasMensal.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Lucro Líquido</p>
          <p className="text-2xl font-bold text-gray-800">
            R$ {kpis.lucroLiquido.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Alunos Ativos</p>
          <p className="text-2xl font-bold text-gray-800">{kpis.totalAlunos}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Atividades Recentes</h2>
        </div>
        <div className="p-6">
          {recentActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma atividade recente</p>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{activity.descricao}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(activity.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${activity.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.tipo === 'Receita' ? '+' : '-'} R$ {activity.valor.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{activity.tipo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
