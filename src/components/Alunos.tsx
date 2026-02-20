import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, Edit, Trash2, User, CheckCircle, 
  Brain, DollarSign, X, 
  HeartPulse, Cake, Phone, ChevronLeft, Trophy, Medal, Zap, AlertTriangle, Droplet, ShoppingBag, Copy, Share2
} from 'lucide-react';
import { startOfMonth, endOfMonth, format, addMonths } from 'date-fns';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Aluno {
  id: string;
  nome: string;
  foto_url: string;
  data_nascimento: string;
  data_matricula?: string;
  graduacao: string;
  categoria: 'Adulto' | 'Infantil' | 'Kids';
  status: string;
  whatsapp: string;
  tipo_sanguineo: string;
  alergias: string;
  neurodivergente: boolean;
  neurodivergencia_tipo: string;
  detalhes_condicao: string;
  plano_tipo: string;
  plano_dias: string[];
  bolsista_jiujitsu: boolean;
  bolsista_musculacao: boolean;
  atleta: boolean;
  pago_mes_atual?: boolean;
  pago_proximo_mes?: boolean;
  divida_loja?: number; 
}

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export default function Alunos() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const reciboRef = useRef<HTMLDivElement>(null); 
  
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tabAtual, setTabAtual] = useState<'Adulto' | 'Infantil' | 'Kids'>('Adulto');
  const [viewState, setViewState] = useState<'list' | 'form' | 'details'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filtroDevedores, setFiltroDevedores] = useState(false);

  const [formData, setFormData] = useState<Partial<Aluno>>({ 
    plano_dias: [], 
    plano_tipo: 'Todos os dias',
    categoria: 'Adulto',
    graduacao: '', 
    status: 'Ativo',
    data_matricula: new Date().toISOString().split('T')[0]
  });
  
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [customAlert, setCustomAlert] = useState({ show: false, id: '', nome: '' });
  const [forceDeleteAlert, setForceDeleteAlert] = useState({ show: false, id: '', nome: '' }); 
  
  const [pagamentoModal, setPagamentoModal] = useState<{ show: boolean, aluno: Aluno | null, valorBase: number, desconto: number, mesReferencia: string }>({ show: false, aluno: null, valorBase: 0, desconto: 0, mesReferencia: '' });
  const [pagamentosParciais, setPagamentosParciais] = useState<{ metodo: string, valor: number, tipo?: string }[]>([]);

  const [reciboModal, setReciboModal] = useState<{ show: boolean, dados: any } | null>(null);

  const mesAtualRef = format(new Date(), 'MM/yyyy');
  const proximoMesRef = format(addMonths(new Date(), 1), 'MM/yyyy');
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesAtualNome = mesesNomes[new Date().getMonth()];
  const proximoMesNome = mesesNomes[addMonths(new Date(), 1).getMonth()];

  useEffect(() => { fetchAlunos(); }, []);

  async function fetchAlunos() {
    setLoading(true);
    try {
      const { data: dadosAlunos } = await supabase.from('alunos').select('*').order('nome');

      const { data: pagamentos } = await supabase
        .from('transacoes')
        .select('aluno_id, data, mes_referencia')
        .eq('tipo', 'Receita')
        .eq('categoria', 'Mensalidade');

      const pagantesAtual = new Set();
      const pagantesProximo = new Set();

      pagamentos?.forEach(p => {
          const ref = p.mes_referencia || format(new Date(p.data), 'MM/yyyy');
          if (ref === mesAtualRef) pagantesAtual.add(p.aluno_id);
          if (ref === proximoMesRef) pagantesProximo.add(p.aluno_id);
      });
      
      const { data: dividas } = await supabase.from('transacoes')
         .select('aluno_id, valor')
         .eq('tipo', 'Pendente')
         .eq('categoria', 'Venda Loja');

      const dividaMap = new Map();
      dividas?.forEach(d => {
          const atual = dividaMap.get(d.aluno_id) || 0;
          dividaMap.set(d.aluno_id, atual + Number(d.valor));
      });
      
      const alunosProc = dadosAlunos?.map((aluno: any) => ({
        ...aluno,
        pago_mes_atual: pagantesAtual.has(aluno.id) || aluno.bolsista_jiujitsu,
        pago_proximo_mes: pagantesProximo.has(aluno.id) || aluno.bolsista_jiujitsu,
        divida_loja: dividaMap.get(aluno.id) || 0
      }));
      setAlunos(alunosProc || []);
      
      if (selectedAluno) {
        const atualizado = alunosProc?.find(a => a.id === selectedAluno.id);
        if (atualizado) setSelectedAluno(atualizado);
      }
    } catch(e) { console.error(e); } finally { setLoading(false); }
  }

  function adicionarMetodo() {
     const novoTamanho = pagamentosParciais.length + 1;
     const valorTotalCalculado = Math.max(0, pagamentoModal.valorBase - pagamentoModal.desconto);
     const valorIgual = Number((valorTotalCalculado / novoTamanho).toFixed(2));
     const novos = Array(novoTamanho).fill(null).map((_, i) => ({
         metodo: pagamentosParciais[i]?.metodo || 'Pix',
         tipo: pagamentosParciais[i]?.tipo,
         valor: valorIgual
     }));
     setPagamentosParciais(novos);
  }

  // --- NOVA FUNÇÃO: MÁSCARA DE WHATSAPP ---
  function handleWhatsAppChange(e: React.ChangeEvent<HTMLInputElement>) {
      let value = e.target.value.replace(/\D/g, ''); // Remove tudo o que não é número
      if (value.length > 11) value = value.slice(0, 11); // Limite de 11 dígitos no Brasil
      
      let formatted = value;
      if (value.length > 2) {
          formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
      }
      if (value.length > 7) {
          formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
      }
      setFormData({ ...formData, whatsapp: formatted });
  }

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `perfil/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('alunos_fotos').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('alunos_fotos').getPublicUrl(filePath);
      setFormData({ ...formData, foto_url: data.publicUrl });
      addToast('Foto carregada!', 'success');
    } catch (error) { addToast('Erro no upload.', 'error'); } finally { setUploading(false); }
  }

  function isAniversariante(dataNasc: string) {
      if (!dataNasc) return false;
      const hoje = new Date();
      const [ano, mes, dia] = dataNasc.split('-').map(Number);
      return hoje.getDate() === dia && hoje.getMonth() === (mes - 1);
  }

  function calcularTempoTreino(dataStr?: string) {
      if (!dataStr) return 'Não registrada';
      const [ano, mes, dia] = dataStr.split('-').map(Number);
      if (!ano || !mes || !dia) return 'Data inválida';
      const inicio = new Date(ano, mes - 1, dia);
      const hoje = new Date();
      let meses = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth());
      if (hoje.getDate() < inicio.getDate()) meses--;
      if (meses < 0) return 'Começa no futuro';
      if (meses === 0) return 'Menos de 1 mês';
      const anosCalc = Math.floor(meses / 12);
      const mesesRestantes = meses % 12;
      let res = [];
      if (anosCalc > 0) res.push(`${anosCalc} ano${anosCalc > 1 ? 's' : ''}`);
      if (mesesRestantes > 0) res.push(`${mesesRestantes} mês${mesesRestantes > 1 ? 'es' : ''}`);
      return res.join(' e ');
  }

  function abrirModalPagamento(aluno: Aluno, mesRef: string) {
    let valor = 80.00;
    if (aluno.plano_tipo === '3 Dias') valor = 70.00;
    if (aluno.plano_tipo === '2 Dias') valor = 60.00;
    setPagamentoModal({ show: true, aluno, valorBase: valor, desconto: 0, mesReferencia: mesRef });
    setPagamentosParciais([{ metodo: 'Dinheiro', valor: valor }]); 
  }

  async function confirmarPagamento() {
    if (!pagamentoModal.aluno) return;

    const valorTotalCalculado = Math.max(0, pagamentoModal.valorBase - pagamentoModal.desconto);
    const soma = pagamentosParciais.reduce((acc, p) => acc + p.valor, 0);

    if (Math.abs(soma - valorTotalCalculado) > 0.5) { 
        addToast(`A soma deve ser R$ ${valorTotalCalculado.toFixed(2)}`, 'warning'); 
        return; 
    }

    try {
      const operadorNome = user?.nome || user?.usuario || 'Operador Local';

      await supabase.from('transacoes').insert([{
        descricao: `Mensalidade (${pagamentoModal.mesReferencia}) - ${pagamentoModal.aluno.nome}`,
        valor: valorTotalCalculado,
        tipo: 'Receita',
        categoria: 'Mensalidade',
        data: new Date().toISOString(), 
        mes_referencia: pagamentoModal.mesReferencia, 
        aluno_id: pagamentoModal.aluno.id,
        detalhes_pagamento: { 
            metodos: pagamentosParciais,
            desconto_aplicado: pagamentoModal.desconto,
            operador: operadorNome
        }
      }]);

      addToast(`Pagamento confirmado!`, 'success'); 

      const dadosRecibo = {
          aluno: pagamentoModal.aluno.nome,
          data: new Date(),
          referencia: `Mensalidade (${pagamentoModal.mesReferencia})`, 
          valorBase: pagamentoModal.valorBase,
          desconto: pagamentoModal.desconto,
          valorPago: valorTotalCalculado,
          metodos: pagamentosParciais,
          operador: operadorNome
      };

      setPagamentoModal({ show: false, aluno: null, valorBase: 0, desconto: 0, mesReferencia: '' }); 
      setReciboModal({ show: true, dados: dadosRecibo });
      
      fetchAlunos();
    } catch (error) { addToast('Erro ao registrar.', 'error'); }
  }

  async function gerarECompartilharPDF() {
    if (!reciboRef.current || !reciboModal) return;
    
    try {
        addToast('Gerando documento em alta qualidade...', 'info');
        
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const canvas = await html2canvas(reciboRef.current, { 
            scale: 2, 
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            windowWidth: 800 
        });

        document.body.style.overflow = originalOverflow;

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        const nomeAlunoFormatado = reciboModal.dados.aluno.replace(/\s+/g, '_');
        const nomeArquivo = `Recibo_BJJCollege_${nomeAlunoFormatado}.pdf`;
        const pdfBlob = pdf.output('blob');

        let shareSuccess = false;
        try {
            const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Recibo BJJ College'
                });
                shareSuccess = true;
            }
        } catch (shareError: any) {
            if (shareError.name !== 'AbortError') {
                console.warn("Compartilhamento nativo bloqueado", shareError);
            } else {
                return; 
            }
        }

        if (!shareSuccess) {
            const objectUrl = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = nomeArquivo;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => window.URL.revokeObjectURL(objectUrl), 2000);
            addToast('Download iniciado! Verifique seus arquivos.', 'success');
        }

    } catch (error) {
        console.error("Erro crítico ao gerar PDF:", error);
        addToast('Erro ao gerar comprovante.', 'error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!formData.nome || !formData.graduacao || !formData.categoria || !formData.data_nascimento) {
          addToast('Preencha os campos obrigatórios (*)', 'warning');
          return;
      }
      try {
        const alunoData = { ...formData };
        delete (alunoData as any).pago_mes_atual; 
        delete (alunoData as any).pago_proximo_mes; 
        delete (alunoData as any).divida_loja; 

        if (!alunoData.plano_tipo) alunoData.plano_tipo = 'Todos os dias';
        if (!alunoData.status) alunoData.status = 'Ativo';
        
        if (editMode && formData.id) await supabase.from('alunos').update(alunoData).eq('id', formData.id);
        else await supabase.from('alunos').insert([alunoData]);
        
        addToast('Aluno salvo com sucesso!', 'success'); 
        setViewState('list'); 
        fetchAlunos();
      } catch (e:any) { addToast(`Erro ao salvar: ${e.message}`, 'error'); }
  }

  async function executarExclusao() {
    const { error } = await supabase.from('alunos').delete().eq('id', customAlert.id);
    if (error) {
        if (error.code === '23503' || error.message.includes('foreign key')) {
            setCustomAlert({ show: false, id: '', nome: '' }); 
            setForceDeleteAlert({ show: true, id: customAlert.id, nome: customAlert.nome }); 
        } else {
            addToast('Erro desconhecido ao excluir aluno.', 'error');
        }
    } else {
        addToast('Excluído com sucesso.', 'success'); 
        setCustomAlert({ show: false, id: '', nome: '' }); 
        if (selectedAluno?.id === customAlert.id) {
            setViewState('list');
            setSelectedAluno(null);
        }
        fetchAlunos();
    }
  }

  async function executarExclusaoForcada() {
      try {
          const id = forceDeleteAlert.id;
          await supabase.from('transacoes').delete().eq('aluno_id', id);
          await supabase.from('vendas').delete().eq('aluno_id', id);
          const { error } = await supabase.from('alunos').delete().eq('id', id);

          if (error) throw error;
          addToast('Aluno e histórico removidos à força!', 'success');
          setForceDeleteAlert({ show: false, id: '', nome: '' });
          if (selectedAluno?.id === id) {
            setViewState('list');
            setSelectedAluno(null);
          }
          fetchAlunos();
      } catch (error) { addToast('Erro crítico ao forçar exclusão.', 'error'); }
  }

  const toggleDia = (dia: string) => {
    const diasAtuais = formData.plano_dias || [];
    if (diasAtuais.includes(dia)) setFormData({ ...formData, plano_dias: diasAtuais.filter(d => d !== dia) });
    else setFormData({ ...formData, plano_dias: [...diasAtuais, dia] });
  };

  const filteredAlunos = alunos.filter(aluno => {
    const matchCategoria = (aluno.categoria === tabAtual || (!aluno.categoria && tabAtual === 'Adulto'));
    const matchBusca = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filtroDevedores) {
        const deveMensalidade = !aluno.pago_mes_atual && aluno.status === 'Ativo';
        const deveLoja = (aluno.divida_loja || 0) > 0;
        return matchBusca && (deveMensalidade || deveLoja);
    }
    
    return matchCategoria && matchBusca;
  });

  function handleNovoAluno() {
    setFormData({
        categoria: tabAtual, plano_tipo: 'Todos os dias', plano_dias: [],
        graduacao: '', status: 'Ativo', data_matricula: new Date().toISOString().split('T')[0]
    }); 
    setEditMode(false); 
    setViewState('form');
  }

  // --- Função de Segurança para Voltar limpando rastros ---
  function handleVoltarLista() {
      setPagamentoModal({ show: false, aluno: null, valorBase: 0, desconto: 0, mesReferencia: '' });
      setReciboModal(null);
      setViewState('list');
  }

  // ESTRUTURA GERAL (Garante que os Modais flutuem em qualquer tela)
  return (
    <div className="pb-20">
      
      {/* ==================================================== */}
      {/* TELA 1: LISTAGEM DE ALUNOS                           */}
      {/* ==================================================== */}
      {viewState === 'list' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-2xl font-bold text-slate-800 italic uppercase tracking-tighter">Gerenciar Alunos</h2>
              <button onClick={handleNovoAluno} className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-black shadow-lg transition-all font-bold text-sm w-full sm:w-auto justify-center"><Plus size={20}/> NOVO ALUNO</button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
              <div className="flex bg-slate-200 p-1 rounded-2xl gap-1 overflow-x-auto flex-1">
                  {['Adulto', 'Infantil', 'Kids'].map(c => (<button key={c} onClick={()=>{setTabAtual(c as any); setFiltroDevedores(false);}} className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm transition-all ${tabAtual===c && !filtroDevedores ? 'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{c}</button>))}
              </div>
              <button 
                onClick={() => setFiltroDevedores(!filtroDevedores)} 
                className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${filtroDevedores ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600 border border-red-100'}`}
              >
                <AlertTriangle size={18} /> Inadimplentes
              </button>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest"><tr><th className="p-5">Informação</th><th className="p-5 text-center">Status Pagto</th><th className="p-5 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredAlunos.map(aluno => (
                      <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 cursor-pointer group" onClick={() => { setSelectedAluno(aluno); setViewState('details'); }}>
                              <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center relative border border-slate-200 overflow-hidden shadow-inner">
                                      {aluno.foto_url ? <img src={aluno.foto_url} className="w-full h-full object-cover" /> : <User className="text-slate-300" size={24}/>}
                                      {aluno.neurodivergente && <div className="absolute top-1 right-1 bg-purple-600 text-white p-1 rounded-full border border-white shadow-sm"><Brain size={10}/></div>}
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2 group-hover:text-blue-600">
                                          {aluno.nome}
                                          {aluno.status === 'Inativo' && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Inativo</span>}
                                          {isAniversariante(aluno.data_nascimento) && (
                                            <span className="bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase italic">
                                              Aniv. <Cake size={14} className="animate-bounce" />
                                            </span>
                                          )}
                                          {aluno.atleta && <span className="w-2 h-2 rounded-full bg-blue-500" title="Atleta"></span>}
                                      </div>
                                      <div className="flex gap-2 mt-1">
                                          <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{aluno.graduacao}</span>
                                          {aluno.bolsista_jiujitsu && <span className="text-[10px] font-black uppercase bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Bols. Isento</span>}
                                          {(aluno.divida_loja || 0) > 0 && <span className="text-[10px] font-black uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded">Deve Loja</span>}
                                      </div>
                                  </div>
                              </div>
                          </td>
                          <td className="p-4 text-center">
                              {aluno.status === 'Inativo' ? (
                                  <div className="text-xs font-bold text-slate-400 border border-slate-200 px-4 py-2 rounded-xl inline-flex">-</div>
                              ) : aluno.pago_mes_atual ? (
                                  <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 border border-green-100"><CheckCircle size={14}/> {aluno.bolsista_jiujitsu ? 'ISENTO' : 'PAGO'}</div>
                              ) : (
                                  <div className="flex items-center justify-center gap-3">
                                      <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Pendente</span>
                                      <button onClick={(e) => { e.stopPropagation(); abrirModalPagamento(aluno, mesAtualRef); }} className="w-10 h-10 bg-green-500 text-white rounded-xl hover:bg-green-600 shadow-md flex items-center justify-center transition-all hover:scale-110"><DollarSign size={20} /></button>
                                  </div>
                              )}
                          </td>
                          <td className="p-4 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={(e)=>{ e.stopPropagation(); setFormData(aluno); setEditMode(true); setViewState('form')}} className="p-3 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><Edit size={20}/></button>
                                <button onClick={(e)=>{ e.stopPropagation(); setCustomAlert({ show: true, id: aluno.id, nome: aluno.nome }); }} className="p-3 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={20}/></button>
                              </div>
                          </td>
                      </tr>
                    ))}
                </tbody>
              </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TELA 2: DETALHES DO ALUNO                            */}
      {/* ==================================================== */}
      {viewState === 'details' && selectedAluno && (() => {
        const a = selectedAluno;
        return (
            <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={handleVoltarLista} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-all">
                        <ChevronLeft size={24}/> Voltar para Lista
                    </button>
                    <div className="flex gap-2">
                        <button onClick={() => { setFormData(a); setEditMode(true); setViewState('form'); }} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all"><Edit size={20}/></button>
                        <button onClick={() => setCustomAlert({ show: true, id: a.id, nome: a.nome })} className="p-3 bg-white border border-red-100 rounded-2xl text-red-500 hover:bg-red-50 shadow-sm transition-all"><Trash2 size={20}/></button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-white flex flex-col items-center text-center relative overflow-hidden">
                            <div className={`absolute top-0 inset-x-0 h-3 ${a.status === 'Ativo' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            
                            <div className="w-40 h-40 rounded-[3rem] bg-slate-100 flex items-center justify-center mb-6 border-4 border-white shadow-2xl overflow-hidden relative">
                                {a.foto_url ? <img src={a.foto_url} className="w-full h-full object-cover" /> : <User size={80} className="text-slate-300"/>}
                                {a.neurodivergente && (
                                    <div className="absolute bottom-2 right-2 bg-purple-600 text-white p-2 rounded-2xl border-2 border-white shadow-lg">
                                        <Brain size={20}/>
                                    </div>
                                )}
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight mb-1">{a.nome}</h2>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">{a.graduacao}</span>
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">{a.categoria}</span>
                                {a.status === 'Inativo' && <span className="bg-red-100 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">INATIVO</span>}
                            </div>

                            <div className="w-full p-6 rounded-3xl border border-slate-100 bg-slate-50 mb-6 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest border-b border-slate-200 pb-2">Controle de Mensalidades</p>
                                
                                <div className="space-y-4">
                                    {a.status === 'Inativo' ? (
                                        <div className="flex items-center justify-center gap-2 text-slate-400 font-black uppercase text-sm py-4">
                                            <X size={20}/> Mensalidade Suspensa
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-bold text-slate-800 uppercase text-sm">Mês Atual: {mesAtualNome} <span className="text-[10px] text-slate-400">({mesAtualRef.split('/')[1]})</span></p>
                                                </div>
                                                {a.pago_mes_atual ? (
                                                    <div className="w-full bg-green-50 text-green-700 py-3 rounded-xl font-black uppercase text-xs flex justify-center items-center gap-2 border border-green-100">
                                                        <CheckCircle size={16}/> Pago
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); abrirModalPagamento(a, mesAtualRef); }}
                                                        className="w-full bg-green-500 text-white py-3 rounded-xl font-black uppercase text-xs flex justify-center items-center gap-2 hover:bg-green-600 shadow-md transition-all active:scale-95"
                                                    >
                                                        <DollarSign size={18}/> Receber Mensalidade
                                                    </button>
                                                )}
                                            </div>

                                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-bold text-slate-800 uppercase text-sm">Próximo Mês: {proximoMesNome} <span className="text-[10px] text-slate-400">({proximoMesRef.split('/')[1]})</span></p>
                                                </div>
                                                {a.pago_proximo_mes ? (
                                                    <div className="w-full bg-green-50 text-green-700 py-3 rounded-xl font-black uppercase text-xs flex justify-center items-center gap-2 border border-green-100">
                                                        <CheckCircle size={16}/> Pago Antecipado
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); abrirModalPagamento(a, proximoMesRef); }}
                                                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-xs flex justify-center items-center gap-2 hover:bg-black shadow-md transition-all active:scale-95"
                                                    >
                                                        <DollarSign size={18} className="text-green-400"/> Adiantar Pagamento
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {(a.divida_loja || 0) > 0 && (
                                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between animate-pulse mt-2">
                                            <div className="flex items-center gap-3 text-red-600">
                                                <div className="p-2 bg-white rounded-lg shadow-sm"><ShoppingBag size={18}/></div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider">Deve na Loja</p>
                                                    <p className="text-lg font-black leading-none">R$ {a.divida_loja?.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-2">
                                 {a.atleta && <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-blue-100"><Trophy size={14}/> Competidor</div>}
                                 {(a.bolsista_jiujitsu || a.bolsista_musculacao) && <div className="bg-yellow-50 text-yellow-700 p-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-yellow-100"><Medal size={14}/> Bolsista</div>}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Phone size={20}/></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">
                                        {(a.categoria === 'Kids' || a.categoria === 'Infantil') ? 'WhatsApp do Responsável' : 'WhatsApp'}
                                    </p>
                                    <p className="font-bold text-slate-800">{a.whatsapp || 'Não cadastrado'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-white">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-2">
                                <Zap size={22} className="text-yellow-500"/> Detalhes do Plano
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-400 font-bold uppercase text-xs">Tipo de Plano</span>
                                        <span className="font-black text-slate-800 italic">{a.plano_tipo}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-400 font-bold uppercase text-xs">Dias de Treino</span>
                                        <span className="font-black text-blue-600 text-xs uppercase">{a.plano_dias?.join(' • ') || 'A Definir'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2 mt-4">
                                        <span className="text-slate-400 font-bold uppercase text-xs">Tempo de Treino</span>
                                        <span className="font-black text-slate-800 text-xs text-right">
                                            {a.data_matricula ? format(new Date(a.data_matricula), 'dd/MM/yyyy') : 'N/A'}<br/>
                                            <span className="text-[10px] text-blue-600 italic uppercase">{calcularTempoTreino(a.data_matricula)}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-400 font-bold uppercase text-xs">Jiu-Jitsu Bolsista</span>
                                        <span className={`font-black uppercase text-xs ${a.bolsista_jiujitsu ? 'text-green-600' : 'text-slate-300'}`}>{a.bolsista_jiujitsu ? 'Ativo (Isento)' : 'Não'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-400 font-bold uppercase text-xs">Musculação Bolsista</span>
                                        <span className={`font-black uppercase text-xs ${a.bolsista_musculacao ? 'text-green-600' : 'text-slate-300'}`}>{a.bolsista_musculacao ? 'Ativo (Paga Normal)' : 'Não'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-white bg-gradient-to-br from-white to-red-50/20">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-2">
                                <HeartPulse size={22} className="text-red-500"/> Saúde e Condições
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-red-100 text-red-600 rounded-3xl"><Droplet size={24}/></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Tipo Sanguíneo</p>
                                            <p className="text-2xl font-black text-red-600 italic">{a.tipo_sanguineo || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {a.neurodivergente && (
                                        <div className="p-5 bg-purple-50 border border-purple-100 rounded-[2rem]">
                                            <div className="flex items-center gap-2 text-purple-700 font-black uppercase text-[10px] mb-1"><Brain size={16}/> Neurodivergência</div>
                                            <p className="font-bold text-purple-900">{a.neurodivergencia_tipo || 'Especificado'}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Alergias e Remédios</p>
                                        <div className="bg-white p-4 rounded-3xl border border-red-100 text-sm text-slate-600 italic shadow-inner">
                                            {a.alergias || 'Nenhuma alergia ou remédio registrado.'}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Observações Especiais / Responsáveis</p>
                                        <div className="bg-white p-4 rounded-3xl border border-slate-100 text-sm text-slate-600 shadow-inner">
                                            {a.detalhes_condicao || 'Sem observações adicionais.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
      })()}

      {/* ==================================================== */}
      {/* TELA 3: FORMULÁRIO (NOVO/EDITAR)                     */}
      {/* ==================================================== */}
      {viewState === 'form' && (
        <div className="bg-slate-50 min-h-screen p-2 md:p-6 animate-fadeIn">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8 italic uppercase font-black text-slate-800">
                    <button onClick={handleVoltarLista} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronLeft size={28}/></button>
                    <h2 className="text-2xl">{editMode ? 'Editar Perfil' : 'Novo Aluno'}</h2>
                    <div className="w-10"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <div className="relative">
                            <div className="w-36 h-36 rounded-[2.5rem] bg-white border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                                {formData.foto_url ? <img src={formData.foto_url} className="w-full h-full object-cover" /> : <User size={50} className="text-slate-200" />}
                                {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-black uppercase">Enviando...</div>}
                            </div>
                            <label className="absolute bottom-[-5px] right-[-5px] bg-blue-600 text-white p-3 rounded-2xl shadow-xl cursor-pointer hover:scale-110 transition-all">
                                <Plus size={24} /><input type="file" className="hidden" accept="image/*" onChange={handleFotoUpload} disabled={uploading} />
                            </label>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-white">
                        <div className="flex items-center gap-3 mb-8 text-blue-600"><User size={24}/><h3 className="text-xl font-bold text-slate-800">Dados Pessoais</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome Completo <span className="text-red-500">*</span></label>
                                <input className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-medium focus:ring-2 focus:ring-blue-500" value={formData.nome || ''} onChange={e=>setFormData({...formData, nome: e.target.value})} placeholder="Ex: Jackson Lima" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Aniversário <span className="text-red-500">*</span></label>
                                <input type="date" className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-medium text-slate-600 focus:ring-2 focus:ring-blue-500" value={formData.data_nascimento || ''} onChange={e=>setFormData({...formData, data_nascimento: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Data de Matrícula</label>
                                <input type="date" className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-medium text-slate-600 focus:ring-2 focus:ring-blue-500" value={formData.data_matricula || ''} onChange={e=>setFormData({...formData, data_matricula: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Turma <span className="text-red-500">*</span></label>
                                <select 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-bold text-blue-600" 
                                    value={formData.categoria} 
                                    onChange={e => {
                                        const novaCategoria = e.target.value as any;
                                        let novoPlano = formData.plano_tipo || 'Todos os dias';
                                        let novosDias = formData.plano_dias || [];

                                        if (novaCategoria === 'Kids') {
                                            novoPlano = '2 Dias';
                                            novosDias = ['Terça', 'Quinta'];
                                        } else if (novaCategoria === 'Infantil') {
                                            novoPlano = '3 Dias';
                                            novosDias = ['Segunda', 'Quarta', 'Sexta'];
                                        } else if (novaCategoria === 'Adulto') {
                                            novoPlano = 'Todos os dias';
                                            novosDias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
                                        }

                                        setFormData({
                                            ...formData, 
                                            categoria: novaCategoria,
                                            plano_tipo: novoPlano,
                                            plano_dias: novosDias
                                        });
                                    }}
                                >
                                    <option value="Adulto">🥋 Adulto</option>
                                    <option value="Infantil">👦 Infantil</option>
                                    <option value="Kids">👶 Kids</option>
                                </select>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Graduação <span className="text-red-500">*</span></label>
                              <select className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-medium focus:ring-2 focus:ring-blue-500" value={formData.graduacao || ''} onChange={e=>setFormData({...formData, graduacao: e.target.value})}>
                                  <option value="">Selecione...</option>
                                  <option>Branca</option><option>Cinza</option><option>Amarela</option><option>Laranja</option><option>Verde</option><option>Azul</option><option>Roxa</option><option>Marrom</option><option>Preta</option>
                              </select>
                            </div>

                            {/* INPUT COM A MÁSCARA AUTOMÁTICA DE WHATSAPP */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                    {formData.categoria === 'Kids' || formData.categoria === 'Infantil' ? 'WhatsApp (Resp. Financeiro)' : 'WhatsApp'}
                                </label>
                                <input 
                                  className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-medium focus:ring-2 focus:ring-blue-500" 
                                  value={formData.whatsapp || ''} 
                                  onChange={handleWhatsAppChange} 
                                  placeholder="(87) 90000-0000" 
                                  maxLength={15}
                                />
                                {(formData.categoria === 'Kids' || formData.categoria === 'Infantil') && (
                                    <p className="text-[10px] text-slate-500 mt-1 ml-1 leading-tight">Para outros responsáveis, anote nas observações.</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Status do Aluno</label>
                                <select className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-bold text-slate-700" value={formData.status || 'Ativo'} onChange={e=>setFormData({...formData, status: e.target.value})}>
                                    <option value="Ativo">🟢 Ativo (Treinando)</option>
                                    <option value="Inativo">🔴 Inativo (Parou)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-white">
                        <div className="flex items-center gap-3 mb-8 text-red-600"><HeartPulse size={24}/><h3 className="text-xl font-bold text-slate-800">Saúde e Cuidados</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div><label className="text-xs font-bold text-slate-400 uppercase ml-1">Tipo Sanguíneo</label><select className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2" value={formData.tipo_sanguineo || ''} onChange={e=>setFormData({...formData, tipo_sanguineo: e.target.value})}><option value="">Não informado</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
                                <div className={`p-6 rounded-3xl border-2 transition-all ${formData.neurodivergente ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-transparent'}`}>
                                    <label className="flex items-center justify-between cursor-pointer"><div className="flex items-center gap-3"><Brain className={formData.neurodivergente ? 'text-purple-600' : 'text-slate-300'} size={24}/><span className={`font-bold ${formData.neurodivergente ? 'text-purple-700' : 'text-slate-400'}`}>Neurodivergente?</span></div><input type="checkbox" className="w-6 h-6 rounded-lg text-purple-600 border-none bg-white shadow-sm" checked={formData.neurodivergente || false} onChange={e => setFormData({...formData, neurodivergente: e.target.checked})} /></label>
                                    {formData.neurodivergente && <input className="w-full bg-white border-none rounded-xl p-3 mt-4 text-sm font-bold text-purple-600" placeholder="Qual o tipo? (Ex: TDAH)" value={formData.neurodivergencia_tipo || ''} onChange={e => setFormData({...formData, neurodivergencia_tipo: e.target.value})} />}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div><label className="text-xs font-bold text-slate-400 uppercase">Alergias e Remédios</label><textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 h-24 focus:ring-2 focus:ring-red-400" value={formData.alergias || ''} onChange={e=>setFormData({...formData, alergias: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-slate-400 uppercase">Observações (Outros Responsáveis)</label><textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 h-24" value={formData.detalhes_condicao || ''} onChange={e=>setFormData({...formData, detalhes_condicao: e.target.value})} /></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-white">
                        <div className="flex items-center gap-3 mb-8 text-yellow-600"><Medal size={24}/><h3 className="text-xl font-bold text-slate-800">Planos & Atleta</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-400 uppercase">Plano Escolhido</label>
                                <select className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-bold text-slate-700" value={formData.plano_tipo || 'Todos os dias'} onChange={e=>setFormData({...formData, plano_tipo: e.target.value})}>
                                    <option value="Todos os dias">Todos os dias (R$ 80)</option>
                                    <option value="3 Dias">3 Dias na semana (R$ 70)</option>
                                    <option value="2 Dias">2 Dias na semana (R$ 60)</option>
                                </select>
                                {formData.plano_tipo !== 'Todos os dias' && (
                                    <div className="mt-4 animate-fadeIn">
                                        <div className="grid grid-cols-5 gap-1">
                                            {DIAS_SEMANA.map(dia => (
                                                <button key={dia} type="button" onClick={()=>toggleDia(dia)} className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all shadow-sm ${formData.plano_dias?.includes(dia) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>{dia.substring(0,3)}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <label className="flex items-center gap-4 p-4 rounded-2xl border bg-slate-50 cursor-pointer"><input type="checkbox" checked={formData.bolsista_jiujitsu || false} onChange={e=>setFormData({...formData, bolsista_jiujitsu: e.target.checked})} /><span className="font-bold">Bolsista Jiu-Jitsu (Isento)</span></label>
                                <label className="flex items-center gap-4 p-4 rounded-2xl border bg-slate-50 cursor-pointer"><input type="checkbox" checked={formData.bolsista_musculacao || false} onChange={e=>setFormData({...formData, bolsista_musculacao: e.target.checked})} /><span className="font-bold">Bolsista Musculação (Paga Normal)</span></label>
                                <label className="flex items-center gap-4 p-4 rounded-2xl border bg-slate-50 cursor-pointer"><input type="checkbox" checked={formData.atleta || false} onChange={e=>setFormData({...formData, atleta: e.target.checked})} /><span className="font-bold">Aluno Atleta</span></label>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pb-10">
                        <button type="button" onClick={handleVoltarLista} className="flex-1 bg-white text-slate-400 py-5 rounded-[2rem] font-bold border border-slate-200 hover:bg-slate-50">CANCELAR</button>
                        <button type="submit" className="flex-[2] bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-black shadow-xl">SALVAR CADASTRO</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAIS GLOBAIS (APARECEM POR CIMA DE QUALQUER TELA)  */}
      {/* ==================================================== */}

      {/* MODAL PAGAMENTO */}
      {pagamentoModal.show && (() => {
          const valorTotalCalculado = Math.max(0, pagamentoModal.valorBase - pagamentoModal.desconto);
          return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-fadeIn border">
                  <div className="flex justify-between mb-6 italic font-black uppercase">
                      <h3>Receber Mensalidade <span className="text-blue-600 border border-blue-200 bg-blue-50 px-2 py-1 rounded-lg text-xs ml-2">{pagamentoModal.mesReferencia}</span></h3>
                      <button onClick={()=>setPagamentoModal({show:false, aluno:null, valorBase:0, desconto:0, mesReferencia: ''})}><X size={24}/></button>
                  </div>
                  
                  <div className="flex gap-4 mb-6">
                      <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Base</p>
                          <p className="text-xl font-bold text-slate-800">R$ {pagamentoModal.valorBase.toFixed(2)}</p>
                      </div>
                      <div className="flex-1 bg-red-50 rounded-2xl p-4 border border-red-100 text-center relative group">
                          <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Desconto</p>
                          <div className="flex items-center justify-center gap-1">
                              <span className="text-red-500 font-bold">R$</span>
                              <input 
                                  type="number" 
                                  className="w-16 bg-transparent border-none p-0 text-xl font-bold text-red-600 focus:ring-0 text-center" 
                                  value={pagamentoModal.desconto || ''} 
                                  onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setPagamentoModal(prev => ({ ...prev, desconto: val }));
                                      if (pagamentosParciais.length === 1) {
                                          setPagamentosParciais([{ ...pagamentosParciais[0], valor: Math.max(0, pagamentoModal.valorBase - val) }]);
                                      }
                                  }} 
                              />
                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-900 rounded-3xl p-6 text-center mb-6 shadow-lg">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total a Pagar</p>
                      <p className="text-4xl font-black text-white italic">R$ {valorTotalCalculado.toFixed(2)}</p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                      {pagamentosParciais.map((p, idx) => (
                          <div key={idx} className="flex gap-2">
                              <select className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" value={p.metodo} onChange={e=> { 
                                  const n = [...pagamentosParciais]; 
                                  n[idx].metodo = e.target.value; 
                                  if (e.target.value === 'Cartao') n[idx].tipo = 'Crédito'; else delete n[idx].tipo;
                                  setPagamentosParciais(n); 
                              }}>
                                  <option>Dinheiro</option><option>Pix</option><option value="Cartao">Cartão</option>
                              </select>
                              
                              {p.metodo === 'Cartao' && (
                                  <select className="w-28 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" value={p.tipo || 'Crédito'} onChange={e=> { 
                                      const n = [...pagamentosParciais]; 
                                      n[idx].tipo = e.target.value; 
                                      setPagamentosParciais(n); 
                                  }}>
                                      <option value="Crédito">Crédito</option>
                                      <option value="Débito">Débito</option>
                                  </select>
                              )}

                              <input type="number" className="w-28 bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-900" value={p.valor} onChange={e=> { const n = [...pagamentosParciais]; n[idx].valor = parseFloat(e.target.value) || 0; setPagamentosParciais(n); }} />
                          </div>
                      ))}
                      <button onClick={adicionarMetodo} className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">+ Adicionar e dividir</button>
                  </div>

                  {pagamentosParciais.some(p => p.metodo === 'Pix') && (
                      <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-[2rem] flex flex-col items-center animate-bounceIn mb-6 mt-4">
                          <p className="text-[10px] font-black text-blue-600 uppercase mb-3 text-center">Escaneie para Pagar (Mensalidade)</p>
                          <div className="bg-white p-2 rounded-2xl shadow-sm mb-3">
                              <img src="LINK_DA_SUA_IMAGEM_MENSALIDADE_AQUI" className="w-32 h-32 object-contain" alt="QR Pix Mensalidade" />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Chave Pix:</p>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-blue-700">SUA_CHAVE_PIX_EXTENSO</span>
                                  <button type="button" onClick={() => { navigator.clipboard.writeText('CHAVE_PIX_COPIA_E_COLA'); addToast('Copiado!', 'success'); }} className="text-blue-700 hover:bg-blue-100 p-1 rounded-lg transition-all"><Copy size={14}/></button>
                              </div>
                          </div>
                      </div>
                  )}

                  <div className="mb-6 px-2 flex justify-between items-center text-sm border-t pt-4">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Total Somado:</span>
                      <span className={`font-black ${Math.abs(pagamentosParciais.reduce((a,b)=>a+b.valor,0) - valorTotalCalculado) < 0.1 ? 'text-green-600' : 'text-red-500'}`}>
                          R$ {pagamentosParciais.reduce((a,b)=>a+b.valor,0).toFixed(2)}
                      </span>
                  </div>

                  <button onClick={confirmarPagamento} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all">CONFIRMAR E GERAR RECIBO</button>
              </div>
          </div>
          );
      })()}

      {/* MODAL RECIBO DE PAGAMENTO VISÍVEL NA TELA */}
      {reciboModal?.show && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
              <div className="w-full max-w-sm relative">
                  <button onClick={() => setReciboModal(null)} className="absolute -top-4 -right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-slate-100"><X size={20}/></button>

                  <div className="bg-white rounded-[2rem] p-8 shadow-2xl relative w-full overflow-hidden">
                      <div className="text-center relative z-10">
                          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                              <CheckCircle size={32} />
                          </div>
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">BJJ College</h2>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 pb-6 border-b-2 border-dashed border-slate-200">Recibo de Pagamento</p>

                          <div className="space-y-3 text-sm text-left mb-6">
                              <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-[10px]">Data:</span> <span className="font-bold text-slate-800">{format(reciboModal.dados.data, 'dd/MM/yyyy HH:mm')}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-[10px]">Aluno:</span> <span className="font-bold text-slate-800">{reciboModal.dados.aluno}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-[10px]">Referência:</span> <span className="font-bold text-slate-800">{reciboModal.dados.referencia}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-[10px]">Operador:</span> <span className="font-bold text-slate-800">{reciboModal.dados.operador}</span></div>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                              <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">Valor Base:</span> <span className="font-bold text-slate-800">R$ {reciboModal.dados.valorBase.toFixed(2)}</span></div>
                              {reciboModal.dados.desconto > 0 && (
                                  <div className="flex justify-between text-sm mb-2"><span className="text-red-400">Desconto:</span> <span className="font-bold text-red-600">- R$ {reciboModal.dados.desconto.toFixed(2)}</span></div>
                              )}
                              <div className="flex justify-between text-lg mt-2 pt-2 border-t border-slate-200"><span className="font-black text-slate-900 uppercase">Total Pago:</span> <span className="font-black text-green-600">R$ {reciboModal.dados.valorPago.toFixed(2)}</span></div>
                          </div>

                          <div className="text-left mb-6">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Métodos Utilizados:</p>
                              {reciboModal.dados.metodos.map((m: any, i: number) => (
                                  <div key={i} className="flex justify-between text-xs font-bold text-slate-700">
                                      <span>{m.metodo === 'Cartao' ? `Cartão (${m.tipo})` : m.metodo}</span> 
                                      <span>R$ {m.valor.toFixed(2)}</span>
                                  </div>
                              ))}
                          </div>

                          <p className="text-[10px] font-bold text-slate-400 uppercase italic">Obrigado por treinar conosco!</p>
                      </div>
                      
                      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -z-0 opacity-50 translate-x-10 -translate-y-10"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -z-0 opacity-50 -translate-x-10 translate-y-10"></div>
                  </div>

                  <div className="flex gap-2 mt-4">
                      <button 
                          onClick={gerarECompartilharPDF} 
                          className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase flex items-center justify-center gap-2 hover:bg-green-700 shadow-xl shadow-green-200/50 transition-all"
                      >
                          <Share2 size={20}/> Compartilhar
                      </button>
                      <button onClick={() => {
                          const texto = `🥋 *RECIBO DE PAGAMENTO - BJJ COLLEGE*\n\n📅 Data: ${format(reciboModal.dados.data, 'dd/MM/yyyy HH:mm')}\n👤 Aluno: ${reciboModal.dados.aluno}\n🏷️ Referência: ${reciboModal.dados.referencia}\n\n💰 *Valor Pago: R$ ${reciboModal.dados.valorPago.toFixed(2)}*\n(${reciboModal.dados.metodos.map((m:any) => m.metodo === 'Cartao' ? `Cartão ${m.tipo}` : m.metodo).join(', ')})\n\nOperador: ${reciboModal.dados.operador}\nObrigado por treinar conosco! Oss!`;
                          navigator.clipboard.writeText(texto);
                          addToast('Texto copiado!', 'success');
                      }} className="bg-slate-800 text-white px-6 rounded-2xl font-bold flex items-center justify-center hover:bg-slate-900 transition-all">
                          <Copy size={20}/>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* RECIBO INVISÍVEL (FANTASMA) COM TAMANHO FIXO PARA O PDF */}
      {reciboModal?.show && (
          <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', zIndex: -9999, opacity: 0 }}>
              <div ref={reciboRef} style={{ width: '800px', backgroundColor: '#ffffff', padding: '60px', fontFamily: 'sans-serif' }}>
                  <div style={{ border: '2px solid #e2e8f0', borderRadius: '24px', padding: '50px', backgroundColor: '#ffffff' }}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', borderBottom: '2px dashed #cbd5e1', paddingBottom: '30px', marginBottom: '40px' }}>
                          <div style={{ width: '80px', height: '80px', backgroundColor: '#0f172a', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                              <CheckCircle color="white" size={40} />
                          </div>
                          <h2 style={{ fontSize: '42px', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>BJJ College</h2>
                          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#64748b', margin: '8px 0 0 0', textTransform: 'uppercase', letterSpacing: '3px' }}>Recibo de Pagamento</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px' }}>
                              <span style={{ color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Data:</span>
                              <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{format(reciboModal.dados.data, 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px' }}>
                              <span style={{ color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Aluno:</span>
                              <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{reciboModal.dados.aluno}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px' }}>
                              <span style={{ color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Referência:</span>
                              <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{reciboModal.dados.referencia}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px' }}>
                              <span style={{ color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Operador:</span>
                              <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{reciboModal.dados.operador}</span>
                          </div>
                      </div>

                      <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '20px', marginBottom: '40px', border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', marginBottom: '16px' }}>
                              <span style={{ color: '#64748b' }}>Valor Base:</span>
                              <span style={{ color: '#0f172a', fontWeight: 'bold' }}>R$ {reciboModal.dados.valorBase.toFixed(2)}</span>
                          </div>
                          {reciboModal.dados.desconto > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', marginBottom: '16px' }}>
                                  <span style={{ color: '#ef4444' }}>Desconto:</span>
                                  <span style={{ color: '#dc2626', fontWeight: 'bold' }}>- R$ {reciboModal.dados.desconto.toFixed(2)}</span>
                              </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '32px', marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #e2e8f0' }}>
                              <span style={{ color: '#0f172a', fontWeight: 900, textTransform: 'uppercase' }}>Total Pago:</span>
                              <span style={{ color: '#16a34a', fontWeight: 900 }}>R$ {reciboModal.dados.valorPago.toFixed(2)}</span>
                          </div>
                      </div>

                      <div style={{ marginBottom: '40px' }}>
                          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '20px' }}>Métodos Utilizados:</p>
                          {reciboModal.dados.metodos.map((m: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: 'bold', color: '#334155', paddingBottom: '12px' }}>
                                  <span>{m.metodo === 'Cartao' ? `Cartão (${m.tipo})` : m.metodo}</span>
                                  <span>R$ {m.valor.toFixed(2)}</span>
                              </div>
                          ))}
                      </div>

                      <div style={{ textAlign: 'center', marginTop: '50px', paddingTop: '40px', borderTop: '2px dashed #e2e8f0' }}>
                          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#94a3b8', fontStyle: 'italic', textTransform: 'uppercase', margin: 0 }}>Obrigado por treinar conosco! Oss!</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ALERT DE EXCLUSÃO */}
      {customAlert.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={40} /></div>
            <h3 className="text-2xl font-black text-slate-800 uppercase italic mb-2">Excluir?</h3>
            <p className="text-slate-500 mb-8 leading-relaxed">Apagar permanentemente <b>{customAlert.nome}</b>?</p>
            <div className="flex flex-col gap-3">
              <button onClick={executarExclusao} className="w-full py-4 bg-red-600 text-white rounded-[1.5rem] font-black uppercase shadow-xl">CONFIRMAR</button>
              <button onClick={() => setCustomAlert({ show: false, id: '', nome: '' })} className="w-full py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-bold uppercase text-xs">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT DE EXCLUSÃO FORÇADA */}
      {forceDeleteAlert.show && (
        <div className="fixed inset-0 bg-red-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[1000] animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl text-center border-4 border-red-500">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"><AlertTriangle size={50} /></div>
            <h3 className="text-2xl font-black text-red-600 uppercase italic mb-2">REGISTROS PRESOS!</h3>
            <p className="text-slate-600 mb-6 leading-relaxed font-bold">
              Não conseguimos apagar <b>{forceDeleteAlert.nome}</b> porque ele(a) possui histórico financeiro.
            </p>
            <p className="text-sm text-slate-500 mb-8 bg-slate-100 p-4 rounded-xl">
              Deseja <b>FORÇAR A EXCLUSÃO</b>? Isso apagará o aluno e <u className="text-red-600">todo o histórico</u> para sempre.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={executarExclusaoForcada} className="w-full py-4 bg-red-600 text-white rounded-[1.5rem] font-black uppercase shadow-xl hover:bg-red-700 hover:scale-105 transition-all">SIM, APAGAR TUDO</button>
              <button onClick={() => setForceDeleteAlert({ show: false, id: '', nome: '' })} className="w-full py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-bold uppercase text-xs hover:bg-slate-200">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}