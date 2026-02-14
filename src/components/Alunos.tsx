import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, User, CheckCircle, XCircle, Award, Activity, HeartPulse, Brain } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '../contexts/ToastContext';

// Interface atualizada
interface Aluno {
  id: string;
  nome: string;
  foto_url: string;
  data_nascimento: string;
  peso: number;
  graduacao: string;
  categoria: 'Adulto' | 'Infantil' | 'Kids';
  status: string;
  whatsapp: string;
  
  // Saúde
  tipo_sanguineo: string;
  alergias: string;
  neurodivergente: boolean;
  detalhes_condicao: string; // Cuidados especiais
  
  // Planos e Bolsas
  plano_tipo: 'Todos os dias' | '3 Dias' | '2 Dias';
  plano_dias: string[]; // Ex: ['Seg', 'Qua', 'Sex']
  bolsista_jiujitsu: boolean;
  bolsista_musculacao: boolean;
  
  pago_mes_atual?: boolean; // Campo calculado
}

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export default function Alunos() {
  const { addToast } = useToast();
  
  // Estados
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabAtual, setTabAtual] = useState<'Adulto' | 'Infantil' | 'Kids'>('Adulto');
  
  const [viewState, setViewState] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Aluno>>({});
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchAlunos();
    
    const channel = supabase
      .channel('alunos_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => fetchAlunos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => fetchAlunos())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAlunos() {
    try {
      setLoading(true);
      
      const { data: dadosAlunos, error: erroAlunos } = await supabase
        .from('alunos')
        .select('*')
        .order('nome');
      
      if (erroAlunos) throw erroAlunos;

      // Verifica pagamentos
      const inicioMes = startOfMonth(new Date()).toISOString();
      const fimMes = endOfMonth(new Date()).toISOString();

      const { data: pagamentos } = await supabase
        .from('transacoes')
        .select('aluno_id')
        .eq('tipo', 'Receita')
        .gte('data', inicioMes)
        .lte('data', fimMes)
        .not('aluno_id', 'is', null);

      const pagantesSet = new Set(pagamentos?.map(p => p.aluno_id));

      const alunosProcessados = dadosAlunos?.map((aluno: any) => ({
        ...aluno,
        // Considera pago se tiver pagamento OU se for bolsista TOTAL (Jiu + Musculação) - Ajuste conforme sua regra
        pago_mes_atual: pagantesSet.has(aluno.id) || (aluno.bolsista_jiujitsu && aluno.bolsista_musculacao)
      }));

      setAlunos(alunosProcessados || []);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmarPagamento(e: React.MouseEvent, aluno: Aluno) {
    e.stopPropagation();
    // Define o valor com base no plano
    let valorPlano = 80.00;
    if (aluno.plano_tipo === '3 Dias') valorPlano = 70.00;
    if (aluno.plano_tipo === '2 Dias') valorPlano = 60.00;

    if (!window.confirm(`Confirmar pagamento de R$ ${valorPlano.toFixed(2)} para ${aluno.nome}?`)) return;

    try {
      const { error } = await supabase.from('transacoes').insert([{
        descricao: `Mensalidade (${aluno.plano_tipo}) - ${aluno.nome}`,
        valor: valorPlano,
        tipo: 'Receita',
        categoria: 'Mensalidade',
        data: new Date().toISOString(),
        aluno_id: aluno.id
      }]);

      if (error) throw error;
      addToast(`Pagamento de ${aluno.nome} confirmado!`, 'success');
      fetchAlunos();
    } catch (error: any) {
      addToast('Erro ao registrar pagamento.', 'error');
    }
  }

  // Controle dos Dias da Semana no Formulário
  const toggleDia = (dia: string) => {
    const diasAtuais = formData.plano_dias || [];
    if (diasAtuais.includes(dia)) {
      setFormData({ ...formData, plano_dias: diasAtuais.filter(d => d !== dia) });
    } else {
      setFormData({ ...formData, plano_dias: [...diasAtuais, dia] });
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nome || !formData.categoria) {
      addToast('Nome e Turma são obrigatórios.', 'warning');
      return;
    }

    // Validação do Plano
    if ((formData.plano_tipo === '3 Dias' || formData.plano_tipo === '2 Dias') && (!formData.plano_dias || formData.plano_dias.length === 0)) {
        addToast('Para planos parciais, selecione os dias da semana.', 'warning');
        return;
    }

    try {
      const alunoData = { ...formData };
      delete (alunoData as any).pago_mes_atual; // Remove campo calculado

      if (editMode && formData.id) {
        const { error } = await supabase.from('alunos').update(alunoData).eq('id', formData.id);
        if (error) throw error;
        addToast('Aluno atualizado!', 'success');
      } else {
        const { error } = await supabase.from('alunos').insert([alunoData]);
        if (error) throw error;
        addToast('Aluno cadastrado!', 'success');
      }
      
      setFormData({});
      setEditMode(false);
      setViewState('list');
      fetchAlunos();
    } catch (error: any) {
      addToast(`Erro: ${error.message}`, 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir aluno permanentemente?')) return;
    try {
      await supabase.from('alunos').delete().eq('id', id);
      addToast('Aluno removido.', 'success');
      fetchAlunos();
    } catch {
      addToast('Erro ao excluir.', 'error');
    }
  }

  const filteredAlunos = alunos.filter(aluno => 
    (aluno.categoria === tabAtual || (!aluno.categoria && tabAtual === 'Adulto')) &&
    aluno.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- TELA DE FORMULÁRIO ---
  if (viewState === 'form') {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-fadeIn">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">{editMode ? 'Editar Aluno' : 'Novo Aluno'}</h2>
        <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
            
            {/* SEÇÃO 1: DADOS BÁSICOS */}
            <div>
                <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2 flex items-center gap-2">
                    <User size={20} className="text-blue-600"/> Dados Pessoais e Contato
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <input type="text" required className="w-full p-2 border rounded-lg" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                        <input type="text" className="w-full p-2 border rounded-lg" value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Turma / Categoria</label>
                        <select required className="w-full p-2 border rounded-lg bg-blue-50 border-blue-200 text-blue-900 font-medium" value={formData.categoria || ''} onChange={e => setFormData({...formData, categoria: e.target.value as any})}>
                            <option value="">Selecione...</option>
                            <option value="Adulto">Adulto</option>
                            <option value="Infantil">Infantil</option>
                            <option value="Kids">Kids (Pequenos)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Graduação</label>
                        <select className="w-full p-2 border rounded-lg bg-white" value={formData.graduacao || ''} onChange={e => setFormData({...formData, graduacao: e.target.value})}>
                            <option value="">Selecione...</option>
                            <optgroup label="Kids"><option value="Branca">Branca</option><option value="Cinza">Cinza</option><option value="Amarela">Amarela</option><option value="Laranja">Laranja</option><option value="Verde">Verde</option></optgroup>
                            <optgroup label="Adulto"><option value="Branca">Branca</option><option value="Azul">Azul</option><option value="Roxa">Roxa</option><option value="Marrom">Marrom</option><option value="Preta">Preta</option></optgroup>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select className="w-full p-2 border rounded-lg" value={formData.status || 'Ativo'} onChange={e => setFormData({...formData, status: e.target.value})}>
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data Nascimento</label>
                        <input type="date" className="w-full p-2 border rounded-lg" value={formData.data_nascimento || ''} onChange={e => setFormData({...formData, data_nascimento: e.target.value})} />
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: PLANOS E BOLSAS */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Award size={20} className="text-yellow-600"/> Planos & Bolsas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Escolha do Plano */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Plano de Pagamento</label>
                        <select 
                            className="w-full p-3 border rounded-lg bg-white shadow-sm mb-4" 
                            value={formData.plano_tipo || 'Todos os dias'} 
                            onChange={e => setFormData({...formData, plano_tipo: e.target.value as any})}
                        >
                            <option value="Todos os dias">Todos os dias (R$ 80,00)</option>
                            <option value="3 Dias">3 Dias na semana (R$ 70,00)</option>
                            <option value="2 Dias">2 Dias na semana (R$ 60,00)</option>
                        </select>

                        {/* Seleção de Dias (Só aparece se não for todos os dias) */}
                        {formData.plano_tipo !== 'Todos os dias' && (
                            <div className="bg-white p-3 rounded-lg border">
                                <span className="block text-xs font-bold text-slate-500 uppercase mb-2">Selecione os dias:</span>
                                <div className="flex flex-wrap gap-2">
                                    {DIAS_SEMANA.map(dia => (
                                        <button
                                            key={dia}
                                            type="button"
                                            onClick={() => toggleDia(dia)}
                                            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                                formData.plano_dias?.includes(dia)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {dia}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Checkbox de Bolsas */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Bolsa</label>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 text-blue-600 rounded"
                                    checked={formData.bolsista_jiujitsu || false} 
                                    onChange={e => setFormData({...formData, bolsista_jiujitsu: e.target.checked})} 
                                />
                                <span className="font-medium text-slate-700">Bolsista Jiu-Jitsu</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 text-blue-600 rounded"
                                    checked={formData.bolsista_musculacao || false} 
                                    onChange={e => setFormData({...formData, bolsista_musculacao: e.target.checked})} 
                                />
                                <span className="font-medium text-slate-700">Bolsista Musculação</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 3: SAÚDE E CUIDADOS (Novos Campos) */}
            <div>
                <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2 flex items-center gap-2">
                    <HeartPulse size={20} className="text-red-500"/> Saúde & Cuidados Especiais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Sanguíneo</label>
                                <select className="w-full p-2 border rounded-lg" value={formData.tipo_sanguineo || ''} onChange={e => setFormData({...formData, tipo_sanguineo: e.target.value})}>
                                    <option value="">Não informado</option>
                                    <option value="A+">A+</option><option value="A-">A-</option>
                                    <option value="B+">B+</option><option value="B-">B-</option>
                                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                    <option value="O+">O+</option><option value="O-">O-</option>
                                </select>
                            </div>
                            
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Neurodivergente?</label>
                                <div className="flex items-center gap-2 mt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, neurodivergente: !formData.neurodivergente})}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.neurodivergente ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.neurodivergente ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                    <span className="text-sm text-slate-600">{formData.neurodivergente ? 'Sim' : 'Não'}</span>
                                    {formData.neurodivergente && <Brain size={18} className="text-indigo-600 ml-1" />}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cuidados Especiais / Alergias / Observações</label>
                        <textarea 
                            className="w-full p-2 border rounded-lg h-24" 
                            placeholder="Descreva aqui se o aluno precisa de alguma atenção especial, tem alergias ou detalhes sobre a neurodivergência..."
                            value={formData.detalhes_condicao || ''} 
                            onChange={e => setFormData({...formData, detalhes_condicao: e.target.value})} 
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" onClick={() => setViewState('list')} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Salvar Cadastro</button>
            </div>
        </form>
      </div>
    );
  }

  // --- TELA DE LISTA ---
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Gerenciar Alunos</h2>
        <button
          onClick={() => { setFormData({ plano_tipo: 'Todos os dias', plano_dias: [], bolsista_jiujitsu: false, bolsista_musculacao: false }); setEditMode(false); setViewState('form'); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} /> Novo Aluno
        </button>
      </div>

      {/* ABAS */}
      <div className="flex p-1 bg-slate-200 rounded-xl gap-1">
          {(['Adulto', 'Infantil', 'Kids'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setTabAtual(cat)}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                    tabAtual === cat 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/50'
                }`}
              >
                  {cat}s
              </button>
          ))}
      </div>

      {/* BUSCA */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder={`Buscar aluno ${tabAtual.toLowerCase()}...`}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABELA */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Aluno</th>
                <th className="p-4 font-semibold text-slate-600 hidden md:table-cell">Plano / Dias</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Status Pagto.</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlunos.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum aluno encontrado nesta turma.</td></tr>
              ) : (
                filteredAlunos.map((aluno) => (
                  <tr key={aluno.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden relative">
                          {aluno.foto_url ? <img src={aluno.foto_url} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-400" />}
                          {aluno.neurodivergente && (
                              <div className="absolute bottom-0 right-0 bg-indigo-500 w-3 h-3 rounded-full border border-white" title="Neurodivergente"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                              {aluno.nome}
                              {aluno.neurodivergente && <Brain size={14} className="text-indigo-500" />}
                          </div>
                          <div className="flex gap-1 mt-0.5">
                            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{aluno.graduacao}</span>
                            {aluno.bolsista_jiujitsu && <span className="text-xs bg-yellow-100 px-1.5 py-0.5 rounded text-yellow-700">Bolsa JJ</span>}
                            {aluno.bolsista_musculacao && <span className="text-xs bg-orange-100 px-1.5 py-0.5 rounded text-orange-700">Bolsa Gym</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4 hidden md:table-cell align-middle">
                        <div className="text-sm text-slate-700 font-medium">{aluno.plano_tipo || 'Não definido'}</div>
                        {aluno.plano_tipo !== 'Todos os dias' && aluno.plano_dias && (
                             <div className="text-xs text-slate-500 mt-1 flex gap-1 flex-wrap">
                                {aluno.plano_dias.map(d => (
                                    <span key={d} className="bg-slate-100 border px-1 rounded">{d.substring(0,3)}</span>
                                ))}
                             </div>
                        )}
                    </td>

                    <td className="p-4 text-center align-middle">
                        {aluno.pago_mes_atual ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                <CheckCircle size={14} /> Pago
                            </span>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                    <XCircle size={14} /> Pendente
                                </span>
                                <button 
                                    onClick={(e) => handleConfirmarPagamento(e, aluno)}
                                    className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm transition-transform hover:scale-105"
                                    title="Pagar Mensalidade Agora"
                                >
                                    <span className="font-bold text-xs">R$</span>
                                </button>
                            </div>
                        )}
                    </td>

                    <td className="p-4 text-right align-middle">
                      <div className="flex justify-end gap-2">
                        {/* BOTÃO DE QR CODE REMOVIDO DAQUI */}
                        <button onClick={() => { setFormData(aluno); setEditMode(true); setViewState('form'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Editar Cadastro"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(aluno.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Excluir Aluno"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}