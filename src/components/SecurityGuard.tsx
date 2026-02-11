import React, { useEffect } from 'react';

// Chave que será salva no navegador quando liberado
export const SECURITY_KEY = '@BJJCollege:authorized_device';

export default function SecurityGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Bloquear Botão Direito Completo
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 2. Bloquear Atalhos de Desenvolvedor e Visualização
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloqueia F12
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Bloqueia combinações com CTRL + SHIFT (I, J, C, K)
      if (e.ctrlKey && e.shiftKey) {
        if (['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // Bloqueia combinações com CTRL (U = Código Fonte, S = Salvar, P = Imprimir, H = Histórico)
      if (e.ctrlKey) {
        if (['U', 'S', 'P', 'H'].includes(e.key.toUpperCase())) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // Adiciona os ouvintes de evento
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Limpa o console periodicamente para dificultar leitura de logs
    const interval = setInterval(() => {
      // console.clear(); // Opcional: pode ser irritante durante o desenvolvimento
    }, 2000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="select-none" onCopy={(e) => e.preventDefault()}>
      {children}
    </div>
  );
}