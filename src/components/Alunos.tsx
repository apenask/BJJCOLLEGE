import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, User, AlertCircle, Cake, X, DollarSign, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  created_at: string;
}

export default function Alunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  // Estados para Visualização de Detalhes (Prontuário)
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [dividaTotal, setDividaTotal] = useState(0);

  // Estados do Formulário (Edição/Criação)
  const [formData, setFormData] = useState<Partial<Aluno>>({});
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchAlunos();
  }, []);

  async function fetchAlunos() {
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      setAlunos(data || []);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
    } finally {
      setLoading(false);
    }
  }

  // Função para abrir o Prontuário (Detalhes)
  async function handleOpenDetails(aluno: Aluno) {
    setSelectedAluno(aluno);
    
    // Buscar dívidas (Vendas "Fiado")
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

  // Função para salvar (Criar ou Editar)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editMode && formData.id) {
        const { error } = await supabase
          .from('alunos')
          .update(formData)
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('alunos')
          .insert([formData]);
        if (error) throw error;
      }
      
      setShowForm(false);
      setFormData({});
      setEditMode(false);
      fetchAlunos();
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      alert('Erro ao salvar aluno');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;
    try {
      const { error } = await supabase.from('alunos').delete().eq('id', id);
      if (error) throw error;
      fetchAlunos();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  }

  // Verifica se é aniversário (Dia e Mês)
  function isAniversariante(dataNasc: string) {
    if (!dataNasc) return false;
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    // Ajuste de fuso horário simples
    const nascAjustado = new Date(nasc.getUTCFullYear(), nasc.getUTCMonth(), nasc.getUTCDate());
    
    return hoje.getDate() === nascAjustado.getDate() && 
           hoje.getMonth() === nascAjustado.getMonth();
  }

  const filteredAlunos = alunos.filter(aluno =>
    aluno.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
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

      {/* Barra de Busca */}
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

      {/* Lista de Alunos */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Aluno</th>
                <th className="p-4 font-semibold text-slate-600 hidden sm:table-cell">Graduação</th>
                <th className="p-4 font-semibold text-slate-600 hidden sm:table-cell">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlunos.map((aluno) => {
                const aniversariante = isAniversariante(aluno.data_nascimento);
                return (
                  <tr key={aluno.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleOpenDetails(aluno)}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                          {aluno.foto_url ? (
                            <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-slate-400" />
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
                          <div className="text-sm text-slate-500 sm:hidden">{aluno.graduacao}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-sm font-medium">
                        {aluno.graduacao}
                      </span>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        aluno.status === 'Ativo' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {aluno.status}
                      </span>
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

      {/* MODAL: Prontuário do Aluno (Visualização) */}
      {selectedAluno && !showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header do Modal */}
            <div className="relative h-32 bg-gradient-to-r from-blue-600 to-blue-800 p-6 flex items-end">
              <button 
                onClick={() => setSelectedAluno(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 rounded-full p-1"
              >
                <X size={24} />
              </button>
              
              <div className="flex items-end gap-4 translate-y-8">
                <div className="w-24 h-24 rounded-xl border-4 border-white bg-slate-200 overflow-hidden shadow-lg">
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
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-white/20 text-white rounded text-sm backdrop-blur-sm border border-white/30">
                      {selectedAluno.graduacao}
                    </span>
                    {isAniversariante(selectedAluno.data_nascimento) && (
                      <span className="px-2 py-0.5 bg-pink-500 text-white rounded text-sm flex items-center gap-1 shadow-sm">
                        <Cake size={14} /> Aniversariante
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Corpo do Modal */}
            <div className="pt-12 p-6 space-y-6">
              
              {/* Card Financeiro */}
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
                    </div>
                    <Activity className={selectedAluno.status === 'Ativo' ? 'text-green-500' : 'text-red-500'} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Vencimento sugerido: Dia 10
                  </p>
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

              {/* Informações Pessoais */}
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

              {/* Saúde e Inclusão */}
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

      {/* Modal de Formulário (Criação/Edição) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
                      <option value="Branca">Branca</option>
                      <option value="Cinza/Branca">Cinza/Branca</option>
                      <option value="Cinza">Cinza</option>
                      <option value="Cinza/Preta">Cinza/Preta</option>
                      <option value="Amarela/Branca">Amarela/Branca</option>
                      <option value="Amarela">Amarela</option>
                      <option value="Amarela/Preta">Amarela/Preta</option>
                      <option value="Laranja/Branca">Laranja/Branca</option>
                      <option value="Laranja">Laranja</option>
                      <option value="Laranja/Preta">Laranja/Preta</option>
                      <option value="Verde/Branca">Verde/Branca</option>
                      <option value="Verde">Verde</option>
                      <option value="Verde/Preta">Verde/Preta</option>
                    </optgroup>
                    <optgroup label="Adulto (16+)">
                      <option value="Azul">Branca</option>
                      <option value="Azul">Azul</option>
                      <option value="Roxa">Roxa</option>
                      <option value="Marrom">Marrom</option>
                      <option value="Preta">Preta</option>
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