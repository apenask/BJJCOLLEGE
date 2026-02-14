import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Database, Shield, Plus, Edit, Trash2, Save, X, User, Key, Lock, 
  AlertTriangle, CheckCircle 
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface AppUser {
  id: string;
  nome: string;
  usuario: string;
  senha?: string;
  permissoes: string[];
  ativo: boolean;
}

const MENU_OPTIONS = [
  { id: 'dashboard', label: 'Painel Geral' },
  { id: 'alunos', label: 'Gestão de Alunos' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'cantina', label: 'Cantina & Loja' },
  { id: 'presencas', label: 'Histórico de Treinos' },
  { id: 'totem', label: 'Acesso ao Totem' },
  { id: 'configuracoes', label: 'Configurações (Admin)' },
];

export default function Configuracoes() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // --- ESTADO PARA O ALERTA PERSONALIZADO ---
  const [customAlert, setCustomAlert] = useState({ 
    show: false, 
    title: '', 
    message: '', 
    onConfirm: () => {}, 
    type: 'danger' as 'danger' | 'success' 
  });

  // Estado para conexão DB
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const [formData, setFormData] = useState<Partial<AppUser>>({
    permissoes: []
  });

  useEffect(() => {
    checkDbConnection();
    fetchUsers();
  }, []);

  async function checkDbConnection() {
    const { error } = await supabase.from('app_usuarios').select('count', { count: 'exact', head: true });
    setDbStatus(error ? 'offline' : 'online');
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase.from('app_usuarios').select('*').order('nome');
      if (error) throw error;
      const parsedData = data?.map(u => ({
        ...u,
        permissoes: typeof u.permissoes === 'string' ? JSON.parse(u.permissoes) : u.permissoes
      }));
      setUsers(parsedData || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.usuario || !formData.senha || !formData.nome) {
      return addToast('Preencha todos os campos obrigatórios.', 'warning');
    }

    try {
      if (editMode && formData.id) {
        const { error } = await supabase
          .from('app_usuarios')
          .update({
            nome: formData.nome,
            usuario: formData.usuario,
            senha: formData.senha,
            permissoes: formData.permissoes
          })
          .eq('id', formData.id);
        if (error) throw error;
        addToast('Usuário atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('app_usuarios')
          .insert([{
            nome: formData.nome,
            usuario: formData.usuario,
            senha: formData.senha,
            permissoes: formData.permissoes || []
          }]);
        if (error) throw error;
        addToast('Usuário criado com sucesso!', 'success');
      }
      
      setShowForm(false);
      setFormData({ permissoes: [] });
      fetchUsers();
    } catch (error: any) {
      addToast(`Erro: ${error.message}`, 'error');
    }
  }

  // --- FUNÇÃO DE EXCLUSÃO (CHAMADA PELO ALERTA CUSTOMIZADO) ---
  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('app_usuarios').delete().eq('id', id);
      if (error) throw error;
      addToast('Usuário removido com sucesso.', 'success');
      fetchUsers();
    } catch (error) {
      addToast('Erro ao remover usuário.', 'error');
    }
  }

  function togglePermission(menuId: string) {
    setFormData(prev => {
      const current = prev.permissoes || [];
      if (current.includes(menuId)) {
        return { ...prev, permissoes: current.filter(p => p !== menuId) };
      } else {
        return { ...prev, permissoes: [...current, menuId] };
      }
    });
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Configurações & Acessos</h2>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${dbStatus === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Banco de Dados: {dbStatus === 'online' ? 'CONECTADO' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" />
              Gestão de Usuários
            </h3>
            <p className="text-sm text-slate-500">Cadastre quem pode acessar o sistema e o que podem ver.</p>
          </div>
          <button 
            onClick={() => {
              setFormData({ permissoes: ['dashboard', 'alunos', 'presencas'] }); 
              setEditMode(false);
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors font-bold shadow-sm"
          >
            <Plus size={18} /> Novo Usuário
          </button>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando usuários...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Login (Usuário)</th>
                  <th className="p-4">Acessos</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{user.nome}</td>
                    <td className="p-4 text-slate-600 font-mono bg-slate-50 w-fit rounded px-2">{user.usuario}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {user.permissoes.includes('configuracoes') ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">Admin Total</span>
                        ) : (
                          user.permissoes.slice(0, 3).map(p => (
                            <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs border border-blue-100">
                              {MENU_OPTIONS.find(m => m.id === p)?.label.split(' ')[0] || p}
                            </span>
                          ))
                        )}
                        {user.permissoes.length > 3 && !user.permissoes.includes('configuracoes') && (
                            <span className="text-xs text-slate-400 pl-1">+{user.permissoes.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setFormData(user);
                            setEditMode(true);
                            setShowForm(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        
                        {/* BOTÃO DE EXCLUIR CHAMANDO O ALERTA CUSTOMIZADO */}
                        <button 
                          onClick={() => setCustomAlert({
                            show: true,
                            title: 'Excluir Usuário?',
                            message: `Deseja remover o acesso de "${user.nome}"? Esta ação impedirá o login deste usuário imediatamente.`,
                            type: 'danger',
                            onConfirm: () => handleDelete(user.id)
                          })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {editMode ? <Edit size={20} /> : <Plus size={20} />}
                {editMode ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setShowForm(false)} className="hover:text-slate-300"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: João Silva"
                    value={formData.nome || ''}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Usuário (Login)</label>
                  <div className="relative">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: professor"
                      value={formData.usuario || ''}
                      onChange={e => setFormData({...formData, usuario: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="******"
                      value={formData.senha || ''}
                      onChange={e => setFormData({...formData, senha: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Lock size={16} /> Permissões de Acesso
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {MENU_OPTIONS.map(menu => (
                    <label key={menu.id} className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded"
                        checked={formData.permissoes?.includes(menu.id) || false}
                        onChange={() => togglePermission(menu.id)}
                      />
                      <span className="text-sm text-slate-700">{menu.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center gap-2"
                >
                  <Save size={18} /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE ALERTA PERSONALIZADO (REQUERIDO) --- */}
      {customAlert.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center border border-white">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${customAlert.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {customAlert.type === 'danger' ? <AlertTriangle size={40} /> : <CheckCircle size={40} />}
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic mb-2">{customAlert.title}</h3>
            <p className="text-slate-500 mb-8 leading-relaxed font-medium">{customAlert.message}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { customAlert.onConfirm(); setCustomAlert({ ...customAlert, show: false }); }}
                className={`w-full py-4 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all ${customAlert.type === 'danger' ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700' : 'bg-green-600 text-white shadow-green-200 hover:bg-green-700'}`}
              >
                Confirmar
              </button>
              <button 
                onClick={() => setCustomAlert({ ...customAlert, show: false })}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-bold uppercase text-xs tracking-widest hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}