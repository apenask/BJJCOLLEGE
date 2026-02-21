import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Shield, AlertTriangle, Lock } from 'lucide-react';

export default function MatriculaPublica() {
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  
  const [verificandoLink, setVerificandoLink] = useState(true);
  const [linkUsado, setLinkUsado] = useState(false);

  const [formData, setFormData] = useState({
    nome: '', whatsapp: '', categoria: 'Adulto', graduacao: 'Branca',
    data_nascimento: '', tipo_sanguineo: '', alergias: '', 
    detalhes_condicao: '', neurodivergente: false, neurodivergencia_tipo: ''
  });

  useEffect(() => {
    async function validarLead() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('lead');
        
        if (id) {
            setLeadId(id);
            const { data, error } = await supabase.from('leads').select('status, nome, whatsapp, turma_interesse').eq('id', id).single();
            
            if (data) {
                if (data.status === 'Convertido') {
                    setLinkUsado(true);
                } else {
                    setFormData(prev => ({
                        ...prev,
                        nome: data.nome || '',
                        whatsapp: formatarZapInicial(data.whatsapp || ''),
                        categoria: data.turma_interesse || 'Adulto'
                    }));
                }
            }
        }
        setVerificandoLink(false);
    }
    
    validarLead();
  }, []);

  function formatarZapInicial(valor: string) {
      let v = valor.replace(/\D/g, '');
      if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      if (v.length > 7) v = `(${v.slice(0, 3)}) ${v.slice(3, 8)}-${v.slice(8, 12)}`;
      return v;
  }

  function handleWhatsAppChange(e: React.ChangeEvent<HTMLInputElement>) {
      let value = e.target.value.replace(/\D/g, ''); 
      if (value.length > 11) value = value.slice(0, 11); 
      let formatted = value;
      if (value.length > 2) formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
      if (value.length > 7) formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
      setFormData({ ...formData, whatsapp: formatted });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: erroAluno } = await supabase.from('alunos').insert([{
        nome: formData.nome, whatsapp: formData.whatsapp, categoria: formData.categoria,
        graduacao: formData.graduacao, data_nascimento: formData.data_nascimento,
        tipo_sanguineo: formData.tipo_sanguineo, alergias: formData.alergias,
        detalhes_condicao: formData.detalhes_condicao, neurodivergente: formData.neurodivergente,
        neurodivergencia_tipo: formData.neurodivergencia_tipo,
        plano_tipo: 'Todos os dias', plano_dias: [], status: 'Ativo', data_matricula: new Date().toISOString().split('T')[0]
      }]);
      if (erroAluno) throw erroAluno;

      // ATUALIZAÇÃO: Marca como convertido E salva a data de hoje!
      if (leadId) {
        await supabase.from('leads').update({ 
            status: 'Convertido',
            data_conversao: new Date().toISOString().split('T')[0]
        }).eq('id', leadId);
      }

      setSucesso(true);
    } catch (error) {
      alert('Erro ao processar matrícula. Fale com a academia.');
    } finally {
      setLoading(false);
    }
  }

  if (verificandoLink) {
      return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><p className="text-slate-500 font-bold animate-pulse">Carregando ficha de matrícula...</p></div>;
  }

  if (linkUsado) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-10 rounded-3xl text-center border border-slate-200 shadow-2xl">
            <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={48} /></div>
            <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Link Expirado</h2>
            <p className="text-slate-500 font-medium">Este link já foi utilizado e sua matrícula já consta em nosso sistema. Qualquer dúvida, chame a recepção no WhatsApp.</p>
          </div>
        </div>
      );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-950 p-10 rounded-3xl text-center border border-zinc-800">
          <div className="w-24 h-24 bg-green-500 text-black rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={48} /></div>
          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Matrícula Concluída!</h2>
          <p className="text-zinc-400">Seja oficialmente bem-vindo à família BJJ College. Nos vemos no tatame!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-xl mx-auto bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
        <div className="text-center mb-10 border-b border-slate-100 pb-6">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ficha de Matrícula</h1>
          <p className="text-slate-500 font-medium mt-1">Preencha seus dados de saúde e segurança para liberar seu acesso ao tatame.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="font-black text-slate-800 uppercase flex items-center gap-2"><Shield size={18}/> Dados Pessoais</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Nome Completo</label>
                        <input required value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Aniversário</label>
                        <input required type="date" value={formData.data_nascimento} onChange={e=>setFormData({...formData, data_nascimento: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">WhatsApp</label>
                        <input required value={formData.whatsapp} onChange={handleWhatsAppChange} placeholder="(87) 90000-0000" minLength={14} maxLength={15} className="w-full bg-white border border-slate-200 rounded-xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>

                <div className="pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1 mb-1"><Lock size={12}/> Turma Selecionada</label>
                    <input disabled value={formData.categoria} className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 font-black text-slate-500 cursor-not-allowed uppercase" />
                </div>
            </div>

            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4">
                <h3 className="font-black text-red-600 uppercase flex items-center gap-2"><AlertTriangle size={18}/> Saúde (Ficha Médica)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Tipo Sanguíneo</label>
                        <select value={formData.tipo_sanguineo} onChange={e=>setFormData({...formData, tipo_sanguineo: e.target.value})} className="w-full bg-white border border-red-200 rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-400">
                            <option value="">Não sei</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Tem alergia ou toma algum remédio?</label>
                    <textarea value={formData.alergias} onChange={e=>setFormData({...formData, alergias: e.target.value})} placeholder="Se não tiver, deixe em branco." className="w-full bg-white border border-red-200 rounded-xl p-4 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Possui alguma condição? (TDAH, Autismo, etc)</label>
                    <div className="flex items-center gap-3 bg-white p-4 border border-red-200 rounded-xl cursor-pointer" onClick={() => setFormData({...formData, neurodivergente: !formData.neurodivergente})}>
                        <input type="checkbox" checked={formData.neurodivergente} readOnly className="w-5 h-5 accent-red-500" />
                        <span className="font-bold text-sm text-slate-700">Sim, possuo.</span>
                    </div>
                    {formData.neurodivergente && (
                        <input value={formData.neurodivergencia_tipo} onChange={e => setFormData({...formData, neurodivergencia_tipo: e.target.value})} placeholder="Qual o tipo?" className="w-full bg-white border border-red-200 rounded-xl p-4 font-bold text-purple-700 mt-2 outline-none focus:ring-2 focus:ring-red-400 animate-slideUp" />
                    )}
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Observações para os Professores</label>
                    <textarea value={formData.detalhes_condicao} onChange={e=>setFormData({...formData, detalhes_condicao: e.target.value})} placeholder="Algo importante que devemos saber para cuidar de você ou do seu filho no tatame?" className="w-full bg-white border border-red-200 rounded-xl p-4 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-400" />
                </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Salvando...' : <><CheckCircle size={20}/> Finalizar Matrícula Oficial</>}
            </button>
        </form>
      </div>
    </div>
  );
}