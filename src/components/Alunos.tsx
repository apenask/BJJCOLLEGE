import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, Edit, Trash2, User, CheckCircle, 
  Brain, DollarSign, X, 
  HeartPulse, Cake, Phone, ChevronLeft, Trophy, Medal, Zap, AlertTriangle, Droplet, ShoppingBag, Copy, QrCode
} from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '../contexts/ToastContext';

interface Aluno {
  id: string;
  nome: string;
  foto_url: string;
  data_nascimento: string;
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
  divida_loja?: number; // CAMPO NOVO
}

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export default function Alunos() {
  const { addToast } = useToast();
  
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tabAtual, setTabAtual] = useState<'Adulto' | 'Infantil' | 'Kids'>('Adulto');
  const [viewState, setViewState] = useState<'list' | 'form' | 'details'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // NOVO: Filtro para ver devedores
  const [filtroDevedores, setFiltroDevedores] = useState(false);

  const [formData, setFormData] = useState<Partial<Aluno>>({ 
    plano_dias: [], 
    plano_tipo: 'Todos os dias',
    categoria: 'Adulto',
    graduacao: '', 
    status: 'Ativo'
  });
  
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Estados dos Modais
  const [customAlert, setCustomAlert] = useState({ show: false, id: '', nome: '' });
  const [forceDeleteAlert, setForceDeleteAlert] = useState({ show: false, id: '', nome: '' }); 
  
  const [pagamentoModal, setPagamentoModal] = useState<{ show: boolean, aluno: Aluno | null, valorTotal: number }>({ show: false, aluno: null, valorTotal: 0 });
  const [pagamentosParciais, setPagamentosParciais] = useState<{ metodo: string, valor: number }[]>([]);

  useEffect(() => { fetchAlunos(); }, []);

  async function fetchAlunos() {
    setLoading(true);
    try {
      const { data: dadosAlunos } = await supabase.from('alunos').select('*').order('nome');
      const inicioMes = startOfMonth(new Date()).toISOString();
      const fimMes = endOfMonth(new Date()).toISOString();

      // 1. Verifica Mensalidades Pagas
      const { data: pagamentos } = await supabase
        .from('transacoes')
        .select('aluno_id')
        .eq('tipo', 'Receita')
        .eq('categoria', 'Mensalidade')
        .gte('data', inicioMes)
        .lte('data', fimMes);

      const pagantesSet = new Set(pagamentos?.map(p => p.aluno_id));
      
      // 2. Verifica Dívidas da Loja (Transações 'Pendente' da categoria Loja)
      const { data: dividas } = await supabase.from('transacoes')
         .select('aluno_id, valor')
         .eq('tipo', 'Pendente')
         .eq('categoria', 'Venda Loja');

      // Cria um mapa de ID -> Valor Total Dívida
      const dividaMap = new Map();
      dividas?.forEach(d => {
          const atual = dividaMap.get(d.aluno_id) || 0;
          dividaMap.set(d.aluno_id, atual + Number(d.valor));
      });
      
      const alunosProc = dadosAlunos?.map((aluno: any) => ({
        ...aluno,
        pago_mes_atual: pagantesSet.has(aluno.id) || aluno.bolsista_jiujitsu || aluno.bolsista_musculacao,
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
     const valorIgual = Number((pagamentoModal.valorTotal / novoTamanho).toFixed(2));
     const novos = Array(novoTamanho).fill(null).map((_, i) => ({
         metodo: pagamentosParciais[i]?.metodo || 'Pix',
         valor: valorIgual
     }));
     setPagamentosParciais(novos);
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

  function abrirModalPagamento(aluno: Aluno) {
    let valor = 80.00;
    if (aluno.plano_tipo === '3 Dias') valor = 70.00;
    if (aluno.plano_tipo === '2 Dias') valor = 60.00;
    setPagamentoModal({ show: true, aluno, valorTotal: valor });
    setPagamentosParciais([{ metodo: 'Dinheiro', valor: valor }]); 
  }

  async function confirmarPagamento() {
    if (!pagamentoModal.aluno) return;
    const soma = pagamentosParciais.reduce((acc, p) => acc + p.valor, 0);
    if (Math.abs(soma - pagamentoModal.valorTotal) > 0.5) { 
        addToast(`A soma deve ser R$ ${pagamentoModal.valorTotal}`, 'warning'); 
        return; 
    }
    try {
      await supabase.from('transacoes').insert([{
        descricao: `Mensalidade - ${pagamentoModal.aluno.nome}`,
        valor: pagamentoModal.valorTotal,
        tipo: 'Receita',
        categoria: 'Mensalidade',
        data: new Date().toISOString(),
        aluno_id: pagamentoModal.aluno.id,
        detalhes_pagamento: { metodos: pagamentosParciais }
      }]);
      addToast(`Pagamento confirmado!`, 'success'); 
      setPagamentoModal({ show: false, aluno: null, valorTotal: 0 }); 
      fetchAlunos();
    } catch (error) { addToast('Erro ao registrar.', 'error'); }
  }

  async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      
      // VALIDAÇÃO OBRIGATÓRIA
      if (!formData.nome || !formData.graduacao || !formData.categoria || !formData.data_nascimento) {
          addToast('Preencha os campos obrigatórios (*)', 'warning');
          return;
      }

      try {
        const alunoData = { ...formData };
        delete (alunoData as any).pago_mes_atual; 
        delete (alunoData as any).divida_loja; // Não salva campo calculado

        if (!alunoData.plano_tipo) alunoData.plano_tipo = 'Todos os dias';
        if (!alunoData.status) alunoData.status = 'Ativo';
        
        if (editMode && formData.id) await supabase.from('alunos').update(alunoData).eq('id', formData.id);
        else await supabase.from('alunos').insert([alunoData]);
        
        addToast('Aluno salvo com sucesso!', 'success'); 
        setViewState('list'); 
        fetchAlunos();
      } catch (e:any) { 
        console.error(e);
        addToast(`Erro ao salvar: ${e.message}`, 'error'); 
      }
  }

  // --- FUNÇÃO DE EXCLUSÃO NORMAL ---
  async function executarExclusao() {
    const { error } = await supabase.from('alunos').delete().eq('id', customAlert.id);
    
    if (error) {
        console.error(error);
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

  // --- FUNÇÃO: FORÇAR EXCLUSÃO ---
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

      } catch (error) {
          console.error(error);
          addToast('Erro crítico ao forçar exclusão.', 'error');
      }
  }

  const toggleDia = (dia: string) => {
    const diasAtuais = formData.plano_dias || [];
    if (diasAtuais.includes(dia)) setFormData({ ...formData, plano_dias: diasAtuais.filter(d => d !== dia) });
    else setFormData({ ...formData, plano_dias: [...diasAtuais, dia] });
  };

  const filteredAlunos = alunos.filter(aluno => {
    const matchCategoria = (aluno.categoria === tabAtual || (!aluno.categoria && tabAtual === 'Adulto'));
    const matchBusca = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    // FILTRO DE INADIMPLENTES (Mensalidade Atrasada OU Dívida na Loja)
    if (filtroDevedores) {
        return matchBusca && (!aluno.pago_mes_atual || (aluno.divida_loja || 0) > 0);
    }
    
    return matchCategoria && matchBusca;
  });

  function handleNovoAluno() {
    setFormData({
        categoria: tabAtual, 
        plano_tipo: 'Todos os dias', 
        plano_dias: [],
        graduacao: '', 
        status: 'Ativo'
    }); 
    setEditMode(false); 
    setViewState('form');
  }

  // --- VIEW: DETALHES ---
  if (viewState === 'details' && selectedAluno) {
    const a = selectedAluno;
    return (
        <div className="animate-fadeIn pb-10">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => setViewState('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-all">
                    <ChevronLeft size={24}/> Voltar para Lista
                </button>
                <div className="flex gap-2">
                    <button onClick={() => { setFormData(a); setEditMode(true); setViewState('form'); }} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all"><Edit size={20}/></button>
                    <button onClick={() => setCustomAlert({ show: true, id: a.id, nome: a.nome })} className="p-3 bg-white border border-red-100 rounded-2xl text-red-500 hover:bg-red-50 shadow-sm transition-all"><Trash2 size={20}/></button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Lateral Esquerda */}
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
                        </div>

                        <div className="w-full p-4 rounded-3xl border border-slate-100 bg-slate-50 mb-4 text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Situação Financeira</p>
                            <div className="flex flex-col gap-3">
                                {a.pago_mes_atual ? (
                                    <div className="flex items-center gap-2 text-green-600 font-black uppercase text-sm">
                                        <CheckCircle size={20}/> Mensalidade em Dia
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-red-500 font-black uppercase text-sm">
                                            <X size={20}/> Pagamento Pendente
                                        </div>
                                        <button 
                                            onClick={() => abrirModalPagamento(a)}
                                            className="bg-green-500 text-white p-2 rounded-xl shadow-lg hover:bg-green-600 transition-all"
                                        >
                                            <DollarSign size={16}/>
                                        </button>
                                    </div>
                                )}

                                {/* CARD VERMELHO DE DÍVIDA NA LOJA (NOVO) */}
                                {(a.divida_loja || 0) > 0 && (
                                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between animate-pulse">
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
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">WhatsApp</p><p className="font-bold text-slate-800">{a.whatsapp || 'Não cadastrado'}</p></div>
                        </div>
                    </div>
                </div>

                {/* Área Principal */}
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
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-400 font-bold uppercase text-xs">Jiu-Jitsu Bolsista</span>
                                    <span className={`font-black uppercase text-xs ${a.bolsista_jiujitsu ? 'text-green-600' : 'text-slate-300'}`}>{a.bolsista_jiujitsu ? 'Ativo' : 'Não'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-400 font-bold uppercase text-xs">Musculação Bolsista</span>
                                    <span className={`font-black uppercase text-xs ${a.bolsista_musculacao ? 'text-green-600' : 'text-slate-300'}`}>{a.bolsista_musculacao ? 'Ativo' : 'Não'}</span>
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
                                    <div className="p-4 bg-red-100 text-red-600 rounded-3xl"><Droplet size={24}/></div> {/* ÍCONE CORRIGIDO AQUI */}
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
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Observações Especiais</p>
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
  }

  // --- VIEW: FORMULÁRIO ---
  if (viewState === 'form') {
      return (
          <div className="bg-slate-50 min-h-screen p-2 md:p-6 animate-fadeIn">
              <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-8 italic uppercase font-black text-slate-800">
                      <button onClick={() => setViewState('list')} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronLeft size={28}/></button>
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
                                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">WhatsApp</label>
                                  <input className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-medium focus:ring-2 focus:ring-blue-500" value={formData.whatsapp || ''} onChange={e=>setFormData({...formData, whatsapp: e.target.value})} placeholder="(00) 00000-0000" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Turma <span className="text-red-500">*</span></label>
                                  <select className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-bold text-blue-600" value={formData.categoria} onChange={e=>setFormData({...formData, categoria: e.target.value as any})}><option value="Adulto">🥋 Adulto</option><option value="Infantil">👦 Infantil</option><option value="Kids">👶 Kids</option></select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Graduação <span className="text-red-500">*</span></label>
                                <select className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-medium focus:ring-2 focus:ring-blue-500" value={formData.graduacao || ''} onChange={e=>setFormData({...formData, graduacao: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    <option>Branca</option><option>Cinza</option><option>Amarela</option><option>Laranja</option><option>Verde</option><option>Azul</option><option>Roxa</option><option>Marrom</option><option>Preta</option>
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
                                  <div><label className="text-xs font-bold text-slate-400 uppercase">Observações</label><textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 h-24" value={formData.detalhes_condicao || ''} onChange={e=>setFormData({...formData, detalhes_condicao: e.target.value})} /></div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-white">
                          <div className="flex items-center gap-3 mb-8 text-yellow-600"><Medal size={24}/><h3 className="text-xl font-bold text-slate-800">Planos & Atleta</h3></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                  <label className="text-xs font-bold text-slate-400 uppercase">Plano Escolhido</label>
                                  <select className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-2 font-bold text-slate-700" value={formData.plano_tipo || 'Todos os dias'} onChange={e=>setFormData({...formData, plano_tipo: e.target.value})}>
                                      <option value="Todos os dias">Todos os dias</option>
                                      <option value="3 Dias">3 Dias na semana</option>
                                      <option value="2 Dias">2 Dias na semana</option>
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
                                  <label className="flex items-center gap-4 p-4 rounded-2xl border bg-slate-50 cursor-pointer"><input type="checkbox" checked={formData.bolsista_jiujitsu || false} onChange={e=>setFormData({...formData, bolsista_jiujitsu: e.target.checked})} /><span className="font-bold">Bolsista Jiu-Jitsu</span></label>
                                  <label className="flex items-center gap-4 p-4 rounded-2xl border bg-slate-50 cursor-pointer"><input type="checkbox" checked={formData.bolsista_musculacao || false} onChange={e=>setFormData({...formData, bolsista_musculacao: e.target.checked})} /><span className="font-bold">Bolsista Musculação</span></label>
                                  <label className="flex items-center gap-4 p-4 rounded-2xl border bg-slate-50 cursor-pointer"><input type="checkbox" checked={formData.atleta || false} onChange={e=>setFormData({...formData, atleta: e.target.checked})} /><span className="font-bold">Aluno Atleta</span></label>
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-4 pb-10">
                          <button type="button" onClick={()=>setViewState('list')} className="flex-1 bg-white text-slate-400 py-5 rounded-[2rem] font-bold border border-slate-200 hover:bg-slate-50">CANCELAR</button>
                          <button type="submit" className="flex-[2] bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-black shadow-xl">SALVAR CADASTRO</button>
                      </div>
                  </form>
              </div>
          </div>
      );
  }

  // --- VIEW: LISTAGEM ---
  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800 italic uppercase tracking-tighter">Gerenciar Alunos</h2>
          <button onClick={handleNovoAluno} className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-black shadow-lg transition-all font-bold text-sm w-full sm:w-auto justify-center"><Plus size={20}/> NOVO ALUNO</button>
      </div>
      
      {/* ABAS DE CATEGORIA + BOTÃO DE FILTRO DE DEVEDORES */}
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
                                      {isAniversariante(aluno.data_nascimento) && (
                                        <span className="bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase italic">
                                          Aniversariante <Cake size={14} className="animate-bounce" />
                                        </span>
                                      )}
                                      {aluno.atleta && <span className="w-2 h-2 rounded-full bg-blue-500" title="Atleta"></span>}
                                  </div>
                                  <div className="flex gap-2 mt-1">
                                      <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{aluno.graduacao}</span>
                                      {(aluno.bolsista_jiujitsu || aluno.bolsista_musculacao) && <span className="text-[10px] font-black uppercase bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Bolsista</span>}
                                      {(aluno.divida_loja || 0) > 0 && <span className="text-[10px] font-black uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded">Deve Loja</span>}
                                  </div>
                              </div>
                          </div>
                      </td>
                      <td className="p-4 text-center">
                          {aluno.pago_mes_atual ? (
                              <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 border border-green-100"><CheckCircle size={14}/> {aluno.bolsista_jiujitsu || aluno.bolsista_musculacao ? 'ISENTO' : 'PAGO'}</div>
                          ) : (
                              <div className="flex items-center justify-center gap-3">
                                  <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Pendente</span>
                                  <button onClick={(e) => { e.stopPropagation(); abrirModalPagamento(aluno); }} className="w-10 h-10 bg-green-500 text-white rounded-xl hover:bg-green-600 shadow-md flex items-center justify-center transition-all hover:scale-110"><DollarSign size={20} /></button>
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

      {/* MODAL PAGAMENTO */}
      {pagamentoModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-fadeIn border">
                <div className="flex justify-between mb-6 italic font-black uppercase"><h3>Receber Pagamento</h3><button onClick={()=>setPagamentoModal({show:false, aluno:null, valorTotal:0})}><X size={24}/></button></div>
                <div className="bg-slate-50 rounded-3xl p-6 text-center mb-6 border border-slate-100"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Total</p><p className="text-4xl font-black text-slate-900 italic">R$ {pagamentoModal.valorTotal.toFixed(2)}</p></div>
                
                <div className="space-y-3 mb-6">
                    {pagamentosParciais.map((p, idx) => (
                        <div key={idx} className="flex gap-2">
                            <select className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" value={p.metodo} onChange={e=> { const n = [...pagamentosParciais]; n[idx].metodo = e.target.value; setPagamentosParciais(n); }}>
                                <option>Dinheiro</option><option>Pix</option><option>Cartao</option>
                            </select>
                            <input type="number" className="w-32 bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-900" value={p.valor} onChange={e=> { const n = [...pagamentosParciais]; n[idx].valor = parseFloat(e.target.value) || 0; setPagamentosParciais(n); }} />
                        </div>
                    ))}
                    <button onClick={adicionarMetodo} className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">+ Adicionar e dividir</button>
                </div>

                {/* QR CODE PERSONALIZADO (IGUAL À LOJA) */}
                {pagamentosParciais.some(p => p.metodo === 'Pix') && (
                    <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-[2rem] flex flex-col items-center animate-bounceIn mb-6 mt-4">
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-3 text-center">Escaneie para Pagar (Mensalidade)</p>
                        <div className="bg-white p-2 rounded-2xl shadow-sm mb-3">
                            {/* Substitua o link abaixo pelo link real da sua imagem de QR Code */}
                            <img src="LINK_DA_SUA_IMAGEM_MENSALIDADE_AQUI" className="w-32 h-32 object-contain" alt="QR Pix Mensalidade" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Chave Pix:</p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-blue-700">SUA_CHAVE_PIX_EXTENSO</span>
                                <button 
                                    type="button"
                                    onClick={() => { navigator.clipboard.writeText('CHAVE_PIX_COPIA_E_COLA'); addToast('Copiado!', 'success'); }} 
                                    className="text-blue-700 hover:bg-blue-100 p-1 rounded-lg transition-all"
                                >
                                    <Copy size={14}/>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-6 px-2 flex justify-between items-center text-sm border-t pt-4">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Total Somado:</span>
                    <span className={`font-black ${Math.abs(pagamentosParciais.reduce((a,b)=>a+b.valor,0) - pagamentoModal.valorTotal) < 0.1 ? 'text-green-600' : 'text-red-500'}`}>
                        R$ {pagamentosParciais.reduce((a,b)=>a+b.valor,0).toFixed(2)}
                    </span>
                </div>

                <button onClick={confirmarPagamento} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all">CONFIRMAR</button>
            </div>
        </div>
      )}

      {/* CUSTOM ALERT (NORMAL) */}
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

      {/* ALERT DE FORÇAR EXCLUSÃO (NOVO) */}
      {forceDeleteAlert.show && (
        <div className="fixed inset-0 bg-red-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[1000] animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl text-center border-4 border-red-500">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"><AlertTriangle size={50} /></div>
            <h3 className="text-2xl font-black text-red-600 uppercase italic mb-2">REGISTROS PRESOS!</h3>
            <p className="text-slate-600 mb-6 leading-relaxed font-bold">
              Não conseguimos apagar <b>{forceDeleteAlert.nome}</b> porque ele(a) possui histórico financeiro (mensalidades ou vendas).
            </p>
            <p className="text-sm text-slate-500 mb-8 bg-slate-100 p-4 rounded-xl">
              Deseja <b>FORÇAR A EXCLUSÃO</b>? Isso apagará o aluno e <u className="text-red-600">todo o seu histórico financeiro</u> para sempre.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={executarExclusaoForcada} className="w-full py-4 bg-red-600 text-white rounded-[1.5rem] font-black uppercase shadow-xl hover:bg-red-700 hover:scale-105 transition-all">SIM, APAGAR TUDO</button>
              <button onClick={() => setForceDeleteAlert({ show: false, id: '', nome: '' })} className="w-full py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-bold uppercase text-xs hover:bg-slate-200">CANCELAR (MANTER ALUNO)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}