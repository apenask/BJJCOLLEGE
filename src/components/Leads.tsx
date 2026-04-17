import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CalendarDays, MessageCircle, CheckCircle, XCircle, Users, Link as LinkIcon, UserPlus, RotateCcw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '../contexts/ToastContext';

interface Lead {
  id: string;
  nome: string;
  whatsapp: string;
  turma_interesse: string;
  data_agendamento: string;
  turno: string;
  status: string;
  data_conversao?: string;
}

export default function Leads() {
  const { addToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('Agendado');

  const [customAlert, setCustomAlert] = useState({ show: false, id: '', nome: '' });

  useEffect(() => { fetchLeads(); }, []);

  async function fetchLeads() {
    setLoading(true);
    try {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      setLeads(data || []);
    } catch (error) {
      addToast('Erro ao buscar leads', 'error');
    } finally { setLoading(false); }
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    try {
      await supabase.from('leads').update({ status: novoStatus }).eq('id', id);
      addToast(`Status alterado para ${novoStatus}`, 'success');
      fetchLeads();
    } catch (error) { addToast('Erro ao atualizar.', 'error'); }
  }

  async function deletarLead() {
    try {
      await supabase.from('leads').delete().eq('id', customAlert.id);
      addToast('Agendamento apagado com sucesso!', 'success');
      setCustomAlert({ show: false, id: '', nome: '' });
      fetchLeads();
    } catch (error) {
      addToast('Erro ao apagar.', 'error');
    }
  }

  function abrirWhatsAppMarcar(lead: Lead) {
    const zap = lead.whatsapp.replace(/\D/g, '');
    let msg = `Fala ${lead.nome}, aqui é da BJJ College! Recebemos seu pedido de aula experimental para a turma ${lead.turma_interesse}. `;
    if (lead.data_agendamento) {
        msg += `Podemos confirmar sua presença no dia ${format(parseISO(lead.data_agendamento), 'dd/MM')} às ${lead.turno}? Oss!`;
    } else {
        msg += `Vamos confirmar um horário pra você vir conhecer o tatame? Oss!`;
    }
    window.open(`https://wa.me/55${zap}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function abrirWhatsAppFaltou(lead: Lead) {
    const zap = lead.whatsapp.replace(/\D/g, '');
    const msg = `Fala ${lead.nome}, aqui é da BJJ College! Sentimos sua falta no tatame na sua aula experimental. Aconteceu algum imprevisto? Vamos reagendar para você conhecer a galera? Oss!`;
    window.open(`https://wa.me/55${zap}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function enviarLinkMatricula(lead: Lead) {
    const zap = lead.whatsapp.replace(/\D/g, '');
    const linkCadastro = `${window.location.origin}/matricula-oficial?lead=${lead.id}&nome=${encodeURIComponent(lead.nome)}&turma=${lead.turma_interesse}&zap=${zap}`;
    const msg = `Fala ${lead.nome}, mandou muito bem no treino! 🥋 Pra gente oficializar sua matrícula na BJJ College e liberar seu acesso, preencha sua ficha rápida nesse link aqui: \n\n${linkCadastro}`;
    window.open(`https://wa.me/55${zap}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  const leadsFiltrados = leads.filter(l => filtroStatus === 'Todos' ? true : l.status === filtroStatus);

  return (
    <div className="space-y-6 animate-fadeIn pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Funil de Vendas (Leads)</h2>
              <p className="text-slate-500 text-sm font-medium">Controle os curiosos até eles virarem alunos.</p>
          </div>
      </div>
      
      <div className="flex bg-slate-200 p-1 rounded-2xl gap-1 overflow-x-auto w-full">
          {['Agendado', 'Compareceu', 'Faltou', 'Convertido', 'Todos'].map(c => (
              <button key={c} onClick={() => setFiltroStatus(c)} className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${filtroStatus === c ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {c}
              </button>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
              <div className="col-span-full p-10 text-center text-slate-400 font-bold animate-pulse">Carregando leads...</div>
          ) : leadsFiltrados.length === 0 ? (
              <div className="col-span-full bg-white p-10 rounded-3xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center text-slate-400">
                  <Users size={48} className="mb-4 opacity-20"/>
                  <p className="font-bold text-lg">Nenhum lead nesta etapa</p>
              </div>
          ) : (
              leadsFiltrados.map(lead => (
                  <div key={lead.id} className={`bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-between group ${lead.status === 'Convertido' ? 'border-green-200 bg-green-50/30' : lead.status === 'Faltou' ? 'border-red-200 bg-red-50/20' : 'border-slate-100'}`}>
                      <div>
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex gap-2 items-center">
                                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${lead.status === 'Agendado' ? 'bg-blue-50 text-blue-600' : lead.status === 'Compareceu' ? 'bg-orange-50 text-orange-600' : lead.status === 'Faltou' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                      {lead.status}
                                  </span>
                                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{lead.turma_interesse}</span>
                              </div>
                              
                              {/* LIXEIRINHA NO CANTO */}
                              <button onClick={() => setCustomAlert({ show: true, id: lead.id, nome: lead.nome })} className="text-slate-300 hover:text-red-500 p-1 transition-colors">
                                  <Trash2 size={18} />
                              </button>
                          </div>
                          
                          <h3 className="text-xl font-black text-slate-800 mb-1 leading-tight">{lead.nome}</h3>
                          <div className="text-xs font-bold text-slate-500 flex flex-col gap-1 mb-4">
                              <span className="flex items-center gap-1 text-slate-600"><MessageCircle size={14}/> {lead.whatsapp}</span>
                              {lead.data_agendamento && (
                                  <span className="flex items-center gap-1 text-blue-600"><CalendarDays size={14}/> {format(parseISO(lead.data_agendamento), 'dd/MM/yyyy')} às {lead.turno}</span>
                              )}
                          </div>
                      </div>

                      <div className="space-y-3 mt-2 pt-4 border-t border-slate-100">
                          {lead.status === 'Agendado' && (
                              <>
                                  <button onClick={() => abrirWhatsAppMarcar(lead)} className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-black transition-colors shadow-lg">
                                      <MessageCircle size={16}/> Chamar e Confirmar
                                  </button>
                                  <div className="flex gap-2">
                                      <button onClick={() => atualizarStatus(lead.id, 'Compareceu')} className="flex-1 bg-green-50 text-green-700 py-2 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors flex justify-center items-center gap-1"><CheckCircle size={14}/> Veio</button>
                                      <button onClick={() => atualizarStatus(lead.id, 'Faltou')} className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex justify-center items-center gap-1"><XCircle size={14}/> Faltou</button>
                                  </div>
                              </>
                          )}

                          {lead.status === 'Faltou' && (
                              <>
                                  <button onClick={() => abrirWhatsAppFaltou(lead)} className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-black transition-colors shadow-lg">
                                      <MessageCircle size={16}/> Chamar e Remarcar
                                  </button>
                                  <button onClick={() => atualizarStatus(lead.id, 'Agendado')} className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex justify-center items-center gap-2">
                                      <RotateCcw size={14}/> Tirar Falta (Voltar)
                                  </button>
                              </>
                          )}

                          {lead.status === 'Compareceu' && (
                              <div className="space-y-2">
                                  <p className="text-[10px] text-center font-bold text-orange-500 uppercase tracking-widest mb-2">Lead Quente! Mandar Matrícula:</p>
                                  <button onClick={() => enviarLinkMatricula(lead)} className="w-full bg-green-500 text-white py-3 rounded-xl text-sm font-black uppercase flex justify-center items-center gap-2 hover:bg-green-600 transition-colors shadow-lg shadow-green-200">
                                      <LinkIcon size={18}/> Enviar Link de Matrícula
                                  </button>
                              </div>
                          )}

                          {/* NOVA OBSERVAÇÃO PARA CONVERTIDOS */}
                          {lead.status === 'Convertido' && (
                              <div className="w-full bg-green-100 text-green-700 py-3 rounded-xl text-xs font-bold uppercase flex flex-col justify-center items-center gap-1 shadow-sm border border-green-200">
                                  <div className="flex items-center gap-2 font-black"><UserPlus size={16}/> Aluno Oficial</div>
                                  {lead.data_conversao && <span className="opacity-80">Matriculado em: {format(parseISO(lead.data_conversao), 'dd/MM/yyyy')}</span>}
                              </div>
                          )}
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {customAlert.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={40} /></div>
            <h3 className="text-2xl font-black text-slate-800 uppercase italic mb-2">Apagar Lead?</h3>
            <p className="text-slate-500 mb-8 leading-relaxed">Deseja remover <b>{customAlert.nome}</b> do seu painel?</p>
            <div className="flex flex-col gap-3">
              <button onClick={deletarLead} className="w-full py-4 bg-red-600 text-white rounded-[1.5rem] font-black uppercase shadow-xl">CONFIRMAR</button>
              <button onClick={() => setCustomAlert({ show: false, id: '', nome: '' })} className="w-full py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-bold uppercase text-xs">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}