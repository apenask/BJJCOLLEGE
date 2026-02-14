import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Printer, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function Relatorios() {
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 8) + '01'); // Dia 01 do mês
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10)); // Hoje
  const [filtroTurma, setFiltroTurma] = useState<'Geral' | 'Adulto' | 'Infantil' | 'Kids'>('Geral');
  const [resultado, setResultado] = useState<any[] | null>(null);

  async function gerarRelatorio() {
    setLoading(true);
    try {
      // Busca transações no período
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select(`*, alunos (nome, categoria)`)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: true });

      // Filtra por turma (se não for Geral)
      // Nota: Despesas sem categoria (ex: conta de luz) só aparecem no GERAL.
      const filtrados = transacoes?.filter(t => {
        if (filtroTurma === 'Geral') return true;
        if (t.tipo === 'Receita' && t.alunos) return t.alunos.categoria === filtroTurma;
        return false; // Esconde despesas gerais se estiver filtrando por turma específica (pode ajustar isso se quiser)
      }) || [];

      setResultado(filtrados);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Cálculos do Relatório
  const totalReceitas = resultado?.filter(t => t.tipo === 'Receita').reduce((acc, t) => acc + t.valor, 0) || 0;
  const totalDespesas = resultado?.filter(t => t.tipo === 'Despesa').reduce((acc, t) => acc + t.valor, 0) || 0;
  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">Relatórios</h2>
      </div>

      {/* CONTROLES (Ocultos na impressão) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:hidden space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">Data Início</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">Data Fim</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">Turma / Categoria</label>
                  <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value as any)} className="w-full p-2 border rounded-lg bg-white">
                      <option value="Geral">Relatório Geral (Tudo)</option>
                      <option value="Adulto">Apenas Adultos</option>
                      <option value="Infantil">Apenas Infantil</option>
                      <option value="Kids">Apenas Kids</option>
                  </select>
              </div>
              <div className="flex items-end">
                  <button onClick={gerarRelatorio} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                      {loading ? 'Gerando...' : <><Search size={18} /> Gerar Relatório</>}
                  </button>
              </div>
          </div>
      </div>

      {/* ÁREA DE RESULTADO (IMPRESSÃO) */}
      {resultado && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 print:border-none print:shadow-none print:p-0">
              
              {/* CABEÇALHO DO RELATÓRIO */}
              <div className="mb-8 border-b pb-4">
                  <div className="flex justify-between items-start">
                      <div>
                          <h1 className="text-3xl font-bold text-slate-900">BJJ COLLEGE</h1>
                          <p className="text-slate-500">Relatório Financeiro: <span className="font-bold text-slate-800 uppercase">{filtroTurma}</span></p>
                      </div>
                      <div className="text-right">
                          <p className="text-sm text-slate-400">Período</p>
                          <p className="font-bold text-slate-800">{format(new Date(dataInicio), 'dd/MM/yy')} até {format(new Date(dataFim), 'dd/MM/yy')}</p>
                      </div>
                  </div>
              </div>

              {/* RESUMO DE VALORES */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100 print:border-slate-300">
                      <p className="text-xs text-green-700 uppercase font-bold">Total Entradas</p>
                      <p className="text-2xl font-bold text-green-700">R$ {totalReceitas.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100 print:border-slate-300">
                      <p className="text-xs text-red-700 uppercase font-bold">Total Saídas</p>
                      <p className="text-2xl font-bold text-red-700">R$ {totalDespesas.toFixed(2)}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${saldo >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-orange-50 border-orange-100 text-orange-700'} print:border-slate-300`}>
                      <p className="text-xs uppercase font-bold">Saldo Líquido</p>
                      <p className="text-2xl font-bold">R$ {saldo.toFixed(2)}</p>
                  </div>
              </div>

              {/* TABELA DE DADOS */}
              <table className="w-full text-left text-sm mb-8">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                      <tr>
                          <th className="py-2 px-1">Data</th>
                          <th className="py-2 px-1">Descrição</th>
                          <th className="py-2 px-1">Categoria</th>
                          <th className="py-2 px-1 text-right">Valor</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {resultado.map(t => (
                          <tr key={t.id}>
                              <td className="py-2 px-1">{format(new Date(t.data), 'dd/MM/yy')}</td>
                              <td className="py-2 px-1">
                                  {t.descricao}
                                  {t.alunos && <span className="text-xs text-slate-400 ml-2">({t.alunos.nome})</span>}
                              </td>
                              <td className="py-2 px-1 text-xs text-slate-500">{t.categoria}</td>
                              <td className={`py-2 px-1 text-right font-bold ${t.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                                  {t.tipo === 'Receita' ? '+' : '-'} {Number(t.valor).toFixed(2)}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              
              <div className="mt-8 pt-8 border-t text-center text-xs text-slate-400 print:block hidden">
                  Gerado automaticamente pelo sistema BJJ College em {new Date().toLocaleString()}.
              </div>

              {/* BOTÃO DE IMPRIMIR (Só na tela) */}
              <div className="text-right print:hidden">
                  <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 flex items-center gap-2 ml-auto">
                      <Printer size={18} /> Imprimir / Salvar PDF
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}