import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlunoIdentificado {
  id: string;
  nome: string;
  status: string;
  foto_url: string;
  graduacao: string;
}

export default function Totem() {
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [aluno, setAluno] = useState<AlunoIdentificado | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null);
  const [cameraAtiva, setCameraAtiva] = useState(true);

  // Função para tocar um "Bip" de sucesso
  const playBeep = () => {
    const audio = new Audio('https://actions.google.com/sounds/v1/science_fiction/scifi_laser.ogg'); // Som curto
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play failed', e));
  };

  async function handleScan(result: string) {
    // Evita leituras duplicadas muito rápidas (delay de 3 seg)
    if (result === lastScan || loading) return;
    
    setLastScan(result);
    setLoading(true);
    setMensagem(null);
    setAluno(null);

    try {
      // 1. Buscar o aluno pelo ID (QR Code)
      const { data: alunoData, error } = await supabase
        .from('alunos')
        .select('id, nome, status, foto_url, graduacao')
        .eq('id', result)
        .single();

      if (error || !alunoData) {
        throw new Error('Aluno não encontrado.');
      }

      setAluno(alunoData);

      // 2. Validar Status Financeiro
      if (alunoData.status === 'Inadimplente' || alunoData.status === 'Inativo') {
        setMensagem({ tipo: 'erro', texto: `Acesso Bloqueado: ${alunoData.status}` });
        setLoading(false);
        // Reseta scanner após 4 segundos
        setTimeout(() => setLastScan(null), 4000);
        return;
      }

      // 3. Registrar Presença
      const { error: presencaError } = await supabase.from('presencas').insert([{
        aluno_id: alunoData.id,
        data_aula: new Date().toISOString()
      }]);

      if (presencaError) throw presencaError;

      // Sucesso!
      playBeep();
      setMensagem({ tipo: 'sucesso', texto: 'Presença Confirmada!' });

    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'QR Code Inválido ou Erro no Sistema.' });
    } finally {
      setLoading(false);
      // Limpa a tela para o próximo aluno após 4 segundos
      setTimeout(() => {
        setLastScan(null);
        setAluno(null);
        setMensagem(null);
      }, 4000);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 animate-fadeIn">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold text-slate-800">Totem de Presença</h2>
        <p className="text-slate-500">Aponte o QR Code do aluno para a câmera</p>
      </div>

      <div className="relative w-full max-w-md aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
        {/* Camada de Resultado (Overlay) */}
        {aluno ? (
          <div className="absolute inset-0 z-20 bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-scaleIn">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden mb-4 bg-slate-200">
              {aluno.foto_url ? (
                <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-3xl font-bold">
                  {aluno.nome.charAt(0)}
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">{aluno.nome}</h3>
            <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-semibold text-slate-600 mb-4">
              {aluno.graduacao}
            </span>
            
            {mensagem?.tipo === 'sucesso' && (
              <div className="flex items-center gap-2 text-green-600 font-bold text-xl bg-green-50 px-4 py-2 rounded-xl">
                <CheckCircle size={28} />
                {mensagem.texto}
              </div>
            )}
            
            {mensagem?.tipo === 'erro' && (
              <div className="flex items-center gap-2 text-red-600 font-bold text-xl bg-red-50 px-4 py-2 rounded-xl">
                <XCircle size={28} />
                {mensagem.texto}
              </div>
            )}
          </div>
        ) : (
          /* Câmera Ativa */
          cameraAtiva && (
            <Scanner 
              onScan={(result) => result[0] && handleScan(result[0].rawValue)}
              allowMultiple={true}
              scanDelay={2000}
              components={{
                audio: false, // Desativamos o nativo para usar o nosso beep
                finder: true,
              }}
              styles={{
                container: { width: '100%', height: '100%' }
              }}
            />
          )
        )}

        {/* Loading Overlay */}
        {loading && !aluno && (
          <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Rodapé com Hora e Status */}
      <div className="mt-8 text-center">
        <p className="text-4xl font-mono font-bold text-slate-300">
          {format(new Date(), 'HH:mm', { locale: ptBR })}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-blue-500 hover:underline flex items-center justify-center gap-1"
        >
          <RefreshCw size={14} /> Reiniciar Câmera
        </button>
      </div>
    </div>
  );
}