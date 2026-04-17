import React, { useState } from 'react';
import { ShieldAlert, Lock, Unlock, ArrowRight, AlertCircle } from 'lucide-react';
import { STORAGE_KEYS } from '../lib/config';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

export default function AccessDenied() {
  const { addToast } = useToast();
  const [clickCount, setClickCount] = useState(0);
  const [showUnlock, setShowUnlock] = useState(false);
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSecretClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount >= 5) {
      setShowUnlock(true);
      setClickCount(0);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validação via RPC no Supabase (segura, não expõe senha no frontend)
      const { data, error: rpcError } = await supabase.rpc('validar_senha_mestra', {
        senha_input: senha
      });

      if (rpcError) {
        // Se houver erro na RPC, mostrar mensagem clara para o administrador
        if (rpcError.message.includes('Function') || rpcError.message.includes('function')) {
          console.error('RPC validar_senha_mestra não encontrada no Supabase.');
          throw new Error('Função de validação não configurada. Contate o administrador do sistema.');
        }
        throw rpcError;
      }

      if (!data || !data[0]?.sucesso) {
        throw new Error('Senha incorreta!');
      }

      localStorage.setItem(STORAGE_KEYS.AUTHORIZED_DEVICE, 'true');
      addToast('Dispositivo liberado com sucesso!', 'success');
      window.location.reload();
      
    } catch (err: any) {
      console.error('Erro na liberação:', err);
      setError(err.message || 'Erro ao validar senha.');
      setSenha('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center select-none relative overflow-hidden">
      
      <div className={`transition-all duration-500 ${showUnlock ? 'blur-sm opacity-50' : 'opacity-100'}`}>
        <div className="animate-bounce mb-8 flex justify-center">
          <ShieldAlert size={80} className="text-red-600" />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-red-600 mb-4 tracking-widest uppercase">
          ACESSO NEGADO
        </h1>
        
        <p className="text-xl text-white font-mono mb-8 max-w-lg mx-auto">
          Este dispositivo não está autorizado a acessar o sistema BJJ COLLEGE.
        </p>

        <div className="bg-red-900/20 border border-red-800 p-6 rounded-xl max-w-md w-full backdrop-blur-sm mx-auto">
          <p className="text-red-400 font-mono text-sm mb-2">SYSTEM_SECURITY_PROTOCOL_V3</p>
          <p className="text-white font-bold text-lg mb-4">
            "Tentou hackear a academia errada, parceiro. Aqui a gente resolve no tatame." 🥋
          </p>
          <div className="h-1 w-full bg-red-900 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 w-2/3 animate-pulse"></div>
          </div>
          <p className="text-xs text-red-500 mt-2 font-mono">IP TRACKED & LOGGED</p>
        </div>

        <div 
          onClick={handleSecretClick}
          className="mt-12 opacity-40 hover:opacity-100 transition-opacity cursor-pointer p-4 inline-block"
          title="Área Restrita"
        >
          <div className="flex flex-col items-center gap-2">
            <Lock size={24} className={clickCount > 0 ? "text-red-500 duration-75" : "text-gray-600"} />
            <p className="text-gray-600 text-xs font-mono">ID: {navigator.userAgent.replace(/\D/g, '').slice(0, 10)}</p>
          </div>
        </div>
      </div>

      {showUnlock && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm border-4 border-blue-600 transform scale-100 transition-all">
            <div className="flex justify-center -mt-16 mb-4">
              <div className="bg-blue-600 p-4 rounded-full border-4 border-black">
                <Unlock size={32} className="text-white" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Liberação Administrativa</h2>
            <p className="text-slate-500 text-sm mb-6">Digite a senha mestra para autorizar este dispositivo.</p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg flex items-center gap-2 font-bold animate-pulse">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleUnlock}>
              <div className="mb-4 text-left">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha Mestra</label>
                <input 
                  type="password" 
                  autoFocus
                  placeholder="Senha..."
                  disabled={loading}
                  className="w-full p-3 border-2 border-slate-300 rounded-lg text-lg focus:border-blue-600 focus:ring-0 outline-none transition-colors text-slate-900 disabled:bg-slate-100"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setShowUnlock(false); setClickCount(0); setError(''); }}
                  disabled={loading}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'VALIDANDO...' : (<>LIBERAR <ArrowRight size={18} /></>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
