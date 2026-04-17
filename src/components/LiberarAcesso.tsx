import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { STORAGE_KEYS } from '../lib/config';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

export default function LiberarAcesso() {
  const { addToast } = useToast();
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const liberarDispositivo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validação básica
    if (!senha || senha.trim().length === 0) {
      setError('Digite a senha para liberar o acesso.');
      setLoading(false);
      return;
    }

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
        throw new Error('Senha incorreta.');
      }

      // Senha válida - libera dispositivo
      localStorage.setItem(STORAGE_KEYS.AUTHORIZED_DEVICE, 'true');
      addToast('Dispositivo liberado com sucesso!', 'success');
      
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      
    } catch (err: any) {
      console.error('Erro na liberação:', err);
      setError(err.message || 'Erro ao validar senha. Tente novamente.');
      setSenha('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={liberarDispositivo} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex justify-center mb-6 text-blue-600">
          <ShieldCheck size={64} />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Autorizar Dispositivo</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 flex items-center gap-2 text-red-600 text-sm rounded-lg animate-pulse border border-red-200">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Senha de Liberação</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-slate-400" size={20} />
                </div>
                <input 
                    type="password" 
                    placeholder="Digite a senha mestra..."
                    className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-900 bg-white shadow-sm"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    autoFocus
                    disabled={loading}
                />
            </div>
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? 'VALIDANDO...' : 'LIBERAR ACESSO'}
        </button>
      </form>
    </div>
  );
}
