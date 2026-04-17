import React, { useEffect } from 'react';

// Chave que será salva no navegador quando liberado
export const SECURITY_KEY = '@BJJCollege:authorized_device';

export default function SecurityGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Bloquear apenas o menu de contexto (botão direito)
    // NÃO bloqueamos atalhos úteis do sistema como Ctrl+S, Ctrl+P, F12, etc.
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <div className="select-none" onCopy={(e) => e.preventDefault()}>
      {children}
    </div>
  );
}
