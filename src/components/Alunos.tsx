import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, User, AlertCircle, Cake, X, Activity, Trophy, Award, Star, CalendarCheck, Clock, AlertTriangle, QrCode, Download } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '../contexts/ToastContext';
import QRCode from 'react-qr-code';

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
}

export default function Alunos() {
  const { addToast } = useToast();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [dividaTotal, setDividaTotal] = useState(0);
  const [showQRCode, setShowQRCode] = useState<Aluno | null>(null);

  const [formData, setFormData] = useState<Partial<Aluno>>({});
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchAlunos();

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
      
      if (error) {
        console.error('Erro ao buscar alunos:', error);
        // Don't toast here to avoid spamming if there's a persistent error
        return; 
      }

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

  async function handleOpenDetails(aluno: Aluno) {
    setSelectedAluno(aluno);
    
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.nome || !formData.graduacao) {
      addToast('Por favor, preencha o Nome e a Graduação.', 'warning');
      return;
    }

    try {
      // Create a clean object with only the fields that exist in the 'alunos' table
      const alunoData = {
        nome: formData.nome,
        foto_url: formData.foto_url,
        data_nascimento: formData.data_nascimento,
        peso: formData.peso,
        graduacao: formData.graduacao,
        status: formData.status || 'Ativo', // Default to 'Ativo' if undefined
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
        const { error } = await supabase
          .from('alunos')
          .update(alunoData)
          .eq('id', formData.id);
        if (error) throw error;
        addToast('Aluno atualizado com sucesso!', 'success');
        setShowForm(false);
      } else {
        const { data, error } = await supabase
          .from('alunos')
          .insert([alunoData])
          .select()
          .single();
          
        if (error) throw error;
        
        addToast('Aluno cadastrado com sucesso!', 'success');
        setShowForm(false);
        
        if (data) {
            setShowQRCode(data as Aluno);
        }
      }
      
      setFormData({});
      setEditMode(false);
      fetchAlunos();
    } catch (error: any) {
      console.error('Erro ao salvar aluno:', error);
      addToast(`Erro ao salvar: ${error.message}`, 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este aluno?')) return;
    try {
      const { error } = await supabase.from('alunos').delete().eq('id', id);
      if (error) throw error;
      addToast('Aluno removido com sucesso.', 'success');
      fetchAlunos();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      addToast('Erro ao excluir aluno.', 'error');
    }
  }

  function isAniversariante(dataNasc: string) {
    if (!dataNasc) return false;
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    const nascAjustado = new Date(nasc.getUTCFullYear(), nasc.getUTCMonth(), nasc.getUTCDate());
    
    return hoje.getDate() === nascAjustado.getDate() && 
           hoje.getMonth() === nascAjustado.getMonth();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Alunos</h2>
        <button
          onClick={() => {
            setFormData({});
            setEditMode(false);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Novo Aluno
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome..."
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
                <th className="p-4 font-semibold text-slate-600">Frequência</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlunos.map((aluno) => {
                const aniversariante = isAniversariante(aluno.data_nascimento);
                const statusPresenca = getStatusPresenca(aluno.ultimo_treino);

                return (
                  <tr key={aluno.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleOpenDetails(aluno)}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden relative">
                          {aluno.foto_url ? (
                            <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-slate-400" />
                          )}
                          {aluno.competidor && (
                             <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white" title="Competidor">
                               <Trophy size={10} className="text-yellow-900" />
                             </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {aluno.nome}
                            {aniversariante && (
                              <span className="flex items-center gap-1 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                <Cake size={12} /> Hoje!
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1 sm:hidden">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusPresenca.color}`}>
                              {statusPresenca.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-sm font-medium">
                        {aluno.graduacao}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowQRCode(aluno); }}
                          className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                          title="Ver QR Code"
                        >
                          <QrCode size={18} />
                        </button>

                        <button
                          onClick={(e) => handleCheckIn(e, aluno.id, aluno.nome)}
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                          title="Marcar Presença Hoje"
                        >
                          <CalendarCheck size={18} />
                        </button>
                        
                        <span className={`hidden sm:inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusPresenca.color} items-center gap-1`}>
                          {statusPresenca.dias !== null && statusPresenca.dias > 14 && <AlertTriangle size={12} />}
                          {statusPresenca.label}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setFormData(aluno);
                            setEditMode(true);
                            setShowForm(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(aluno.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL QR CODE */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowQRCode(null)}>
          <div className="bg-white rounded-2xl flex flex-col items-center max-w-sm w-full overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 w-full p-6 text-center">
                <h3 className="text-xl font-bold text-white tracking-widest">BJJ COLLEGE</h3>
                <p className="text-slate-400 text-xs uppercase tracking-wide mt-1">Carteira do Atleta</p>
            </div>
            <div className="p-8 flex flex-col items-center w-full bg-white relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden -mt-16 mb-4 bg-slate-200 z-10">
                  {showQRCode.foto_url ? (
                    <img src={showQRCode.foto_url} alt={showQRCode.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-500">
                      <User size={40} />
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-slate-800 text-center leading-tight">{showQRCode.nome}</h2>
                <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-semibold text-slate-600 mt-2 mb-6 border border-slate-200">
                  {showQRCode.graduacao}
                </span>
                <div className="p-2 bg-white border-2 border-slate-900 rounded-lg">
                  <QRCode
                    value={showQRCode.id}
                    size={180}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 font-mono">{showQRCode.id.slice(0, 8)}...</p>
            </div>
            <div className="bg-slate-50 w-full p-4 flex gap-2 border-t border-slate-100">
              <button onClick={() => window.print()} className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 flex items-center justify-center gap-2">
                <Download size={18} /> Salvar
              </button>
              <button onClick={() => setShowQRCode(null)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {selectedAluno && !showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
             <div className="relative h-40 bg-gradient-to-r from-blue-600 to-blue-800 p-6 flex items-end">
              <button 
                onClick={() => setSelectedAluno(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 rounded-full p-1"
              >
                <X size={24} />
              </button>
              
              <div className="flex items-end gap-4 translate-y-8">
                <div className="w-24 h-24 rounded-xl border-4 border-white bg-slate-200 overflow-hidden shadow-lg relative">
                  {selectedAluno.foto_url ? (
                    <img src={selectedAluno.foto_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      <User size={40} className="text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <h3 className="text-2xl font-bold text-white shadow-sm">{selectedAluno.nome}</h3>
                  <button 
                    onClick={() => { setSelectedAluno(null); setShowQRCode(selectedAluno); }}
                    className="mt-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 backdrop-blur-sm transition-colors"
                  >
                    <QrCode size={14} /> Ver Carteirinha
                  </button>
                </div>
              </div>
            </div>
            
            <div className="pt-12 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border-l-4 shadow-sm ${
                    selectedAluno.status === 'Ativo' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Status da Mensalidade</p>
                        <h4 className={`text-xl font-bold ${
                          selectedAluno.status === 'Ativo' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {selectedAluno.status}
                        </h4>
                        {(selectedAluno.bolsista || selectedAluno.bolsista_a2) && (
                           <span className="text-xs font-bold text-slate-500 uppercase mt-1 block">
                             (Isento de Pagamento - Bolsista)
                           </span>
                        )}
                      </div>
                      <Activity className={selectedAluno.status === 'Ativo' ? 'text-green-500' : 'text-red-500'} />
                    </div>
                    {!(selectedAluno.bolsista || selectedAluno.bolsista_a2) && (
                      <p className="text-xs text-slate-500 mt-2">
                        Vencimento sugerido: Dia 10
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Dívida na Cantina</p>
                        <h4 className={`text-xl font-bold ${dividaTotal > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                          R$ {dividaTotal.toFixed(2).replace('.', ',')}
                        </h4>
                      </div>
                      <DollarSign className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Total em compras "Fiado"
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
                    <User size={18} className="text-blue-600" /> Dados Pessoais
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-slate-500">Data de Nascimento</span>
                      <span className="font-medium">
                        {selectedAluno.data_nascimento ? format(new Date(selectedAluno.data_nascimento), "dd 'de' MMMM", { locale: ptBR }) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Peso</span>
                      <span className="font-medium">{selectedAluno.peso} kg</span>
                    </div>
                    {selectedAluno.whatsapp && (
                      <div className="col-span-2">
                        <span className="block text-slate-500">Contato / WhatsApp</span>
                        <span className="font-medium">{selectedAluno.whatsapp}</span>
                      </div>
                    )}
                    {selectedAluno.nome_responsavel && (
                      <div className="col-span-2 bg-blue-50 p-2 rounded-lg">
                        <span className="block text-blue-600 text-xs font-bold uppercase">Responsável</span>
                        <span className="font-medium text-blue-900">
                          {selectedAluno.nome_responsavel} ({selectedAluno.parentesco})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedAluno.alergias || selectedAluno.neurodivergente || selectedAluno.tipo_sanguineo) && (
                  <div>
                    <h4 className="font-semibold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
                      <AlertCircle size={18} className="text-red-500" /> Saúde e Cuidados
                    </h4>
                    <div className="space-y-3 text-sm">
                      {selectedAluno.tipo_sanguineo && (
                        <div>
                          <span className="text-slate-500">Tipo Sanguíneo: </span>
                          <span className="font-bold bg-red-100 text-red-700 px-2 rounded-full">{selectedAluno.tipo_sanguineo}</span>
                        </div>
                      )}
                      
                      {selectedAluno.alergias && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                          <span className="block text-red-600 font-bold mb-1">⚠️ Alergias & Medicamentos:</span>
                          <p className="text-slate-700">{selectedAluno.alergias}</p>
                        </div>
                      )}

                      {selectedAluno.neurodivergente && (
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <span className="block text-indigo-700 font-bold mb-1 flex items-center gap-2">
                            🧩 Informações de Inclusão
                          </span>
                          <p className="text-slate-700 mb-2"><strong>Condição:</strong> {selectedAluno.detalhes_condicao}</p>
                          {selectedAluno.gatilhos_cuidados && (
                            <div className="text-slate-600 text-xs mt-2 pt-2 border-t border-indigo-200">
                              <strong>Cuidados Especiais:</strong> {selectedAluno.gatilhos_cuidados}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={() => setSelectedAluno(null)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
              >
                Fechar Prontuário
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-6">
              {editMode ? 'Editar Aluno' : 'Novo Aluno'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border rounded-lg"
                    value={formData.nome || ''}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Foto URL (Opcional)</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    placeholder="https://..."
                    value={formData.foto_url || ''}
                    onChange={e => setFormData({...formData, foto_url: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg"
                    value={formData.data_nascimento || ''}
                    onChange={e => setFormData({...formData, data_nascimento: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg"
                    value={formData.peso || ''}
                    onChange={e => setFormData({...formData, peso: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Graduação</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white"
                    value={formData.graduacao || ''}
                    onChange={e => setFormData({...formData, graduacao: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <optgroup label="Kids (0-15 anos)">
                      <option value="Branca">Faixa Branca</option>
                      <option value="Cinza/Branca">Faixa Cinza/Branca</option>
                      <option value="Cinza">Faixa Cinza</option>
                      <option value="Cinza/Preta">Faixa Cinza/Preta</option>
                      <option value="Amarela/Branca">Faixa Amarela/Branca</option>
                      <option value="Amarela">Faixa Amarela</option>
                      <option value="Amarela/Preta">Faixa Amarela/Preta</option>
                      <option value="Laranja/Branca">Faixa Laranja/Branca</option>
                      <option value="Laranja">FaixaLaranja</option>
                      <option value="Laranja/Preta">Faixa Laranja/Preta</option>
                      <option value="Verde/Branca">Faixa Verde/Branca</option>
                      <option value="Verde">Faixa Verde</option>
                      <option value="Verde/Preta">Faixa Verde/Preta</option>
                    </optgroup>
                    <optgroup label="Adulto (16+)">
                      <option value="Branca">Faixa Branca</option>
                      <option value="Azul">Faixa Azul</option>
                      <option value="Roxa">Faixa Roxa</option>
                      <option value="Marrom">Faixa Marrom</option>
                      <option value="Preta">Faixa Preta</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white"
                    value={formData.status || 'Ativo'}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Inadimplente">Inadimplente (Devendo)</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                 <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Award size={18} className="text-yellow-500" /> Classificação & Bolsas
                 </h4>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
                    
                    <div 
                        onClick={() => setFormData({...formData, competidor: !formData.competidor})}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 hover:shadow-sm ${
                        formData.competidor ? 'bg-yellow-50 border-yellow-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            formData.competidor ? 'bg-yellow-500 border-yellow-600' : 'bg-white border-slate-300'
                        }`}>
                            {formData.competidor && <Trophy size={12} className="text-white" />}
                        </div>
                        <span className={`text-sm font-medium ${formData.competidor ? 'text-yellow-800' : 'text-slate-600'}`}>Competidor</span>
                    </div>

                    <div 
                        onClick={() => setFormData({...formData, bolsista: !formData.bolsista})}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 hover:shadow-sm ${
                        formData.bolsista ? 'bg-green-50 border-green-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            formData.bolsista ? 'bg-green-500 border-green-600' : 'bg-white border-slate-300'
                        }`}>
                            {formData.bolsista && <Award size={12} className="text-white" />}
                        </div>
                        <span className={`text-sm font-medium ${formData.bolsista ? 'text-green-800' : 'text-slate-600'}`}>Bolsista Academia</span>
                    </div>

                    <div 
                        onClick={() => setFormData({...formData, bolsista_a2: !formData.bolsista_a2})}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 hover:shadow-sm ${
                        formData.bolsista_a2 ? 'bg-purple-50 border-purple-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            formData.bolsista_a2 ? 'bg-purple-500 border-purple-600' : 'bg-white border-slate-300'
                        }`}>
                            {formData.bolsista_a2 && <Star size={12} className="text-white" />}
                        </div>
                        <span className={`text-sm font-medium ${formData.bolsista_a2 ? 'text-purple-800' : 'text-slate-600'}`}>Bolsista A2</span>
                    </div>

                 </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-slate-800 mb-3">Responsável (Para menores)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Responsável</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg"
                      value={formData.nome_responsavel || ''}
                      onChange={e => setFormData({...formData, nome_responsavel: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Parentesco</label>
                    <select
                      className="w-full p-2 border rounded-lg bg-white"
                      value={formData.parentesco || ''}
                      onChange={e => setFormData({...formData, parentesco: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      <option value="Pai">Pai</option>
                      <option value="Mãe">Mãe</option>
                      <option value="Avó/Avô">Avó/Avô</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp de Emergência</label>
                    <input
                      type="text"
                      placeholder="(XX) XXXXX-XXXX"
                      className="w-full p-2 border rounded-lg"
                      value={formData.whatsapp || ''}
                      onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-500"/> Saúde & Inclusão
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Sanguíneo</label>
                      <select
                        className="w-full p-2 border rounded-lg bg-white"
                        value={formData.tipo_sanguineo || ''}
                        onChange={e => setFormData({...formData, tipo_sanguineo: e.target.value})}
                      >
                        <option value="">-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Alergias / Medicamentos</label>
                    <textarea
                      className="w-full p-2 border rounded-lg"
                      rows={2}
                      placeholder="Ex: Alérgico a Dipirona, Asma..."
                      value={formData.alergias || ''}
                      onChange={e => setFormData({...formData, alergias: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
                    <input
                      type="checkbox"
                      id="neuro"
                      className="w-5 h-5 text-blue-600 rounded"
                      checked={formData.neurodivergente || false}
                      onChange={e => setFormData({...formData, neurodivergente: e.target.checked})}
                    />
                    <label htmlFor="neuro" className="font-medium text-slate-800 cursor-pointer select-none">
                      Possui Neurodivergência ou Deficiência? (TEA, TDAH, etc)
                    </label>
                  </div>

                  {formData.neurodivergente && (
                    <div className="grid grid-cols-1 gap-4 bg-blue-50 p-4 rounded-lg animate-fadeIn">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">Detalhes da Condição</label>
                        <input
                          type="text"
                          placeholder="Ex: Autismo Nível 1"
                          className="w-full p-2 border rounded-lg"
                          value={formData.detalhes_condicao || ''}
                          onChange={e => setFormData({...formData, detalhes_condicao: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">Gatilhos ou Cuidados Especiais</label>
                        <textarea
                          className="w-full p-2 border rounded-lg"
                          rows={2}
                          placeholder="Ex: Sensível a barulho alto, evitar toque surpresa..."
                          value={formData.gatilhos_cuidados || ''}
                          onChange={e => setFormData({...formData, gatilhos_cuidados: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editMode ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}