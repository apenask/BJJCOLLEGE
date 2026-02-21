import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronRight, Shield, Zap, Users, CheckCircle, CalendarDays, MessageCircle, ArrowDown } from 'lucide-react';
import { addDays, startOfToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    turma_interesse: 'Adulto',
    data_agendamento: ''
  });

  // --- LÓGICA DO CALENDÁRIO INTELIGENTE ---
  const hoje = startOfToday();
  const proximosDias = Array.from({ length: 14 }).map((_, i) => addDays(hoje, i + 1)); // Mostra as próximas 2 semanas

  function isDiaDisponivel(data: Date, turma: string) {
      const diaSemana = data.getDay(); // 0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sab
      if (diaSemana === 0 || diaSemana === 6) return false; // FDS fechado

      if (turma === 'Adulto') return [1, 2, 3, 5].includes(diaSemana); // Seg, Ter, Qua, Sex (Qui não pode)
      if (turma === 'Infantil') return [1, 3, 5].includes(diaSemana); // Seg, Qua, Sex
      if (turma === 'Kids') return [2, 4].includes(diaSemana); // Ter, Qui
      return false;
  }

  function getHorarioDaTurma(turma: string) {
      if (turma === 'Kids') return '18:00';
      if (turma === 'Infantil') return '19:00';
      return '20:00';
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
    if (!formData.data_agendamento) {
        alert('Por favor, selecione um dia verde no calendário para agendar.');
        return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('leads').insert([{
        nome: formData.nome,
        whatsapp: formData.whatsapp,
        turma_interesse: formData.turma_interesse,
        data_agendamento: formData.data_agendamento,
        turno: getHorarioDaTurma(formData.turma_interesse), // Salva o horário cravado
        status: 'Agendado'
      }]);
      if (error) throw error;
      setSucesso(true);
    } catch (error) {
      alert('Erro ao agendar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-zinc-950 p-10 rounded-3xl text-center shadow-2xl border border-zinc-800 animate-slideUp">
          <div className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter">Vaga Garantida!</h2>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            Seu agendamento para o dia <b className="text-white">{formData.data_agendamento.split('-').reverse().join('/')} às {getHorarioDaTurma(formData.turma_interesse)}</b> foi confirmado.<br/><br/>Nossa equipe entrará em contato pelo WhatsApp para passar os detalhes finais. <b>Oss!</b>
          </p>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-white selection:text-black">
      
      <header className="fixed top-0 w-full bg-black/80 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">BJJ <span className="text-zinc-500">College</span></h1>
          <a href="#agendar" className="px-6 py-2.5 bg-white text-black text-sm font-black uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]">Agendar Aula</a>
        </div>
      </header>

      <section className="pt-40 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-slideUp">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest border border-white/10">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span>
              Turmas Abertas
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tighter">
              A FORJA DO SEU NOVO <span className="text-zinc-500">CARÁTER.</span>
            </h2>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-lg font-medium">
              O Jiu-Jitsu não é apenas defesa pessoal. É disciplina, perda de peso e controle emocional. Agende uma aula experimental gratuita e pise no tatame.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <a href="#agendar" className="px-8 py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                Quero minha aula grátis <ArrowDown size={20} />
              </a>
            </div>
          </div>

          {/* FORMULÁRIO DE CAPTURA COM CALENDÁRIO */}
          <div id="agendar" className="bg-zinc-950 border border-zinc-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative">
            <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Agende sua Aula</h3>
            <p className="text-sm text-zinc-400 mb-8 font-medium">Selecione uma data disponível (verde) para garantir sua vaga.</p>
            
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 block mb-2">Nome Completo</label>
                <input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} type="text" placeholder="Ex: Riquelme Silva" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-white outline-none transition-all font-medium" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1 mb-2"><MessageCircle size={14}/> WhatsApp</label>
                    <input required value={formData.whatsapp} onChange={handleWhatsAppChange} type="text" placeholder="(00) 00000-0000" minLength={14} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-white outline-none transition-all font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 block mb-2">Turma / Idade</label>
                    <select 
                      value={formData.turma_interesse} 
                      onChange={e => setFormData({...formData, turma_interesse: e.target.value, data_agendamento: ''})} 
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-white outline-none appearance-none font-bold"
                    >
                      <option value="Adulto">Adulto</option>
                      <option value="Infantil">Infantil (A partir 7 anos)</option>
                      <option value="Kids">Kids (Até 6 anos)</option>
                    </select>
                  </div>
              </div>

              {/* CALENDÁRIO VISUAL */}
              <div className="pt-2">
                  <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <CalendarDays size={14}/> Dias Disponíveis
                      </label>
                      <span className="text-[10px] font-black text-zinc-500 uppercase bg-zinc-900 px-2 py-1 rounded">Horário: {getHorarioDaTurma(formData.turma_interesse)}</span>
                  </div>
                  
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                      {proximosDias.map((dia, idx) => {
                          const disponivel = isDiaDisponivel(dia, formData.turma_interesse);
                          const dataFormatada = format(dia, 'yyyy-MM-dd');
                          const selecionado = formData.data_agendamento === dataFormatada;
                          
                          return (
                              <button
                                  key={idx}
                                  type="button"
                                  disabled={!disponivel}
                                  onClick={() => setFormData({...formData, data_agendamento: dataFormatada})}
                                  className={`p-3 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                                      !disponivel 
                                      ? 'bg-red-950/30 border-red-900/50 text-red-700 cursor-not-allowed opacity-60' // DIA INDISPONÍVEL (VERMELHO)
                                      : selecionado 
                                          ? 'bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-105' // DIA SELECIONADO (VERDE BRILHANTE)
                                          : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-500 hover:bg-zinc-800' // DIA DISPONÍVEL (PRETO/CINZA)
                                  }`}
                              >
                                  <span className={`text-[10px] uppercase tracking-widest mb-1 ${selecionado ? 'font-black' : 'font-bold'}`}>
                                      {format(dia, 'EEE', { locale: ptBR }).replace('.', '')}
                                  </span>
                                  <span className={`text-xl leading-none ${selecionado ? 'font-black' : 'font-bold'}`}>
                                      {format(dia, 'dd')}
                                  </span>
                              </button>
                          )
                      })}
                  </div>
              </div>

              <button disabled={loading} type="submit" className="w-full bg-white text-black mt-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-50 flex justify-center items-center gap-2">
                {loading ? 'Agendando...' : <><CheckCircle size={20}/> Confirmar Agendamento</>}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white text-black border-y border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 flex grid-cols-2 gap-4">
              <div className="bg-zinc-100 p-8 rounded-[2rem] aspect-square flex flex-col justify-center items-center text-center">
                  <Shield size={48} className="mb-4 text-zinc-800"/>
                  <h4 className="font-black text-xl uppercase tracking-tighter">Anti-Bullying</h4>
                  <p className="text-sm font-medium mt-2 text-zinc-600">Confiança para se defender e postura para evitar conflitos.</p>
              </div>
              <div className="bg-zinc-950 p-8 rounded-[2rem] aspect-square flex flex-col justify-center items-center text-center text-white mt-8">
                  <Users size={48} className="mb-4 text-zinc-300"/>
                  <h4 className="font-black text-xl uppercase tracking-tighter">Disciplina</h4>
                  <p className="text-sm font-medium mt-2 text-zinc-400">Respeito aos professores, aos colegas e a si mesmo.</p>
              </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <h3 className="text-5xl font-black uppercase tracking-tighter leading-none">Proteja e molde o <span className="text-zinc-400">futuro</span> do seu filho.</h3>
            <p className="text-lg text-zinc-600 font-medium leading-relaxed">
              As turmas <b>Kids e Infantil</b> da BJJ College não ensinam apenas a lutar. Nós usamos o tatame como ferramenta para construir crianças mais focadas, seguras de si e com excelente coordenação motora.
            </p>
            <ul className="space-y-4 text-zinc-800 font-bold mt-6">
              <li className="flex items-center gap-3"><CheckCircle className="text-black"/> Melhora drástica no foco escolar.</li>
              <li className="flex items-center gap-3"><CheckCircle className="text-black"/> Gasto de energia e redução do tempo de telas.</li>
              <li className="flex items-center gap-3"><CheckCircle className="text-black"/> Ambiente seguro e familiar.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-24 bg-black">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-16">Por que escolher a BJJ College?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-zinc-950 p-10 rounded-[2rem] border border-zinc-800 hover:border-white/20 transition-all">
              <Shield size={32} className="mb-6 text-white"/>
              <h4 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Defesa Pessoal Real</h4>
              <p className="text-zinc-400 font-medium leading-relaxed">Técnicas testadas e comprovadas de alavancagem que permitem que uma pessoa menor controle um oponente maior.</p>
            </div>
            <div className="bg-zinc-950 p-10 rounded-[2rem] border border-zinc-800 hover:border-white/20 transition-all">
              <Zap size={32} className="mb-6 text-white"/>
              <h4 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Condicionamento</h4>
              <p className="text-zinc-400 font-medium leading-relaxed">O tatame exige o corpo todo. Queime calorias, aumente sua resistência cardiovascular e ganhe força de forma dinâmica.</p>
            </div>
            <div className="bg-zinc-950 p-10 rounded-[2rem] border border-zinc-800 hover:border-white/20 transition-all">
              <Users size={32} className="mb-6 text-white"/>
              <h4 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Comunidade</h4>
              <p className="text-zinc-400 font-medium leading-relaxed">O Jiu-Jitsu não se treina sozinho. Faça parte de um grupo unido que vai te empurrar para ser sua melhor versão todos os dias.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}