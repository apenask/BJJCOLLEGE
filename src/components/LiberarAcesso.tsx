import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { SECURITY_KEY } from './SecurityGuard';

export default function LiberarAcesso() {
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  const SENHA_MESTRA = 'oss123'; // <--- A SUA SENHA É ESTA

  const liberarDispositivo = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Limpa erros anteriores

    if (senha === SENHA_MESTRA) {
      try {
        // Grava a autorização no navegador
        localStorage.setItem(SECURITY_KEY, 'true');
        // Força o redirecionamento para a página inicial
        window.location.href = '/'; 
      } catch (err) {
        setError('Erro ao salvar autorização. Tente novamente.');
      }
    } else {
      setError('Senha Incorreta. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={liberarDispositivo} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex justify-center mb-6 text-blue-600">
          <ShieldCheck size={64} />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Autorizar Dispositivo</h2>
        
        {/* Mensagem de Erro Visual */}
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
                />
            </div>
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md"
        >
            LIBERAR ACESSO
        </button>
      </form>
    </div>
  );
}