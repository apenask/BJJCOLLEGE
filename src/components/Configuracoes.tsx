import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database, Wifi, Shield, RefreshCw } from 'lucide-react';

export default function Configuracoes() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [ping, setPing] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    setLoading(true);
    const start = performance.now();
    
    // Faz uma query leve apenas para testar a conexão
    const { error } = await supabase.from('alunos').select('count', { count: 'exact', head: true });
    
    const end = performance.now();
    
    if (!error) {
      setIsConnected(true);
      setPing(Math.round(end - start));
    } else {
      setIsConnected(false);
      setPing(null);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>

      {/* Cartão de Status da Conexão */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database size={20} className="text-blue-600" />
            Conexão com o Banco de Dados
          </h3>
          <button 
            onClick={checkConnection}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Testar Conexão Novamente"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
              <Wifi size={24} className={isConnected ? 'text-green-600' : 'text-red-600'} />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                {isConnected === null ? 'A verificar...' : isConnected ? 'Sistema Online' : 'Sistema Offline'}
              </p>
              <p className="text-sm text-slate-500">
                {isConnected 
                  ? 'Sincronização em tempo real ativa.' 
                  : 'Verifique a sua conexão à internet.'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
             <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold shadow-sm ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
               {isConnected ? 'ONLINE' : 'OFFLINE'}
             </div>
             {ping && <p className="text-xs text-slate-400 mt-1 font-mono">Ping: {ping}ms</p>}
          </div>
        </div>
      </div>
      
      {/* Placeholder para futuras configurações */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 opacity-60">
         <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Shield size={20} className="text-slate-400" />
          Segurança e Acesso
        </h3>
        <p className="text-slate-500 text-sm">
          A alteração de senha de administrador e gestão de permissões estarão disponíveis em breve.
        </p>
      </div>
    </div>
  );
}