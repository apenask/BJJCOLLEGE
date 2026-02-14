import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Printer, Search, Calendar, Wallet, CreditCard, Banknote, QrCode } from 'lucide-react';
import { format } from 'date-fns';

export default function Relatorios() {
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [filtroTurma, setFiltroTurma] = useState<'Geral' | 'Adulto' | 'Infantil' | 'Kids' | 'Loja'>('Geral');
  const [resultado, setResultado] = useState<any[] | null>(null);
  
  // Estado para os totais detalhados
  const [totais, setTotais] = useState({
    dinheiro: 0,
    pix: 0,
    credito: 0,
    debito: 0,
    fiado: 0,
    outros: 0,
    totalReceita: 0,
    totalDespesa: 0
  });

  async function gerarRelatorio() {
    setLoading(true);
    try {
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select(`*, alunos (nome, categoria)`)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: true });

      const filtrados = transacoes?.filter(t => {
        if (filtroTurma === 'Geral') return true;
        if (filtroTurma === 'Loja') return t.categoria === 'Venda Loja';
        if (t.tipo === 'Receita' && t.alunos) return t.alunos.categoria === filtroTurma;
        return false;
      }) || [];

      processarTotais(filtrados);
      setResultado(filtrados);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // --- O CORAÇÃO DO SISTEMA FINANCEIRO ---
  // Essa função abre cada transação e separa o dinheiro nos baldes corretos
  function processarTotais(lista: any[]) {
      let d = 0, p = 0, c = 0, db = 0, f = 0, o = 0;
      let rec = 0, desp = 0;

      lista.forEach(t => {
          const valor = Number(t.valor);

          if (t.tipo === 'Despesa') {
              desp += valor;
              return; // Não processa meio de pagamento de despesa (geralmente é saída de caixa)
          }

          rec += valor; // Soma na receita bruta

          // Analisa os detalhes do pagamento (JSONB)
          if (t.detalhes_pagamento) {
              const dp = t.detalhes_pagamento;

              // CASO 1: Pagamento Split (Vários métodos na mensalidade)
              if (dp.metodos && Array.isArray(dp.metodos)) {
                  dp.metodos.forEach((m: any) => {
                      const v = Number(m.valor);
                      if (m.metodo === 'Dinheiro') d += v;
                      else if (m.metodo === 'Pix') p += v;
                      else if (m.metodo === 'Cartao') {
                          // Se não especificou tipo no split, assume crédito, mas ideal é salvar
                          // Vamos assumir que splits de cartão caem em 'Outros' se não tiver detalhe, 
                          // ou você pode adicionar a lógica de débito/crédito no modal de split depois.
                          // Por padrão do seu modal atual, cartão cai aqui:
                          c += v; 
                      }
                      else o += v;
                  });
              } 
              // CASO 2: Venda Loja ou Pagamento Único detalhado
              else if (dp.pagamento) {
                  const pag = dp.pagamento;
                  const v = valor; // Valor total da transação

                  if (pag.metodo === 'Dinheiro') d += v;
                  else if (pag.metodo === 'Pix') p += v;
                  else if (pag.metodo === 'Fiado') f += v;
                  else if (pag.metodo === 'Cartao') {
                      if (pag.tipo === 'Débito') db += v;
                      else c += v; // Crédito
                  }
                  else o += v;
              }
              // CASO 3: Sem detalhes profundos
              else {
                  o += valor;
              }
          } else {
              // Transações antigas sem detalhes
              o += valor;
          }
      });

      setTotais({
          dinheiro: d,
          pix: p,
          credito: c,
          debito: db,
          fiado: f,
          outros: o,
          totalReceita: rec,
          totalDespesa: desp
      });
  }

  // Helper para mostrar texto na tabela
  function renderFormaPagamento(t: any) {
    if (!t.detalhes_pagamento) return '-';
    const dp = t.detalhes_pagamento;

    // Split
    if (dp.metodos && Array.isArray(dp.metodos)) {
        return (
            <div className="flex flex-col text-[10px]">
                {dp.metodos.map((m: any, idx: number) => (
                    <span key={idx} className="whitespace-nowrap">
                        {m.metodo}: R$ {Number(m.valor).toFixed(2)}
                    </span>
                ))}
            </div>
        );
    }
    
    // Loja / Simples
    if (dp.pagamento?.metodo) {
        const m = dp.pagamento.metodo;
        if (m === 'Cartao') return `Cartão ${dp.pagamento.tipo} (${dp.pagamento.parcelas || 1}x)`;
        return m;
    }
    return '-';
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">Relatórios Financeiros</h2>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:hidden space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="text-sm font-bold text-slate-500">Início</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="text-sm font-bold text-slate-500">Fim</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div>
                  <label className="text-sm font-bold text-slate-500">Categoria</label>
                  <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value as any)} className="w-full p-2 border rounded-lg">
                      <option value="Geral">Geral (Tudo)</option>
                      <option value="Adulto">Turma Adulto</option>
                      <option value="Infantil">Turma Infantil</option>
                      <option value="Kids">Turma Kids</option>
                      <option value="Loja">Vendas Loja</option>
                  </select>
              </div>
              <div className="flex items-end">
                  <button onClick={gerarRelatorio} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold hover:bg-slate-800 flex items-center justify-center gap-2">
                      {loading ? '...' : <><Search size={18} /> Gerar</>}
                  </button>
              </div>
          </div>
      </div>

      {/* RESULTADO */}
      {resultado && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 print:border-none print:shadow-none print:p-0">
              
              {/* CABEÇALHO */}
              <div className="mb-6 border-b pb-4 flex justify-between items-start">
                  <div>
                      <h1 className="text-3xl font-bold text-slate-900">BJJ COLLEGE</h1>
                      <p className="text-slate-500">Relatório: <span className="font-bold uppercase">{filtroTurma}</span></p>
                  </div>
                  <div className="text-right">
                      <p className="font-bold text-slate-800">{format(new Date(dataInicio), 'dd/MM/yy')} até {format(new Date(dataFim), 'dd/MM/yy')}</p>
                      <button onClick={() => window.print()} className="print:hidden text-blue-600 text-sm hover:underline flex items-center gap-1 justify-end mt-1"><Printer size={14}/> Imprimir</button>
                  </div>
              </div>

              {/* TOTAIS GERAIS */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-xs text-green-700 uppercase font-bold">Total Receitas</p>
                      <p className="text-2xl font-bold text-green-700">R$ {totais.totalReceita.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-xs text-red-700 uppercase font-bold">Total Despesas</p>
                      <p className="text-2xl font-bold text-red-700">R$ {totais.totalDespesa.toFixed(2)}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${totais.totalReceita - totais.totalDespesa >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                      <p className="text-xs uppercase font-bold">Saldo Líquido</p>
                      <p className="text-2xl font-bold">R$ {(totais.totalReceita - totais.totalDespesa).toFixed(2)}</p>
                  </div>
              </div>

              {/* DETALHAMENTO DAS RECEITAS (SEPARAÇÃO DO SPLIT) */}
              <div className="mb-8">
                  <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase border-b border-slate-100 pb-1">Detalhamento de Entradas (Meios de Pagamento)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col">
                          <span className="text-xs text-slate-500 flex items-center gap-1"><Banknote size={12}/> Dinheiro</span>
                          <span className="font-bold text-slate-800">R$ {totais.dinheiro.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col">
                          <span className="text-xs text-slate-500 flex items-center gap-1"><QrCode size={12}/> Pix</span>
                          <span className="font-bold text-slate-800">R$ {totais.pix.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col">
                          <span className="text-xs text-slate-500 flex items-center gap-1"><CreditCard size={12}/> Crédito</span>
                          <span className="font-bold text-slate-800">R$ {totais.credito.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col">
                          <span className="text-xs text-slate-500 flex items-center gap-1"><CreditCard size={12}/> Débito</span>
                          <span className="font-bold text-slate-800">R$ {totais.debito.toFixed(2)}</span>
                      </div>
                      {totais.fiado > 0 && (
                          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex flex-col">
                              <span className="text-xs text-orange-600 font-bold">Fiado (A receber)</span>
                              <span className="font-bold text-orange-700">R$ {totais.fiado.toFixed(2)}</span>
                          </div>
                      )}
                  </div>
              </div>

              {/* TABELA DETALHADA */}
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600 border-b">
                      <tr>
                          <th className="py-2 px-2">Data</th>
                          <th className="py-2 px-2">Descrição</th>
                          <th className="py-2 px-2">Categoria</th>
                          <th className="py-2 px-2">Pagamento (Detalhes)</th>
                          <th className="py-2 px-2 text-right">Valor Total</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {resultado.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50">
                              <td className="py-2 px-2 whitespace-nowrap">{format(new Date(t.data), 'dd/MM/yy')}</td>
                              <td className="py-2 px-2">
                                  {t.descricao}
                                  {t.alunos && <span className="text-xs text-slate-400 block">{t.alunos.nome}</span>}
                              </td>
                              <td className="py-2 px-2 text-xs">{t.categoria}</td>
                              
                              {/* Renderiza o split ou método simples */}
                              <td className="py-2 px-2 text-slate-600">
                                  {renderFormaPagamento(t)}
                              </td>
                              
                              <td className={`py-2 px-2 text-right font-bold ${t.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                                  {t.tipo === 'Receita' ? '+' : '-'} {Number(t.valor).toFixed(2)}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              
              <div className="mt-8 pt-4 border-t text-center text-xs text-slate-400 print:block hidden">
                  BJJ College Management System • {new Date().toLocaleString()}
              </div>
          </div>
      )}
    </div>
  );
}