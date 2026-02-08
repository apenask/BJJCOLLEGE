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

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'totem' && <Totem />}
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
      <AppContent />
      <ToastProvider> {/* Adicionado para os alertas funcionarem */}
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
