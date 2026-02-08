import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Edit2 } from 'lucide-react';

interface Instrutor {
  id: string;
  nome: string;
  ativo: boolean;
}

interface TipoAula {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

export default function Configuracoes() {
  const [activeView, setActiveView] = useState<'instrutores' | 'tipos_aula'>('instrutores');
  const [instrutores, setInstrutores] = useState<Instrutor[]>([]);
  const [tiposAula, setTiposAula] = useState<TipoAula[]>([]);
  const [showInstrutorForm, setShowInstrutorForm] = useState(false);
  const [showTipoAulaForm, setShowTipoAulaForm] = useState(false);
  const [editingInstrutor, setEditingInstrutor] = useState<Instrutor | null>(null);
  const [editingTipoAula, setEditingTipoAula] = useState<TipoAula | null>(null);

  const [instrutorForm, setInstrutorForm] = useState({ nome: '' });
  const [tipoAulaForm, setTipoAulaForm] = useState({ nome: '', descricao: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [instrutoresRes, tiposAulaRes] = await Promise.all([
      supabase.from('instrutores').select('*').order('nome'),
      supabase.from('tipos_aula').select('*').order('nome'),
    ]);

    if (instrutoresRes.data) setInstrutores(instrutoresRes.data);
    if (tiposAulaRes.data) setTiposAula(tiposAulaRes.data);
  }

  function openInstrutorForm(instrutor?: Instrutor) {
    if (instrutor) {
      setEditingInstrutor(instrutor);
      setInstrutorForm({ nome: instrutor.nome });
    } else {
      setEditingInstrutor(null);
      setInstrutorForm({ nome: '' });
    }
    setShowInstrutorForm(true);
  }

  function openTipoAulaForm(tipoAula?: TipoAula) {
    if (tipoAula) {
      setEditingTipoAula(tipoAula);
      setTipoAulaForm({ nome: tipoAula.nome, descricao: tipoAula.descricao });
    } else {
      setEditingTipoAula(null);
      setTipoAulaForm({ nome: '', descricao: '' });
    }
    setShowTipoAulaForm(true);
  }

  async function handleInstrutorSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingInstrutor) {
      await supabase
        .from('instrutores')
        .update({ nome: instrutorForm.nome })
        .eq('id', editingInstrutor.id);
    } else {
      await supabase.from('instrutores').insert([{ nome: instrutorForm.nome, ativo: true }]);
    }

    setShowInstrutorForm(false);
    setEditingInstrutor(null);
    loadData();
  }

  async function handleTipoAulaSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingTipoAula) {
      await supabase
        .from('tipos_aula')
        .update({ nome: tipoAulaForm.nome, descricao: tipoAulaForm.descricao })
        .eq('id', editingTipoAula.id);
    } else {
      await supabase
        .from('tipos_aula')
        .insert([{ ...tipoAulaForm, ativo: true }]);
    }

    setShowTipoAulaForm(false);
    setEditingTipoAula(null);
    loadData();
  }

  async function toggleInstrutorStatus(id: string, ativo: boolean) {
    await supabase.from('instrutores').update({ ativo: !ativo }).eq('id', id);
    loadData();
  }

  async function toggleTipoAulaStatus(id: string, ativo: boolean) {
    await supabase.from('tipos_aula').update({ ativo: !ativo }).eq('id', id);
    loadData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Configurações</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveView('instrutores')}
              className={`px-6 py-4 font-medium ${
                activeView === 'instrutores'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Instrutores
            </button>
            <button
              onClick={() => setActiveView('tipos_aula')}
              className={`px-6 py-4 font-medium ${
                activeView === 'tipos_aula'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Tipos de Aula
            </button>
          </nav>
        </div>

        {activeView === 'instrutores' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => openInstrutorForm()}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Novo Instrutor</span>
              </button>
            </div>

            {showInstrutorForm && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <form onSubmit={handleInstrutorSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Instrutor *
                    </label>
                    <input
                      type="text"
                      value={instrutorForm.nome}
                      onChange={(e) => setInstrutorForm({ nome: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowInstrutorForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      {editingInstrutor ? 'Atualizar' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {instrutores.map((instrutor) => (
                    <tr key={instrutor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-800">{instrutor.nome}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            instrutor.ativo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {instrutor.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openInstrutorForm(instrutor)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => toggleInstrutorStatus(instrutor.id, instrutor.ativo)}
                            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                          >
                            {instrutor.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {instrutores.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nenhum instrutor cadastrado
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'tipos_aula' && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => openTipoAulaForm()}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Novo Tipo de Aula</span>
              </button>
            </div>

            {showTipoAulaForm && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <form onSubmit={handleTipoAulaSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Tipo de Aula *
                    </label>
                    <input
                      type="text"
                      value={tipoAulaForm.nome}
                      onChange={(e) => setTipoAulaForm({ ...tipoAulaForm, nome: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Kids Turma A"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={tipoAulaForm.descricao}
                      onChange={(e) =>
                        setTipoAulaForm({ ...tipoAulaForm, descricao: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowTipoAulaForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      {editingTipoAula ? 'Atualizar' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tiposAula.map((tipoAula) => (
                    <tr key={tipoAula.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-800">{tipoAula.nome}</td>
                      <td className="px-6 py-4 text-gray-600">{tipoAula.descricao}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            tipoAula.ativo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {tipoAula.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openTipoAulaForm(tipoAula)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => toggleTipoAulaStatus(tipoAula.id, tipoAula.ativo)}
                            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                          >
                            {tipoAula.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tiposAula.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nenhum tipo de aula cadastrado
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
