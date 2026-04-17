import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Printer, Search, Calendar, Banknote, QrCode, CreditCard, Download, FileSpreadsheet, MessageCircle, Copy, X, Share2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '../contexts/ToastContext'; 

export default function Relatorios() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  
  // Filtro Atualizado para bater com a tela do Financeiro
  const [filtroTurma, setFiltroTurma] = useState<'Geral' | 'Adulto (Todos)' | 'Adulto (3 Dias)' | 'Adulto (2 Dias)' | 'Infantil' | 'Kids' | 'Loja'>('Geral');
  
  const [resultado, setResultado] = useState<any[] | null>(null);
  const [totais, setTotais] = useState({ dinheiro: 0, pix: 0, credito: 0, debito: 0, fiado: 0, outros: 0, totalReceita: 0, totalDespesa: 0 });

  const [showModalTexto, setShowModalTexto] = useState(false);
  const [textoRelatorio, setTextoRelatorio] = useState('');

  async function gerarRelatorio() {
    setLoading(true);
    try {
      const targetRef = format(parseISO(`${mesSelecionado}-01`), 'MM/yyyy');
      
      // Adicionado plano_tipo na busca do alunos
      const { data: transacoes } = await supabase
          .from('transacoes')
          .select(`*, alunos (nome, categoria, plano_tipo)`)
          .gte('data', dataInicio)
          .lte('data', dataFim)
          .order('data', { ascending: true });
      
      const filtrados = transacoes?.filter(t => {
        if (t.tipo === 'Conta a Pagar' || t.tipo === 'Pendente') return false; 
        
        const ref = t.mes_referencia || format(parseISO(t.data), 'MM/yyyy');
        if (ref !== targetRef) return false;

        // Mesma Lógica de Filtro do Financeiro.tsx
        if (filtroTurma === 'Geral') return true;
        if (filtroTurma === 'Loja') return t.categoria === 'Venda Loja';
        
        if (t.tipo === 'Receita' && t.alunos) {
            if (filtroTurma === 'Adulto (Todos)') {
                return t.alunos.categoria === 'Adulto' && (!t.alunos.plano_tipo || t.alunos.plano_tipo === 'Todos os dias');
            } else if (filtroTurma === 'Adulto (3 Dias)') {
                return t.alunos.categoria === 'Adulto' && t.alunos.plano_tipo === '3 Dias';
            } else if (filtroTurma === 'Adulto (2 Dias)') {
                return t.alunos.categoria === 'Adulto' && t.alunos.plano_tipo === '2 Dias';
            } else {
                return t.alunos.categoria === filtroTurma;
            }
        }
        return false;
      }) || [];
      
      processarTotais(filtrados);
      setResultado(filtrados);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  function processarTotais(lista: any[]) {
      let d = 0, p = 0, c = 0, db = 0, f = 0, o = 0, rec = 0, desp = 0;
      lista.forEach(t => {
          const valor = Number(t.valor);
          if (t.tipo === 'Despesa') { desp += valor; return; }
          
          rec += valor;
          if (t.detalhes_pagamento) {
              const dp = t.detalhes_pagamento;
              if (dp.metodos && Array.isArray(dp.metodos)) {
                  dp.metodos.forEach((m: any) => {
                      const v = Number(m.valor);
                      if (m.metodo === 'Dinheiro') d += v; else if (m.metodo === 'Pix') p += v; else if (m.metodo === 'Cartao') c += v; else if (m.metodo === 'Debito') db += v; else o += v;
                  });
              } else if (dp.pagamento) {
                  const pag = dp.pagamento;
                  if (pag.metodo === 'Dinheiro') d += valor; else if (pag.metodo === 'Pix') p += valor; else if (pag.metodo === 'Fiado') f += valor;
                  else if (pag.metodo === 'Cartao') { if (pag.tipo === 'Débito') db += valor; else c += valor; } else o += valor;
              } else o += valor;
          } else o += valor;
      });
      setTotais({ dinheiro: d, pix: p, credito: c, debito: db, fiado: f, outros: o, totalReceita: rec, totalDespesa: desp });
  }

  function renderFormaPagamento(t: any) {
    if (!t.detalhes_pagamento) return '-';
    const dp = t.detalhes_pagamento;
    if (dp.metodos && Array.isArray(dp.metodos)) return dp.metodos.map((m: any) => `${m.metodo}: R$ ${Number(m.valor).toFixed(2)}`).join(' | ');
    if (dp.pagamento?.metodo) {
        const m = dp.pagamento.metodo;
        if (m === 'Cartao') return `Cartão ${dp.pagamento.tipo} (${dp.pagamento.parcelas || 1}x)`;
        return m;
    }
    return '-';
  }

  function abrirModalTexto() {
      if (!resultado) return;

      const nomeMes = format(parseISO(`${mesSelecionado}-01`), 'MMMM/yyyy', { locale: ptBR });

      const texto = `🥋 *RELATÓRIO FINANCEIRO - BJJ COLLEGE*
🗓️ *Ref. Mensalidades:* ${nomeMes.toUpperCase()}
📅 *Pagos entre:* ${format(parseISO(dataInicio), 'dd/MM')} a ${format(parseISO(dataFim), 'dd/MM')}
📂 *Filtro:* ${filtroTurma}

💰 *RESUMO GERAL*
--------------------------------
✅ *Entradas:* R$ ${totais.totalReceita.toFixed(2)}
❌ *Saídas:* R$ ${totais.totalDespesa.toFixed(2)}
💵 *SALDO:* R$ ${(totais.totalReceita - totais.totalDespesa).toFixed(2)}
--------------------------------

📊 *DETALHAMENTO (ENTRADAS)*
💵 Dinheiro: R$ ${totais.dinheiro.toFixed(2)}
💠 Pix: R$ ${totais.pix.toFixed(2)}
💳 Crédito: R$ ${totais.credito.toFixed(2)}
💳 Débito: R$ ${totais.debito.toFixed(2)}
--------------------------------

*Gerado pelo Sistema BJJ College*`;

      setTextoRelatorio(texto);
      setShowModalTexto(true);
  }

  function copiarTexto() {
      navigator.clipboard.writeText(textoRelatorio);
      addToast('Relatório copiado!', 'success');
  }

  function enviarWhatsApp() {
      const url = `https://wa.me/?text=${encodeURIComponent(textoRelatorio)}`;
      window.open(url, '_blank');
  }

  function exportarExcel() {
    if (!resultado) return;
    const nomeMes = format(parseISO(`${mesSelecionado}-01`), 'MMMM/yyyy', { locale: ptBR });
    let tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
      <h2>Relatório Financeiro - BJJ College</h2>
      <p>Ref. Mensalidades: ${nomeMes.toUpperCase()}</p>
      <p>Pagos de: ${format(parseISO(dataInicio), 'dd/MM/yyyy')} até ${format(parseISO(dataFim), 'dd/MM/yyyy')}</p>
      <p>Filtro: ${filtroTurma}</p>
      <br/>
      <table border="1">
        <thead>
          <tr style="background-color: #f0f0f0;"><th>Data Recebimento</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th>Entrada</th><th>Saída</th></tr>
        </thead>
        <tbody>
    `;
    resultado.forEach(t => {
       const entrada = t.tipo === 'Receita' ? Number(t.valor).toFixed(2).replace('.', ',') : '';
       const saida = t.tipo === 'Despesa' ? Number(t.valor).toFixed(2).replace('.', ',') : '';
       tableHTML += `<tr><td>${format(parseISO(t.data), 'dd/MM/yyyy')}</td><td>${t.descricao} ${t.alunos ? `(${t.alunos.nome})` : ''}</td><td>${t.categoria}</td><td>${renderFormaPagamento(t)}</td><td style="color: green;">${entrada}</td><td style="color: red;">${saida}</td></tr>`;
    });
    tableHTML += `</tbody><tfoot><tr style="background-color: #e0e0e0; font-weight: bold;"><td colspan="4">TOTAIS</td><td>R$ ${totais.totalReceita.toFixed(2).replace('.', ',')}</td><td>R$ ${totais.totalDespesa.toFixed(2).replace('.', ',')}</td></tr></tfoot></table></body></html>`;
    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Relatorio_${filtroTurma}_${mesSelecionado}.xls`; a.click();
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">Relatórios Financeiros</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:hidden space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mensalidade (Ref)</label>
                  <input type="month" value={mesSelecionado} onChange={e => setMesSelecionado(e.target.value)} className="w-full p-3 mt-1 border rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Pagos A Partir De</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-3 mt-1 border rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Pagos Até</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-3 mt-1 border rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Categoria / Turma</label>
                  {/* Select Atualizado com as opções de Adulto */}
                  <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value as any)} className="w-full p-3 mt-1 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="Geral">Geral (Tudo)</option>
                      <option value="Adulto (Todos)">Turma Adulto (Todos os dias)</option>
                      <option value="Adulto (3 Dias)">Turma Adulto (3 Dias)</option>
                      <option value="Adulto (2 Dias)">Turma Adulto (2 Dias)</option>
                      <option value="Infantil">Turma Infantil</option>
                      <option value="Kids">Turma Kids</option>
                      <option value="Loja">Vendas Loja</option>
                  </select>
              </div>
          </div>
          <div className="flex justify-end pt-2">
              <button onClick={gerarRelatorio} className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95 transition-transform">
                  {loading ? 'Gerando...' : <><Search size={20} /> Gerar Relatório</>}
              </button>
          </div>
      </div>

      {resultado && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 print:border-none print:shadow-none print:p-0 animate-slideUp">
              <div className="mb-6 border-b pb-4 flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tighter">BJJ COLLEGE</h1>
                      <p className="text-slate-500 text-sm mt-1">
                          Ref. Mensalidade: <span className="font-bold text-slate-800 uppercase">{format(parseISO(`${mesSelecionado}-01`), 'MMMM/yyyy', { locale: ptBR })}</span>
                      </p>
                      <p className="text-slate-500 text-xs">
                          Período de Recebimento: {format(parseISO(dataInicio), 'dd/MM/yyyy')} a {format(parseISO(dataFim), 'dd/MM/yyyy')}
                      </p>
                  </div>
                  <div className="text-right print:hidden flex flex-wrap gap-2 mt-2 w-full md:w-auto">
                      <button onClick={abrirModalTexto} className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-600 flex items-center gap-2 text-sm shadow-sm flex-1 md:flex-none justify-center"><MessageCircle size={16}/> Resumo no Zap</button>
                      <button onClick={exportarExcel} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 text-sm shadow-sm flex-1 md:flex-none justify-center"><FileSpreadsheet size={16}/> Baixar Excel</button>
                      <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-900 flex items-center gap-2 text-sm shadow-sm flex-1 md:flex-none justify-center"><Printer size={16}/> Imprimir</button>
                  </div>
              </div>

              {/* TOTAIS */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100"><p className="text-[10px] text-green-700 uppercase font-bold tracking-widest mb-1">Total Receitas</p><p className="text-2xl md:text-3xl font-black text-green-700">R$ {totais.totalReceita.toFixed(2)}</p></div>
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100"><p className="text-[10px] text-red-700 uppercase font-bold tracking-widest mb-1">Total Despesas</p><p className="text-2xl md:text-3xl font-black text-red-700">R$ {totais.totalDespesa.toFixed(2)}</p></div>
                  <div className={`p-4 rounded-2xl border ${totais.totalReceita - totais.totalDespesa >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}><p className="text-[10px] uppercase font-bold tracking-widest mb-1">Saldo Líquido</p><p className="text-2xl md:text-3xl font-black">R$ {(totais.totalReceita - totais.totalDespesa).toFixed(2)}</p></div>
              </div>

              <div className="mb-8">
                  <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase border-b border-slate-100 pb-2">Detalhamento de Entradas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col"><span className="text-xs text-slate-500 font-bold flex items-center gap-1"><Banknote size={14}/> Dinheiro</span><span className="font-black text-slate-800 text-lg">R$ {totais.dinheiro.toFixed(2)}</span></div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col"><span className="text-xs text-slate-500 font-bold flex items-center gap-1"><QrCode size={14}/> Pix</span><span className="font-black text-slate-800 text-lg">R$ {totais.pix.toFixed(2)}</span></div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col"><span className="text-xs text-slate-500 font-bold flex items-center gap-1"><CreditCard size={14}/> Crédito</span><span className="font-black text-slate-800 text-lg">R$ {totais.credito.toFixed(2)}</span></div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col"><span className="text-xs text-slate-500 font-bold flex items-center gap-1"><CreditCard size={14}/> Débito</span><span className="font-black text-slate-800 text-lg">R$ {totais.debito.toFixed(2)}</span></div>
                  </div>
              </div>

              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-y uppercase text-[10px] tracking-wider font-bold"><tr><th className="py-3 px-2">Data Real</th><th className="py-3 px-2">Descrição</th><th className="py-3 px-2">Categoria</th><th className="py-3 px-2">Pagamento (Detalhes)</th><th className="py-3 px-2 text-right">Valor Total</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                      {resultado.length === 0 ? (
                           <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nenhum resultado encontrado para este filtro.</td></tr>
                      ) : (
                          resultado.map(t => (
                              <tr key={t.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-2 whitespace-nowrap font-mono">{format(parseISO(t.data), 'dd/MM/yy')}</td>
                                  <td className="py-3 px-2 font-medium">
                                      {t.descricao} 
                                      {t.alunos && <span className="text-xs text-slate-400 block font-normal">{t.alunos.nome} <span className="italic">({t.alunos.plano_tipo || 'Padrão'})</span></span>}
                                  </td>
                                  <td className="py-3 px-2 text-xs"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">{t.categoria}</span></td>
                                  <td className="py-3 px-2 text-slate-600">{renderFormaPagamento(t)}</td>
                                  <td className={`py-3 px-2 text-right font-black ${t.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{t.tipo === 'Receita' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}</td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODAL DE TEXTO / WHATSAPP */}
      {showModalTexto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col animate-slideUp">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter"><MessageCircle className="text-green-500"/> Copiar Relatório</h3>
                    <button onClick={() => setShowModalTexto(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={18}/></button>
                </div>
                <div className="p-6 bg-slate-50">
                    <p className="text-xs text-slate-500 mb-3 font-bold">Edite o texto abaixo se necessário, depois clique em copiar ou enviar.</p>
                    <textarea 
                        value={textoRelatorio} 
                        onChange={(e) => setTextoRelatorio(e.target.value)}
                        className="w-full h-64 p-4 border border-slate-200 rounded-2xl text-sm font-mono text-slate-700 focus:ring-2 focus:ring-green-500 focus:outline-none custom-scrollbar"
                    />
                </div>
                <div className="p-6 flex gap-3 bg-white rounded-b-3xl">
                    <button onClick={copiarTexto} className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"><Copy size={18}/> Copiar Texto</button>
                    <button onClick={enviarWhatsApp} className="flex-1 py-4 bg-green-600 text-white font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 hover:bg-green-700 shadow-xl shadow-green-200 transition-all"><Share2 size={18}/> Abrir Zap</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}