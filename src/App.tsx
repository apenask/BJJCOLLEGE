import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Alunos from './components/Alunos';
import Financeiro from './components/Financeiro';
import Loja from './components/Loja';
import Pix from './components/Pix'; 
import Configuracoes from './components/Configuracoes';
import DevPanel from './components/DevPanel'; 
import Instrutores from './components/Instrutores';
import Relatorios from './components/Relatorios';
import SecurityGuard, { SECURITY_KEY } from './components/SecurityGuard';
import AccessDenied from './components/AccessDenied';
import LiberarAcesso from './components/LiberarAcesso';

const VALID_PAGES = [
  'dashboard',
  'relatorios',
  'alunos',
  'financeiro',
  'loja',
  'pix',
  'configuracoes',
  'dev',
  'instrutores'
] as const;

type ValidPage = (typeof VALID_PAGES)[number];

function isValidPage(page: string): page is ValidPage {
  return VALID_PAGES.includes(page as ValidPage);
}

function getInitialPage(): ValidPage {
  const storedPage = localStorage.getItem('bjj_last_page');

  if (storedPage && VALID_PAGES.includes(storedPage as ValidPage)) {
    return storedPage as ValidPage;
  }

  return 'dashboard';
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<ValidPage>(getInitialPage);
  const [isAuthorizedDevice, setIsAuthorizedDevice] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState(true);

  function handleNavigate(page: string) {
    if (isValidPage(page)) {
      setCurrentPage(page);
    }
  }

  useEffect(() => {
    const authorized = localStorage.getItem(SECURITY_KEY);
    if (authorized === 'true') setIsAuthorizedDevice(true);
    setCheckingDevice(false);
  }, []);

  useEffect(() => { localStorage.setItem('bjj_last_page', currentPage); }, [currentPage]);

  if (window.location.pathname === '/liberar-acesso') return <LiberarAcesso />;
  if (loading || checkingDevice) return <div className="flex items-center justify-center h-screen bg-slate-50"><div className="text-slate-500 font-medium animate-pulse uppercase tracking-widest text-xs">Carregando...</div></div>;
  if (!isAuthorizedDevice) return <AccessDenied />;
  if (!user) return <Login />;

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      {currentPage === 'relatorios' && <Relatorios />}
      {currentPage === 'alunos' && <Alunos />}
      {currentPage === 'financeiro' && <Financeiro />}
      {currentPage === 'loja' && <Loja />}
      {currentPage === 'pix' && <Pix />}
      {currentPage === 'configuracoes' && <Configuracoes />}
      {currentPage === 'dev' && <DevPanel />}
      {currentPage === 'instrutores' && <Instrutores />}
    </Layout>
  );
}

function App() {
  return (<SecurityGuard><AuthProvider><ToastProvider><AppContent /></ToastProvider></AuthProvider></SecurityGuard>);
}

export default App;