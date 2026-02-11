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
import DevPanel from './components/DevPanel'; // Importação necessária

import SecurityGuard, { SECURITY_KEY } from './components/SecurityGuard';
import AccessDenied from './components/AccessDenied';
import LiberarAcesso from './components/LiberarAcesso';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthorizedDevice, setIsAuthorizedDevice] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState(true);

  useEffect(() => {
    const authorized = localStorage.getItem(SECURITY_KEY);
    if (authorized === 'true') {
      setIsAuthorizedDevice(true);
    }
    setCheckingDevice(false);
  }, []);

  if (window.location.pathname === '/liberar-acesso') {
    return <LiberarAcesso />;
  }

  if (loading || checkingDevice) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse uppercase tracking-widest text-xs">A carregar sistema...</div>
      </div>
    );
  }

  if (!isAuthorizedDevice) {
    return <AccessDenied />;
  }

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
      {/* ESTA LINHA ESTAVA FALTANDO: */}
      {currentPage === 'dev' && <DevPanel />}
    </Layout>
  );
}

function App() {
  return (
    <SecurityGuard>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </SecurityGuard>
  );
}

export default App;