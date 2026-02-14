import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, Search, Edit, Trash2, User, CheckCircle, 
  Award, Brain, DollarSign, X, 
  HeartPulse, Cake, Phone, Calendar, Hash, Droplets, Info, ChevronLeft
} from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  pago_mes_atual?: boolean;
}

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export default function Alunos() {
  const { addToast } = useToast();
  
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabAtual, setTabAtual] = useState<'Adulto' | 'Infantil' | 'Kids'>('Adulto');
  const [viewState, setViewState] = useState<'list' | 'form' | 'details'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Aluno>>({});
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [pagamentoModal, setPagamentoModal] = useState<{ show: boolean, aluno: Aluno | null, valorTotal: number }>({ show: false, aluno: null, valorTotal: 0 });
  const [pagamentosParciais, setPagamentosParciais] = useState<{ metodo: string, valor: number }[]>([]);

  useEffect(() => { fetchAlunos(); }, []);

  async function fetchAlunos() {
    setLoading(true);
    try {
      const { data: dadosAlunos } = await supabase.from('alunos').select('*').order('nome');
      const inicioMes = startOfMonth(new Date()).toISOString();
      const fimMes = endOfMonth(new Date()).toISOString();
      const { data: pagamentos } = await supabase.from('transacoes').select('aluno_id').eq('tipo', 'Receita').gte('data', inicioMes).lte('data', fimMes);
      const pagantesSet = new Set(pagamentos?.map(p => p.aluno_id));
      
      const alunosProc = dadosAlunos?.map((aluno: any) => ({
        ...aluno,
        pago_mes_atual: pagantesSet.has(aluno.id) || aluno.bolsista_jiujitsu || aluno.bolsista_musculacao
      }));
      setAlunos(alunosProc || []);
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }

  function isAniversariante(dataNasc: string) {
      if (!dataNasc) return false;
      const hoje = new Date();
      const [ano, mes, dia] = dataNasc.split('-').map(Number);
      return hoje.getDate() === dia && hoje.getMonth() === (mes - 1);
  }

  // --- PAGAMENTO ---
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
    if (Math.abs(soma - pagamentoModal.valorTotal) > 0.1) { addToast(`Soma incorreta. Total: R$ ${pagamentoModal.valorTotal}`, 'warning'); return; }
    try {
      const { error } = await supabase.from('transacoes').insert([{
        descricao: `Mensalidade - ${pagamentoModal.aluno.nome}`,
        valor: pagamentoModal.valorTotal,
        tipo: 'Receita',
        categoria: 'Mensalidade',
        data: new Date().toISOString(),
        aluno_id: pagamentoModal.aluno.id,
        detalhes_pagamento: { metodos: pagamentosParciais }
      }]);
      if (error) throw error;
      addToast(`Pagamento confirmado!`, 'success'); 
      setPagamentoModal({ show: false, aluno: null, valorTotal: 0 }); 
      fetchAlunos();
      if (selectedAluno?.id === pagamentoModal.aluno.id) {
          setSelectedAluno({...selectedAluno, pago_mes_atual: true});
      }
    } catch (error) { addToast('Erro ao registrar.', 'error'); }
  }

  // --- CRUD ---
  async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      try {
        const alunoData = { ...formData };
        delete (alunoData as any).pago_mes_atual; 
        if (editMode && formData.id) await supabase.from('alunos').update(alunoData).eq('id', formData.id);
        else await supabase.from('alunos').insert([alunoData]);
        addToast('Salvo com sucesso!', 'success'); setViewState('list'); fetchAlunos();
      } catch (e:any) { addToast(e.message, 'error') }
  }

  async function handleDelete(id: string) { 
    if (!confirm('Deseja excluir este aluno permanentemente?')) return;
    await supabase.from('alunos').delete().eq('id', id); 
    addToast('Excluído.', 'success'); 
    setViewState('list');
    fetchAlunos(); 
  }

  const filteredAlunos = alunos.filter(aluno => 
    (aluno.categoria === tabAtual || (!aluno.categoria && tabAtual === 'Adulto')) &&
    aluno.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- VIEW: DETALHES DO ALUNO (NOVO UX) ---
  if (viewState === 'details' && selectedAluno) {
    const aluno = selectedAluno;
    return (
        <div className="animate-fadeIn pb-10">
            {/* Header de Navegação */}
            <button 
                onClick={() => setViewState('list')}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
            >
                <ChevronLeft size={20}/> Voltar para lista
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cartão de Perfil Principal */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                        {/* Faixa de Status */}
                        <div className={`absolute top-0 inset-x-0 h-2 ${aluno.status === 'Ativo' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        
                        <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center mb-4 border-4 border-white shadow-md relative">
                            {aluno.neurodivergente ? (
                                <div className="absolute -top-1 -right-1 bg-purple-600 text-white p-2 rounded-full shadow-lg border-2 border-white">
                                    <Brain size={20}/>
                                </div>
                            ) : null}
                            <User size={60} className="text-slate-300"/>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 mb-1">{aluno.nome}</h2>
                        <p className="text-slate-500 font-medium mb-4">{aluno.graduacao} • {aluno.categoria}</p>

                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {aluno.pago_mes_atual ? (
                                <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                                    <CheckCircle size={14}/> {aluno.bolsista_jiujitsu || aluno.bolsista_musculacao ? 'Isento' : 'Mensalidade em Dia'}
                                </span>
                            ) : (
                                <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1">
                                    <X size={14}/> Pagamento Pendente
                                </span>
                            )}
                            {isAniversariante(aluno.data_nascimento) && (
                                <span className="bg-pink-100 text-pink-700 px-4 py-1.5 rounded-full text-xs font-bold border border-pink-200 animate-bounce flex items-center gap-1">
                                    <Cake size={14}/> Aniversariante!
                                </span>
                            )}
                        </div>

                        <div className="w-full grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => { setFormData(aluno); setEditMode(true); setViewState('form'); }}
                                className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all text-sm"
                            >
                                <Edit size={16}/> Editar
                            </button>
                            {!aluno.pago_mes_atual && (
                                <button 
                                    onClick={() => abrirModalPagamento(aluno)}
                                    className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition-all text-sm shadow-md shadow-green-100"
                                >
                                    <DollarSign size={16}/> Pagar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cartão de Contato Rápido */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Phone size={18} className="text-blue-500"/> Contato
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">WhatsApp</span>
                                <span className="font-bold text-slate-700">{aluno.whatsapp || 'Não informado'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coluna Central e Direita - Dados Detalhados */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Grade de Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Plano e BJJ */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Award size={18} className="text-yellow-500"/> Informações Técnicas
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-sm text-slate-400">Plano</span>
                                    <span className="font-bold text-slate-700">{aluno.plano_tipo}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-sm text-slate-400">Dias de Treino</span>
                                    <span className="font-bold text-slate-700">{aluno.plano_dias?.join(', ') || 'Todos'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-sm text-slate-400">Bolsista Jiu-Jitsu</span>
                                    <span className={`font-bold ${aluno.bolsista_jiujitsu ? 'text-green-600' : 'text-slate-300'}`}>{aluno.bolsista_jiujitsu ? 'Sim' : 'Não'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-400">Bolsista Musculação</span>
                                    <span className={`font-bold ${aluno.bolsista_musculacao ? 'text-green-600' : 'text-slate-300'}`}>{aluno.bolsista_musculacao ? 'Sim' : 'Não'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Saúde e Cuidados */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <HeartPulse size={18} className="text-red-500"/> Saúde e Segurança
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-sm text-slate-400">Tipo Sanguíneo</span>
                                    <span className="font-bold text-red-600">{aluno.tipo_sanguineo || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-sm text-slate-400">Data Nasc.</span>
                                    <span className="font-bold text-slate-700">
                                        {aluno.data_nascimento ? format(new Date(aluno.data_nascimento), "dd/MM/yyyy") : '-'}
                                    </span>
                                </div>
                                {aluno.neurodivergente && (
                                    <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
                                        <p className="text-[10px] font-bold text-purple-400 uppercase">Neurodivergência</p>
                                        <p className="font-bold text-purple-700">{aluno.neurodivergencia_tipo || 'Sim'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Observações de Texto */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Info size={18} className="text-blue-500"/> Observações e Alergias
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Alergias e Remédios</h4>
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[100px]">
                                    {aluno.alergias || 'Nenhuma registrada.'}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Cuidados Especiais</h4>
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[100px]">
                                    {aluno.detalhes_condicao || 'Nenhum detalhe adicional.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  // --- VIEW: FORMULÁRIO (MANTIDO) ---
  if (viewState === 'form') {
      return (
          <div className="bg-white p-6 rounded-xl animate-fadeIn shadow-sm max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-slate-800">{editMode ? 'Editar Aluno' : 'Novo Aluno'}</h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                 <div className="space-y-4">
                    <h3 className="text-lg font-bold text-blue-600 border-b pb-2 flex items-center gap-2"><User size={20}/> Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                            <input className="border p-2 w-full rounded-lg" required value={formData.nome || ''} onChange={e=>setFormData({...formData, nome: e.target.value})} />
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Data Nascimento</label><input type="date" className="border p-2 w-full rounded-lg" value={formData.data_nascimento || ''} onChange={e=>setFormData({...formData, data_nascimento: e.target.value})} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label><input className="border p-2 w-full rounded-lg" value={formData.whatsapp || ''} onChange={e=>setFormData({...formData, whatsapp: e.target.value})} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Turma</label><select className="border p-2 w-full rounded-lg bg-blue-50" value={formData.categoria} onChange={e=>setFormData({...formData, categoria: e.target.value as any})}><option value="Adulto">Adulto</option><option value="Infantil">Infantil</option><option value="Kids">Kids</option></select></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Graduação</label><select className="border p-2 w-full rounded-lg" value={formData.graduacao} onChange={e=>setFormData({...formData, graduacao: e.target.value})}><option value="">Selecione...</option><option>Branca</option><option>Cinza</option><option>Amarela</option><option>Laranja</option><option>Verde</option><option>Azul</option><option>Roxa</option><option>Marrom</option><option>Preta</option></select></div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-lg font-bold text-red-500 border-b pb-2 flex items-center gap-2"><HeartPulse size={20}/> Saúde e Cuidados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Sanguíneo</label>
                                <select className="border p-2 w-full rounded-lg" value={formData.tipo_sanguineo || ''} onChange={e=>setFormData({...formData, tipo_sanguineo: e.target.value})}>
                                    <option value="">Não informado</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                                </select>
                            </div>
                            <div className="p-4 border rounded-lg bg-slate-50">
                                <label className="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" className="w-5 h-5 text-purple-600 rounded" checked={formData.neurodivergente || false} onChange={e => setFormData({...formData, neurodivergente: e.target.checked})} />
                                    <span className="font-bold text-slate-700 flex items-center gap-2"><Brain size={20} className="text-purple-600"/> É Neurodivergente?</span>
                                </label>
                                {formData.neurodivergente && (
                                    <input className="w-full border p-2 rounded-lg mt-1 bg-white" placeholder="Qual? (Ex: TDAH, Autismo...)" value={formData.neurodivergencia_tipo || ''} onChange={e => setFormData({...formData, neurodivergencia_tipo: e.target.value})} />
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Alergias e Remédios</label><textarea className="border p-2 w-full rounded-lg h-20 resize-none" placeholder="Alergia a remédios, etc..." value={formData.alergias || ''} onChange={e=>setFormData({...formData, alergias: e.target.value})} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Outros Detalhes</label><textarea className="border p-2 w-full rounded-lg h-20 resize-none" placeholder="Observações gerais..." value={formData.detalhes_condicao || ''} onChange={e=>setFormData({...formData, detalhes_condicao: e.target.value})} /></div>
                        </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-lg font-bold text-yellow-600 border-b pb-2 flex items-center gap-2"><Award size={20}/> Planos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Plano Escolhido</label>
                            <select className="border p-2 w-full rounded-lg" value={formData.plano_tipo || 'Todos os dias'} onChange={e=>setFormData({...formData, plano_tipo: e.target.value})}><option value="Todos os dias">Todos os dias</option><option value="3 Dias">3 Dias na semana</option><option value="2 Dias">2 Dias na semana</option></select>
                            {formData.plano_tipo !== 'Todos os dias' && (
                                <div className="mt-3 flex gap-2 flex-wrap">{DIAS_SEMANA.map(dia => (<button key={dia} type="button" onClick={()=>toggleDia(dia)} className={`px-2 py-1 text-xs rounded border ${formData.plano_dias?.includes(dia) ? 'bg-blue-600 text-white' : 'bg-white'}`}>{dia}</button>))}</div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={formData.bolsista_jiujitsu || false} onChange={e=>setFormData({...formData, bolsista_jiujitsu: e.target.checked})} /><span className="text-sm font-medium">Bolsista Jiu-Jitsu</span></label>
                            <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={formData.bolsista_musculacao || false} onChange={e=>setFormData({...formData, bolsista_musculacao: e.target.checked})} /><span className="text-sm font-medium">Bolsista Musculação</span></label>
                        </div>
                    </div>
                 </div>

                 <div className="flex gap-3 justify-end pt-6 border-t">
                    <button type="button" onClick={()=>setViewState('list')} className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Cancelar</button>
                    <button className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold">Salvar Cadastro</button>
                 </div>
              </form>
          </div>
      );
  }

  // --- VIEW: LISTA ---
  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Gerenciar Alunos</h2>
          <button onClick={()=>{setFormData({categoria: tabAtual, plano_tipo:'Todos os dias'}); setEditMode(false); setViewState('form')}} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex gap-2 hover:bg-blue-700 shadow-sm font-bold"><Plus/> Novo Aluno</button>
      </div>
      
      <div className="flex bg-slate-200 p-1 rounded-xl gap-1 w-full sm:w-auto overflow-x-auto">
          {['Adulto', 'Infantil', 'Kids'].map(c => (<button key={c} onClick={()=>setTabAtual(c as any)} className={`flex-1 px-6 py-2 rounded-lg font-bold text-sm transition-all ${tabAtual===c?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{c}</button>))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar aluno..."
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
           <table className="w-full text-left">
             <thead className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                 <tr>
                     <th className="p-4">Aluno</th>
                     <th className="p-4 text-center">Status Pagto.</th>
                     <th className="p-4 text-right">Ações</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {loading ? (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">Carregando...</td></tr>
                ) : filteredAlunos.length === 0 ? (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">Nenhum aluno encontrado.</td></tr>
                ) : (
                    filteredAlunos.map(aluno => (
                        <tr key={aluno.id} className="hover:bg-slate-50 transition-colors">
                           <td 
                             className="p-4 cursor-pointer group"
                             onClick={() => { setSelectedAluno(aluno); setViewState('details'); }}
                           >
                               <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center relative">
                                       {aluno.neurodivergente ? (
                                           <div className="absolute -top-1 -right-1 bg-purple-100 text-purple-600 p-0.5 rounded-full border border-purple-200 shadow-sm" title={aluno.neurodivergencia_tipo}><Brain size={12}/></div>
                                       ) : (
                                           <User className="text-slate-400"/>
                                       )}
                                   </div>
                                   <div>
                                       <div className="font-bold text-slate-800 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                           {aluno.nome}
                                           {isAniversariante(aluno.data_nascimento) && <span className="animate-pulse text-pink-500"><Cake size={16}/></span>}
                                       </div>
                                       <div className="flex gap-1 mt-1">
                                           <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{aluno.graduacao}</span>
                                           {(aluno.bolsista_jiujitsu || aluno.bolsista_musculacao) && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1"><Award size={10}/> Bolsista</span>}
                                       </div>
                                   </div>
                               </div>
                           </td>
                           <td className="p-4 text-center">
                               {aluno.pago_mes_atual ? (
                                   <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 border border-green-200"><CheckCircle size={14}/> {aluno.bolsista_jiujitsu || aluno.bolsista_musculacao ? 'Isento' : 'Pago'}</span>
                               ) : (
                                   <div className="flex items-center justify-center gap-2">
                                       <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">Pendente</span>
                                       <button onClick={(e) => { e.stopPropagation(); abrirModalPagamento(aluno); }} className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-lg hover:scale-110 transition-transform"><DollarSign size={18} /></button>
                                   </div>
                               )}
                           </td>
                           <td className="p-4 text-right">
                               <div className="flex justify-end gap-2">
                                 <button onClick={()=>{setFormData(aluno); setEditMode(true); setViewState('form')}} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button>
                                 <button onClick={()=>handleDelete(aluno.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                               </div>
                           </td>
                        </tr>
                     ))
                )}
             </tbody>
           </table>
      </div>

      {/* MODAL PAGAMENTO (MANTIDO) */}
      {pagamentoModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn">
                <div className="flex justify-between mb-4 border-b pb-4">
                    <div><h3 className="font-bold text-xl text-slate-800">Pagamento Mensalidade</h3><p className="text-slate-500 text-sm">{pagamentoModal.aluno?.nome}</p></div>
                    <button onClick={()=>setPagamentoModal({show:false, aluno:null, valorTotal:0})}><X size={24}/></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100"><span className="text-sm text-blue-600 font-bold uppercase">Total a Receber</span><div className="text-3xl font-extrabold text-blue-900">R$ {pagamentoModal.valorTotal.toFixed(2)}</div></div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Formas de Pagamento</label>
                        {pagamentosParciais.map((pag, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <select className="p-2 border rounded-lg bg-white flex-1 font-medium" value={pag.metodo} onChange={(e) => atualizarParcial(idx, 'metodo', e.target.value)}><option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartao">Cartão</option></select>
                                <div className="relative w-24"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span><input type="number" className="w-full pl-6 p-2 border rounded-lg font-bold" value={pag.valor} onChange={(e) => atualizarParcial(idx, 'valor', parseFloat(e.target.value))} /></div>
                                <button onClick={() => { if(pagamentosParciais.length > 1) setPagamentosParciais(pagamentosParciais.filter((_,i)=>i!==idx)) }} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button onClick={() => {
                            const rest = pagamentoModal.valorTotal - pagamentosParciais.reduce((a,b)=>a+b.valor,0);
                            setPagamentosParciais([...pagamentosParciais, {metodo:'Pix', valor: Math.max(0, rest)}]);
                        }} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline mt-2"><Plus size={14}/> Dividir Pagamento</button>
                    </div>
                    <div className="pt-4 mt-2 border-t">
                        <div className="flex justify-between items-center mb-4 text-sm"><span className="text-slate-500">Soma:</span><span className={`font-bold ${Math.abs(pagamentosParciais.reduce((a,b)=>a+b.valor,0) - pagamentoModal.valorTotal) < 0.1 ? 'text-green-600' : 'text-red-500'}`}>R$ {pagamentosParciais.reduce((a,b)=>a+b.valor,0).toFixed(2)}</span></div>
                        <button onClick={confirmarPagamento} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-lg hover:bg-slate-800 shadow-lg">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}