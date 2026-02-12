import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, User, AlertCircle, Cake, X, Activity, Trophy, Award, Star, CalendarCheck, Clock, AlertTriangle, QrCode, Download, ChevronLeft, DollarSign, Phone } from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '../contexts/ToastContext';
import QRCode from 'react-qr-code';

// Interface completa do Aluno
interface Aluno {
  id: string;
  nome: string;
  foto_url: string;
  data_nascimento: string;
  peso: number;
  graduacao: string;
  status: string;
  nome_responsavel: string;
  parentesco: string;
  whatsapp: string;
  tipo_sanguineo: string;
  alergias: string;
  neurodivergente: boolean;
  detalhes_condicao: string;
  gatilhos_cuidados: string;
  competidor?: boolean;
  bolsista?: boolean;
  bolsista_a2?: boolean;
  created_at: string;
  ultimo_treino?: string;
  presencas?: any[];
}

export default function Alunos() {
  const { addToast } = useToast();
  
  // Estados de Dados
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [dividaTotal, setDividaTotal] = useState(0);

  // Estados de Controle de Visualização
  // 'list' = Tabela de alunos
  // 'form' = Formulário de cadastro/edição
  // 'details' = Tela de detalhes do aluno
  const [viewState, setViewState] = useState<'list' | 'form' | 'details'>('list');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [showQRCode, setShowQRCode] = useState<Aluno | null>(null);
  const [formData, setFormData] = useState<Partial<Aluno>>({});
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchAlunos();
    // Configuração do Realtime do Supabase
    const channel = supabase
      .channel('alunos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => fetchAlunos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presencas' }, () => fetchAlunos())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAlunos() {
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select(`
          *,
          presencas (data_aula)
        `)
        .order('nome');
      
      if (error) throw error;

      // Processa o último treino
      const alunosComPresenca = data?.map((aluno: any) => {
        let ultimaData = null;
        if (aluno.presencas && aluno.presencas.length > 0) {
          const datasOrdenadas = aluno.presencas.sort((a: any, b: any) => 
            new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
          );
          ultimaData = datasOrdenadas[0].data_aula;
        }
        return { ...aluno, ultimo_treino: ultimaData };
      });

      setAlunos(alunosComPresenca || []);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
    } finally {
      setLoading(false);
    }
  }

  // ABERTURA DA TELA DE DETALHES
  async function handleOpenDetails(aluno: Aluno) {
    setSelectedAluno(aluno);
    setViewState('details'); // Muda a tela para detalhes
    
    // Busca dívidas
    const { data: vendas } = await supabase
      .from('vendas')
      .select('total')
      .eq('aluno_id', aluno.id)
      .eq('status', 'Fiado');

    if (vendas) {
      const totalDevendo = vendas.reduce((acc, venda) => acc + Number(venda.total), 0);
      setDividaTotal(totalDevendo);
    } else {
      setDividaTotal(0);
    }
  }

  function handleBackToList() {
    setViewState('list');
    setSelectedAluno(null);
    setFormData({});
  }

  // FUNÇÕES DE AÇÃO (Salvar, Deletar, Checkin)
  async function handleCheckIn(e: React.MouseEvent, alunoId: string, nomeAluno: string) {
    e.stopPropagation();
    if (!window.confirm(`Confirmar presença de hoje para ${nomeAluno}?`)) return;

    try {
      const { error } = await supabase.from('presencas').insert([{
        aluno_id: alunoId,
        data_aula: new Date().toISOString()
      }]);

      if (error) throw error;
      addToast(`Presença confirmada para ${nomeAluno}! 🥋`, 'success');
    } catch (error) {
      console.error('Erro ao marcar presença:', error);
      addToast('Erro ao marcar presença.', 'error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nome || !formData.graduacao) {
      addToast('Por favor, preencha o Nome e a Graduação.', 'warning');
      return;
    }

    try {
      const alunoData = {
        nome: formData.nome,
        foto_url: formData.foto_url,
        data_nascimento: formData.data_nascimento,
        peso: formData.peso,
        graduacao: formData.graduacao,
        status: formData.status || 'Ativo',
        nome_responsavel: formData.nome_responsavel,
        parentesco: formData.parentesco,
        whatsapp: formData.whatsapp,
        tipo_sanguineo: formData.tipo_sanguineo,
        alergias: formData.alergias,
        neurodivergente: formData.neurodivergente || false,
        detalhes_condicao: formData.detalhes_condicao,
        gatilhos_cuidados: formData.gatilhos_cuidados,
        competidor: formData.competidor || false,
        bolsista: formData.bolsista || false,
        bolsista_a2: formData.bolsista_a2 || false,
      };
      
      if (editMode && formData.id) {
        const { error } = await supabase.from('alunos').update(alunoData).eq('id', formData.id);
        if (error) throw error;
        addToast('Aluno atualizado com sucesso!', 'success');
      } else {
        const { data, error } = await supabase.from('alunos').insert([alunoData]).select().single();
        if (error) throw error;
        addToast('Aluno cadastrado com sucesso!', 'success');
        if (data) setShowQRCode(data as Aluno);
      }
      
      setFormData({});
      setEditMode(false);
      setViewState('list'); // Volta para a lista
      fetchAlunos();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      addToast(`Erro ao salvar: ${error.message}`, 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este aluno?')) return;
    try {
      const { error } = await supabase.from('alunos').delete().eq('id', id);
      if (error) throw error;
      addToast('Aluno removido.', 'success');
      fetchAlunos();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      addToast('Erro ao excluir aluno.', 'error');
    }
  }

  // AUXILIARES
  function formatDateSafe(dateStr?: string) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, "dd 'de' MMMM", { locale: ptBR }) : '-';
  }

  function getStatusPresenca(ultimoTreino?: string) {
    if (!ultimoTreino) return { dias: null, label: 'Sem registro', color: 'bg-slate-100 text-slate-500' };
    const dias = differenceInDays(new Date(), parseISO(ultimoTreino));
    if (dias === 0) return { dias, label: 'Veio Hoje', color: 'bg-green-100 text-green-700' };
    if (dias <= 7) return { dias, label: `${dias} dias atrás`, color: 'bg-blue-50 text-blue-600' };
    if (dias <= 14) return { dias, label: `${dias} dias ausente`, color: 'bg-yellow-100 text-yellow-700' };
    return { dias, label: `${dias} dias s/ treinar`, color: 'bg-red-100 text-red-700 font-bold' };
  }

  const filteredAlunos = alunos.filter(aluno =>
    aluno.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- RENDERIZAÇÃO ---

  // 1. TELA DE FORMULÁRIO
  if (viewState === 'form') {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-fadeIn">
        <div className="flex items-center gap-4 mb-6 border-b pb-4">
          <button onClick={handleBackToList} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">
            {editMode ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
            {/* SEUS CAMPOS DO FORMULÁRIO AQUI - MANTENDO A LÓGICA ORIGINAL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input type="text" required className="w-full p-2 border rounded-lg" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Foto URL</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={formData.foto_url || ''} onChange={e => setFormData({...formData, foto_url: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                  <input type="date" className="w-full p-2 border rounded-lg" value={formData.data_nascimento || ''} onChange={e => setFormData({...formData, data_nascimento: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Peso (kg)</label>
                  <input type="number" className="w-full p-2 border rounded-lg" value={formData.peso || ''} onChange={e => setFormData({...formData, peso: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Graduação</label>
                  <select className="w-full p-2 border rounded-lg bg-white" value={formData.graduacao || ''} onChange={e => setFormData({...formData, graduacao: e.target.value})}>
                    <option value="">Selecione...</option>
                    <optgroup label="Kids"><option value="Branca">Faixa Branca</option><option value="Cinza">Faixa Cinza</option><option value="Amarela">Faixa Amarela</option><option value="Laranja">Faixa Laranja</option><option value="Verde">Faixa Verde</option></optgroup>
                    <optgroup label="Adulto"><option value="Branca">Faixa Branca</option><option value="Azul">Faixa Azul</option><option value="Roxa">Faixa Roxa</option><option value="Marrom">Faixa Marrom</option><option value="Preta">Faixa Preta</option></optgroup>
                  </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select className="w-full p-2 border rounded-lg" value={formData.status || 'Ativo'} onChange={e => setFormData({...formData, status: e.target.value})}>
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>
            </div>

            <div className="border-t pt-4">
                 <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Award size={18} className="text-yellow-500" /> Classificação</h4>
                 <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded border">
                        <input type="checkbox" checked={formData.competidor || false} onChange={e => setFormData({...formData, competidor: e.target.checked})} />
                        <span>Competidor</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded border">
                        <input type="checkbox" checked={formData.bolsista || false} onChange={e => setFormData({...formData, bolsista: e.target.checked})} />
                        <span>Bolsista</span>
                    </label>
                 </div>
            </div>

            <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-800 mb-3">Responsável (Menores)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nome do Responsável" className="w-full p-2 border rounded-lg" value={formData.nome_responsavel || ''} onChange={e => setFormData({...formData, nome_responsavel: e.target.value})} />
                    <input type="text" placeholder="WhatsApp" className="w-full p-2 border rounded-lg" value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                </div>
            </div>

            <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-800 mb-3">Saúde</h4>
                <textarea className="w-full p-2 border rounded-lg" placeholder="Alergias, remédios..." value={formData.alergias || ''} onChange={e => setFormData({...formData, alergias: e.target.value})} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={handleBackToList} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
            </div>
        </form>
      </div>
    );
  }

  // 2. TELA DE DETALHES (O que você pediu)
  if (viewState === 'details' && selectedAluno) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fadeIn min-h-[80vh]">
        {/* Cabeçalho com Foto e Nome */}
        <div className="relative h-48 bg-gradient-to-r from-blue-700 to-slate-900 p-6 flex items-end">
          <button 
            onClick={handleBackToList}
            className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all flex items-center gap-2 pr-4"
          >
            <ChevronLeft size={20} /> Voltar
          </button>
          
          <div className="flex items-end gap-6 translate-y-10 w-full max-w-5xl mx-auto">
            <div className="w-32 h-32 rounded-2xl border-4 border-white bg-slate-200 overflow-hidden shadow-xl relative group">
              {selectedAluno.foto_url ? (
                <img src={selectedAluno.foto_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100">
                  <User size={48} className="text-slate-400" />
                </div>
              )}
            </div>
            <div className="mb-2 pb-1">
              <div className="flex items-center gap-3">
                 <h1 className="text-3xl font-bold text-white shadow-sm">{selectedAluno.nome}</h1>
                 {selectedAluno.competidor && <span className="bg-yellow-500 text-yellow-950 text-xs font-bold px-2 py-1 rounded">Competidor</span>}
              </div>
              <p className="text-blue-100 flex items-center gap-2 mt-1">
                 <span className="px-2 py-0.5 bg-white/20 rounded text-sm">{selectedAluno.graduacao}</span>
                 {selectedAluno.bolsista && <span className="px-2 py-0.5 bg-green-500/20 border border-green-400/50 rounded text-sm text-green-100">Bolsista</span>}
              </p>
            </div>
            
            <div className="ml-auto mb-4 hidden sm:block">
               <button 
                onClick={() => setShowQRCode(selectedAluno)}
                className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-slate-50 transition-colors"
               >
                 <QrCode size={18} /> Carteirinha
               </button>
            </div>
          </div>
        </div>

        {/* Conteúdo dos Detalhes */}
        <div className="mt-16 max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Coluna Esquerda - Status */}
            <div className="space-y-4">
                <div className={`p-5 rounded-xl border-l-4 shadow-sm ${
                    selectedAluno.status === 'Ativo' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                }`}>
                    <p className="text-sm font-medium text-slate-600">Situação Cadastral</p>
                    <h3 className={`text-2xl font-bold ${selectedAluno.status === 'Ativo' ? 'text-green-700' : 'text-red-700'}`}>
                        {selectedAluno.status}
                    </h3>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Dívida Cantina/Loja</p>
                            <h3 className={`text-2xl font-bold ${dividaTotal > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                R$ {dividaTotal.toFixed(2).replace('.', ',')}
                            </h3>
                        </div>
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <DollarSign className="text-slate-500" />
                        </div>
                    </div>
                </div>

                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-3">Último Treino</p>
                     {(() => {
                        const status = getStatusPresenca(selectedAluno.ultimo_treino);
                        return (
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${status.color}`}>
                                <CalendarCheck size={20} />
                                <span className="font-bold">{status.label}</span>
                            </div>
                        )
                    })()}
                </div>
            </div>

            {/* Coluna Direita - Dados Completos */}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-white border rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                        <User size={20} className="text-blue-600" /> Dados Pessoais
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                            <span className="block text-sm text-slate-500">Data Nascimento</span>
                            <span className="font-medium text-slate-800">{formatDateSafe(selectedAluno.data_nascimento)}</span>
                        </div>
                        <div>
                            <span className="block text-sm text-slate-500">Peso</span>
                            <span className="font-medium text-slate-800">{selectedAluno.peso} kg</span>
                        </div>
                        <div className="sm:col-span-2">
                            <span className="block text-sm text-slate-500">Contato (WhatsApp)</span>
                            <div className="flex items-center gap-2">
                                <Phone size={16} className="text-green-600" />
                                <span className="font-medium text-slate-800">{selectedAluno.whatsapp || 'Não informado'}</span>
                            </div>
                        </div>
                        {selectedAluno.nome_responsavel && (
                             <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="block text-xs font-bold text-slate-500 uppercase">Responsável</span>
                                <span className="font-medium text-slate-800">{selectedAluno.nome_responsavel} <span className="text-slate-400 text-sm">({selectedAluno.parentesco})</span></span>
                            </div>
                        )}
                    </div>
                </div>

                {(selectedAluno.alergias || selectedAluno.neurodivergente) && (
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                            <AlertCircle size={20} className="text-red-500" /> Saúde & Cuidados
                        </h3>
                        <div className="space-y-4">
                            {selectedAluno.tipo_sanguineo && (
                                <div><span className="text-slate-500">Tipo Sanguíneo: </span><span className="font-bold">{selectedAluno.tipo_sanguineo}</span></div>
                            )}
                            {selectedAluno.alergias && (
                                <div className="bg-red-50 p-3 rounded border border-red-100 text-red-800 text-sm">
                                    <strong>Alergias:</strong> {selectedAluno.alergias}
                                </div>
                            )}
                            {selectedAluno.neurodivergente && (
                                <div className="bg-blue-50 p-3 rounded border border-blue-100 text-blue-800 text-sm">
                                    <strong>Neurodivergência:</strong> {selectedAluno.detalhes_condicao}
                                    {selectedAluno.gatilhos_cuidados && <p className="mt-1 pt-1 border-t border-blue-200 text-xs">{selectedAluno.gatilhos_cuidados}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  }

  // 3. TELA DE LISTA (Padrão)
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Alunos</h2>
        <button
          onClick={() => { setFormData({}); setEditMode(false); setViewState('form'); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} /> Novo Aluno
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar aluno..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Aluno</th>
                <th className="p-4 font-semibold text-slate-600 hidden sm:table-cell">Graduação</th>
                <th className="p-4 font-semibold text-slate-600">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlunos.map((aluno) => {
                const statusPresenca = getStatusPresenca(aluno.ultimo_treino);
                return (
                  <tr key={aluno.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => handleOpenDetails(aluno)}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                          {aluno.foto_url ? <img src={aluno.foto_url} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-400" />}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{aluno.nome}</div>
                          <div className="text-xs text-slate-500 sm:hidden">{statusPresenca.label}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell"><span className="bg-slate-100 px-2 py-1 rounded text-sm">{aluno.graduacao}</span></td>
                    <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusPresenca.color}`}>{statusPresenca.label}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => handleCheckIn(e, aluno.id, aluno.nome)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Presença"><CalendarCheck size={18} /></button>
                        <button onClick={() => { setFormData(aluno); setEditMode(true); setViewState('form'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(aluno.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* MODAL QR CODE (SEPARADO) */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]" onClick={() => setShowQRCode(null)}>
            <div className="bg-white p-6 rounded-xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">{showQRCode.nome}</h3>
                <div className="bg-white p-2 inline-block border-2 border-black rounded">
                    <QRCode value={showQRCode.id} size={200} />
                </div>
                <button onClick={() => setShowQRCode(null)} className="mt-6 w-full py-2 bg-slate-200 rounded-lg font-bold">Fechar</button>
            </div>
        </div>
      )}
    </div>
  );
}