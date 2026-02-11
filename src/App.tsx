import { useState, useEffect } from 'react';
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
import Presencas from './components/Presencas';

// --- NOVAS IMPORTAÇÕES DE SEGURANÇA ---
import SecurityGuard, { SECURITY_KEY } from './components/SecurityGuard';
import AccessDenied from './components/AccessDenied';
import LiberarAcesso from './components/LiberarAcesso';
// --------------------------------------

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // --- NOVOS ESTADOS DE SEGURANÇA ---
  const [isAuthorizedDevice, setIsAuthorizedDevice] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState(true);

  // Verifica se o dispositivo tem o token de segurança salvo
  useEffect(() => {
    const authorized = localStorage.getItem(SECURITY_KEY);
    if (authorized === 'true') {
      setIsAuthorizedDevice(true);
    }
    setCheckingDevice(false);
  }, []);

  // Rota Secreta: Verifica a URL para permitir libertar o acesso
  // Usamos window.location.pathname diretamente para evitar precisar do react-router-dom
  if (window.location.pathname === '/liberar-acesso') {
    return <LiberarAcesso />;
  }
  // ----------------------------------

  // Mostra carregando enquanto verifica a sessão E a segurança do dispositivo
  if (loading || checkingDevice) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">A carregar sistema...</div>
      </div>
    );
  }

  // --- BLOQUEIO DE SEGURANÇA ---
  // Se não for autorizado, mostra a tela de bloqueio antes de qualquer outra coisa
  if (!isAuthorizedDevice) {
    return <AccessDenied />;
  }
  // -----------------------------

  if (!user) {
    return <Login />;
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'totem' && <Totem />}
      {currentPage === 'presencas' && <Presencas />}
      {currentPage === 'alunos' && <Alunos />}
      {currentPage === 'financeiro' && <Financeiro />}
      {currentPage === 'cantina' && <Cantina />}
      {currentPage === 'configuracoes' && <Configuracoes />}
    </Layout>
  );
}

function App() {
  return (
    // SecurityGuard envolve tudo para bloquear botão direito e F12 em qualquer tela
    <SecurityGuard>
      <AuthProvider>
        {/* ToastProvider envolve o AppContent para que o contexto de alertas funcione em todas as telas */}
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </SecurityGuard>
  );
}

export default App;