import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Alunos from './components/Alunos';
import Financeiro from './components/Financeiro';
import Cantina from './components/Cantina';
import Configuracoes from './components/Configuracoes';
import Totem from './components/Totem';
import Presencas from './components/Presencas'; // Importação do componente de Histórico

function AppContent() {
  // Alterado para usar user e loading para verificar autenticação de forma segura
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Mostra carregando enquanto verifica a sessão para não "piscar" a tela de login
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">A carregar sistema...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'totem' && <Totem />}
      {currentPage === 'presencas' && <Presencas />} {/* Rota para o Histórico de Presenças */}
      {currentPage === 'alunos' && <Alunos />}
      {currentPage === 'financeiro' && <Financeiro />}
      {currentPage === 'cantina' && <Cantina />}
      {currentPage === 'configuracoes' && <Configuracoes />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      {/* CORREÇÃO: ToastProvider agora envolve o AppContent para que o contexto de alertas funcione em todas as telas */}
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;