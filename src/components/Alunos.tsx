import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';

interface Aluno {
  id: string;
  nome: string;
  foto_url: string;
  data_nascimento: string | null;
  peso: number | null;
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
}

const graduacoesKids = [
  'Branca',
  'Cinza/Branca',
  'Cinza',
  'Cinza/Preta',
  'Amarela/Branca',
  'Amarela',
  'Amarela/Preta',
  'Laranja/Branca',
  'Laranja',
  'Laranja/Preta',
  'Verde/Branca',
  'Verde',
  'Verde/Preta',
];

const graduacoesAdultos = [
  'Azul',
  'Roxa',
  'Marrom',
  'Preta',
  'Coral',
  'Vermelha',
];

const tiposSanguineos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Alunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [filteredAlunos, setFilteredAlunos] = useState<Aluno[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentTab, setCurrentTab] = useState('dados');
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [formData, setFormData] = useState<Partial<Aluno>>({
    nome: '',
    foto_url: '',
    data_nascimento: null,
    peso: null,
    graduacao: '',
    status: 'Ativo',
    nome_responsavel: '',
    parentesco: '',
    whatsapp: '',
    tipo_sanguineo: '',
    alergias: '',
    neurodivergente: false,
    detalhes_condicao: '',
    gatilhos_cuidados: '',
  });

  useEffect(() => {
    loadAlunos();
  }, []);

  useEffect(() => {
    const filtered = alunos.filter((aluno) =>
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.graduacao.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAlunos(filtered);
  }, [searchTerm, alunos]);

  async function loadAlunos() {
    const { data } = await supabase
      .from('alunos')
      .select('*')
      .order('nome');

    if (data) {
      setAlunos(data);
      setFilteredAlunos(data);
    }
  }

  function openForm(aluno?: Aluno) {
    if (aluno) {
      setEditingAluno(aluno);
      setFormData(aluno);
    } else {
      setEditingAluno(null);
      setFormData({
        nome: '',
        foto_url: '',
        data_nascimento: null,
        peso: null,
        graduacao: '',
        status: 'Ativo',
        nome_responsavel: '',
        parentesco: '',
        whatsapp: '',
        tipo_sanguineo: '',
        alergias: '',
        neurodivergente: false,
        detalhes_condicao: '',
        gatilhos_cuidados: '',
      });
    }
    setShowForm(true);
    setCurrentTab('dados');
  }

  function closeForm() {
    setShowForm(false);
    setEditingAluno(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingAluno) {
      await supabase
        .from('alunos')
        .update(formData)
        .eq('id', editingAluno.id);
    } else {
      await supabase
        .from('alunos')
        .insert([formData]);
    }

    closeForm();
    loadAlunos();
  }

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            {editingAluno ? 'Editar Aluno' : 'Novo Aluno'}
          </h1>
          <button
            onClick={closeForm}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4 px-6">
              {[
                { id: 'dados', label: 'Dados Pessoais' },
                { id: 'graduacao', label: 'Graduação' },
                { id: 'responsaveis', label: 'Responsáveis' },
                { id: 'saude', label: 'Saúde & Inclusão' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`py-4 px-2 font-medium border-b-2 transition-colors ${
                    currentTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {currentTab === 'dados' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL da Foto
                  </label>
                  <input
                    type="url"
                    value={formData.foto_url}
                    onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={formData.data_nascimento || ''}
                      onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.peso || ''}
                      onChange={(e) => setFormData({ ...formData, peso: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inadimplente">Inadimplente</option>
                  </select>
                </div>
              </div>
            )}

            {currentTab === 'graduacao' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Graduação - Kids
                  </label>
                  <select
                    value={formData.graduacao}
                    onChange={(e) => setFormData({ ...formData, graduacao: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg mb-4"
                  >
                    <option value="">Selecione...</option>
                    {graduacoesKids.map((grad) => (
                      <option key={grad} value={grad}>{grad}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Graduação - Adultos
                  </label>
                  <select
                    value={formData.graduacao}
                    onChange={(e) => setFormData({ ...formData, graduacao: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                  >
                    <option value="">Selecione...</option>
                    {graduacoesAdultos.map((grad) => (
                      <option key={grad} value={grad}>{grad}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {currentTab === 'responsaveis' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.nome_responsavel}
                    onChange={(e) => setFormData({ ...formData, nome_responsavel: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parentesco
                  </label>
                  <input
                    type="text"
                    value={formData.parentesco}
                    onChange={(e) => setFormData({ ...formData, parentesco: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="Ex: Pai, Mãe, Avô..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            )}

            {currentTab === 'saude' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo Sanguíneo
                  </label>
                  <select
                    value={formData.tipo_sanguineo}
                    onChange={(e) => setFormData({ ...formData, tipo_sanguineo: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                  >
                    <option value="">Selecione...</option>
                    {tiposSanguineos.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alergias
                  </label>
                  <textarea
                    value={formData.alergias}
                    onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="neurodivergente"
                    checked={formData.neurodivergente}
                    onChange={(e) => setFormData({ ...formData, neurodivergente: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="neurodivergente" className="text-sm font-medium text-gray-700">
                    Neurodivergente?
                  </label>
                </div>

                {formData.neurodivergente && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Detalhes da Condição
                      </label>
                      <textarea
                        value={formData.detalhes_condicao}
                        onChange={(e) => setFormData({ ...formData, detalhes_condicao: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gatilhos / Cuidados Especiais
                      </label>
                      <textarea
                        value={formData.gatilhos_cuidados}
                        onChange={(e) => setFormData({ ...formData, gatilhos_cuidados: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={closeForm}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg"
              >
                {editingAluno ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Alunos</h1>
        <button
          onClick={() => openForm()}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Aluno</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome ou graduação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nome</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Graduação</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAlunos.map((aluno) => (
              <tr key={aluno.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    {aluno.foto_url ? (
                      <img
                        src={aluno.foto_url}
                        alt={aluno.nome}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {aluno.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-medium text-gray-800">{aluno.nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{aluno.graduacao}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      aluno.status === 'Ativo'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {aluno.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => openForm(aluno)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAlunos.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum aluno encontrado
          </div>
        )}
      </div>
    </div>
  );
}
