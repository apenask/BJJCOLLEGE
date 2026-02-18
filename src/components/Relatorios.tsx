import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Printer, Search, Calendar, Banknote, QrCode, CreditCard, Download, FileSpreadsheet, MessageCircle, Copy, X, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../contexts/ToastContext'; // Importando Toast para feedback visual

export default function Relatorios() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [filtroTurma, setFiltroTurma] = useState<'Geral' | 'Adulto' | 'Infantil' | 'Kids' | 'Loja'>('Geral');
  const [resultado, setResultado] = useState<any[] | null>(null);
  const [totais, setTotais] = useState({ dinheiro: 0, pix: 0, credito: 0, debito: 0, fiado: 0, outros: 0, totalReceita: 0, totalDespesa: 0 });

  // Estado para o Modal de Texto/WhatsApp
  const [showModalTexto, setShowModalTexto] = useState(false);
  const [textoRelatorio, setTextoRelatorio] = useState('');

  async function gerarRelatorio() {
    setLoading(true);
    try {
      const { data: transacoes } = await supabase.from('transacoes').select(`*, alunos (nome, categoria)`).gte('data', dataInicio).lte('data', dataFim).order('data', { ascending: true });
      
      const filtrados = transacoes?.filter(t => {
        // BLINDAGEM: Ignora 'Conta a Pagar'
        if (t.tipo === 'Conta a Pagar') return false; 

        if (filtroTurma === 'Geral') return true;
        if (filtroTurma === 'Loja') return t.categoria === 'Venda Loja';
        if (t.tipo === 'Receita' && t.alunos) return t.alunos.categoria === filtroTurma;
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
          // Se passou daqui, é Receita
          rec += valor;
          if (t.detalhes_pagamento) {
              const dp = t.detalhes_pagamento;
              if (dp.metodos && Array.isArray(dp.metodos)) {
                  dp.metodos.forEach((m: any) => {
                      const v = Number(m.valor);
                      if (m.metodo === 'Dinheiro') d += v; else if (m.metodo === 'Pix') p += v; else if (m.metodo === 'Cartao') c += v; else o += v;
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

  // --- GERADOR DE TEXTO WHATSAPP ---
  function abrirModalTexto() {
      if (!resultado) return;

      const texto = `🥋 *RELATÓRIO FINANCEIRO - BJJ COLLEGE*
📅 *Período:* ${format(new Date(dataInicio), 'dd/MM')} a ${format(new Date(dataFim), 'dd/MM/yyyy')}
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

  // EXCEL (Mantido)
  function exportarExcel() {
    if (!resultado) return;
    let tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
      <h2>Relatório Financeiro - BJJ College</h2>
      <p>Período: ${format(new Date(dataInicio), 'dd/MM/yyyy')} a ${format(new Date(dataFim), 'dd/MM/yy')}</p>
      <p>Filtro: ${filtroTurma}</p>
      <br/>
      <table border="1">
        <thead>
          <tr style="background-color: #f0f0f0;"><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th>Entrada</th><th>Saída</th></tr>
        </thead>
        <tbody>
    `;
    resultado.forEach(t => {
       const entrada = t.tipo === 'Receita' ? Number(t.valor).toFixed(2).replace('.', ',') : '';
       const saida = t.tipo === 'Despesa' ? Number(t.valor).toFixed(2).replace('.', ',') : '';
       tableHTML += `<tr><td>${format(new Date(t.data), 'dd/MM/yyyy')}</td><td>${t.descricao} ${t.alunos ? `(${t.alunos.nome})` : ''}</td><td>${t.categoria}</td><td>${renderFormaPagamento(t)}</td><td style="color: green;">${entrada}</td><td style="color: red;">${saida}</td></tr>`;
    });
    tableHTML += `</tbody><tfoot><tr style="background-color: #e0e0e0; font-weight: bold;"><td colspan="4">TOTAIS</td><td>R$ ${totais.totalReceita.toFixed(2).replace('.', ',')}</td><td>R$ ${totais.totalDespesa.toFixed(2).replace('.', ',')}</td></tr></tfoot></table></body></html>`;
    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Relatorio_${filtroTurma}_${dataInicio}.xls`; a.click();
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">Relatórios Financeiros</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:hidden space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="text-sm font-bold text-slate-500">Início</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="text-sm font-bold text-slate-500">Fim</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div>
                  <label className="text-sm font-bold text-slate-500">Categoria</label>
                  <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value as any)} className="w-full p-2 border rounded-lg">
                      <option value="Geral">Geral (Tudo)</option><option value="Adulto">Turma Adulto</option><option value="Infantil">Turma Infantil</option><option value="Kids">Turma Kids</option><option value="Loja">Vendas Loja</option>
                  </select>
              </div>
              <div className="flex items-end"><button onClick={gerarRelatorio} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold hover:bg-slate-800 flex items-center justify-center gap-2">{loading ? '...' : <><Search size={18} /> Gerar</>}</button></div>
          </div>
      </div>

      {resultado && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 print:border-none print:shadow-none print:p-0">
              <div className="mb-6 border-b pb-4 flex flex-col md:flex-row justify-between items-start gap-4">
                  <div><h1 className="text-3xl font-bold text-slate-900">BJJ COLLEGE</h1><p className="text-slate-500">Relatório: <span className="font-bold uppercase">{filtroTurma}</span></p></div>
                  <div className="text-right print:hidden flex flex-wrap gap-2 mt-2 w-full md:w-auto">
                      <button onClick={abrirModalTexto} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 flex items-center gap-2 text-sm shadow-sm flex-1 md:flex-none justify-center"><MessageCircle size={16}/> Relatório WhatsApp</button>
                      <button onClick={exportarExcel} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 text-sm shadow-sm flex-1 md:flex-none justify-center"><FileSpreadsheet size={16}/> Excel</button>
                      <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-900 flex items-center gap-2 text-sm shadow-sm flex-1 md:flex-none justify-center"><Printer size={16}/> Imprimir</button>
                  </div>
              </div>

              {/* TOTAIS */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100"><p className="text-xs text-green-700 uppercase font-bold">Total Receitas</p><p className="text-2xl font-bold text-green-700">R$ {totais.totalReceita.toFixed(2)}</p></div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100"><p className="text-xs text-red-700 uppercase font-bold">Total Despesas</p><p className="text-2xl font-bold text-red-700">R$ {totais.totalDespesa.toFixed(2)}</p></div>
                  <div className={`p-4 rounded-lg border ${totais.totalReceita - totais.totalDespesa >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}><p className="text-xs uppercase font-bold">Saldo Líquido</p><p className="text-2xl font-bold">R$ {(totais.totalReceita - totais.totalDespesa).toFixed(2)}</p></div>
              </div>

              <div className="mb-8">
                  <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase border-b border-slate-100 pb-1">Detalhamento</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col"><span className="text-xs text-slate-500 flex items-center gap-1"><Banknote size={12}/> Dinheiro</span><span className="font-bold text-slate-800">R$ {totais.dinheiro.toFixed(2)}</span></div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col"><span className="text-xs text-slate-500 flex items-center gap-1"><QrCode size={12}/> Pix</span><span className="font-bold text-slate-800">R$ {totais.pix.toFixed(2)}</span></div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col"><span className="text-xs text-slate-500 flex items-center gap-1"><CreditCard size={12}/> Crédito</span><span className="font-bold text-slate-800">R$ {totais.credito.toFixed(2)}</span></div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col"><span className="text-xs text-slate-500 flex items-center gap-1"><CreditCard size={12}/> Débito</span><span className="font-bold text-slate-800">R$ {totais.debito.toFixed(2)}</span></div>
                  </div>
              </div>

              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600 border-b"><tr><th className="py-2 px-2">Data</th><th className="py-2 px-2">Descrição</th><th className="py-2 px-2">Categoria</th><th className="py-2 px-2">Pagamento (Detalhes)</th><th className="py-2 px-2 text-right">Valor Total</th></tr></thead>
                  <tbody className="divide-y">
                      {resultado.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50">
                              <td className="py-2 px-2 whitespace-nowrap">{format(new Date(t.data), 'dd/MM/yy')}</td>
                              <td className="py-2 px-2">{t.descricao} {t.alunos && <span className="text-xs text-slate-400 block">{t.alunos.nome}</span>}</td>
                              <td className="py-2 px-2 text-xs">{t.categoria}</td>
                              <td className="py-2 px-2 text-slate-600">{renderFormaPagamento(t)}</td>
                              <td className={`py-2 px-2 text-right font-bold ${t.tipo === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{t.tipo === 'Receita' ? '+' : '-'} {Number(t.valor).toFixed(2)}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODAL DE TEXTO / WHATSAPP */}
      {showModalTexto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col animate-slideUp">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><MessageCircle className="text-green-500"/> Relatório Escrito</h3>
                    <button onClick={() => setShowModalTexto(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
                </div>
                <div className="p-4 bg-slate-50">
                    <p className="text-xs text-slate-500 mb-2">Edite abaixo se necessário, depois copie ou envie.</p>
                    <textarea 
                        value={textoRelatorio} 
                        onChange={(e) => setTextoRelatorio(e.target.value)}
                        className="w-full h-64 p-3 border rounded-xl text-sm font-mono text-slate-700 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                </div>
                <div className="p-4 flex gap-3">
                    <button onClick={copiarTexto} className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-300"><Copy size={18}/> Copiar</button>
                    <button onClick={enviarWhatsApp} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg shadow-green-200"><Share2 size={18}/> Enviar Zap</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}