import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User } from 'lucide-react';

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
      // Se der certo, o App.tsx vai redirecionar automaticamente porque o estado 'user' mudou
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao entrar no sistema.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-3xl font-black text-white tracking-widest">BJJ COLLEGE</h1>
          <p className="text-blue-100 mt-2 text-sm uppercase tracking-wide">Sistema de Gestão Integrado</p>
        </div>

        {/* Formulário */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Acesso Restrito</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Utilizador</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="ex: admin"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'A verificar...' : 'ENTRAR'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} BJJ College. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}