import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(usuario, senha);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao entrar no sistema.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorativo (Efeito de Luz de Fundo) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-800 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-zinc-800 rounded-full blur-[120px] opacity-20"></div>
      </div>

      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl relative z-10 overflow-hidden">
        
        {/* Cabeçalho com Logo */}
        <div className="pt-10 pb-6 text-center px-8">
          <div className="mx-auto w-28 h-28 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-white/10 border-4 border-zinc-900 overflow-hidden">
             <img 
                src="https://i.imgur.com/51l5joO.jpeg"
                alt="Logo Academia" 
                className="w-full h-full object-cover" 
             />
          </div>

          <h1 className="text-3xl font-bold text-white tracking-wider uppercase font-mono">
            BJJ COLLEGE
          </h1>
          <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">
            Islan Leite Team
          </p>
        </div>

        {/* Formulário */}
        <div className="p-8 pt-2">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 text-red-400 text-sm rounded-lg text-center font-medium animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase ml-1">Usuário</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white transition-all"
                  placeholder="Seu usuário"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white transition-all"
                  placeholder="••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                'ACESSANDO...'
              ) : (
                <>
                  ENTRAR NO SISTEMA <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
            <div className="flex justify-center items-center gap-2 text-zinc-600 text-xs">
              <ShieldCheck size={14} />
              <span>Ambiente Seguro & Criptografado</span>
            </div>
            <p className="text-[10px] text-zinc-700 mt-2">
              &copy; {new Date().getFullYear()} BJJ College System v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
