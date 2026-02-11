import React, { useState } from 'react';
import { ShieldAlert, Lock, Unlock, ArrowRight, AlertCircle } from 'lucide-react';
import { SECURITY_KEY } from './SecurityGuard';

export default function AccessDenied() {
  const [clickCount, setClickCount] = useState(0);
  const [showUnlock, setShowUnlock] = useState(false);
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  const SENHA_MESTRA = 'oss123';

  const handleSecretClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    // Ao 5º clique, mostra o formulário (sem avisar antes)
    if (newCount >= 5) {
      setShowUnlock(true);
      setClickCount(0);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (senha === SENHA_MESTRA) {
      localStorage.setItem(SECURITY_KEY, 'true');
      window.location.reload();
    } else {
      setError('Senha incorreta!');
      setSenha('');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center select-none relative overflow-hidden">
      
      {/* CONTEÚDO PRINCIPAL (BLOQUEIO) */}
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

        {/* CADEADO SECRETO (BOTÃO) - Sem contador visível agora */}
        <div 
          onClick={handleSecretClick}
          className="mt-12 opacity-40 hover:opacity-100 transition-opacity cursor-pointer p-4 inline-block"
          title="Área Restrita"
        >
          <div className="flex flex-col items-center gap-2">
            {/* O cadeado ainda pulsa se clicar, para dar feedback tátil sutil, mas sem números */}
            <Lock size={24} className={clickCount > 0 ? "text-red-500 duration-75" : "text-gray-600"} />
            <p className="text-gray-600 text-xs font-mono">ID: {navigator.userAgent.replace(/\D/g, '').slice(0, 10)}</p>
          </div>
        </div>
      </div>

      {/* MODAL DE DESBLOQUEIO */}
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
                  className="w-full p-3 border-2 border-slate-300 rounded-lg text-lg focus:border-blue-600 focus:ring-0 outline-none transition-colors text-slate-900"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setShowUnlock(false); setClickCount(0); setError(''); }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  LIBERAR <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}