import React from 'react';
import { QrCode, Copy } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function Pix() {
  const { addToast } = useToast();
  
  const contas = [
    { 
      titulo: 'Mensalidade / Graduação', 
      payload: 'COLE_AQUI_O_PIX_COPIA_E_COLA_DA_MENSALIDADE', 
      cor: 'bg-blue-600'
    },
    { 
      titulo: 'Loja BJJ College', 
      payload: 'COLE_AQUI_O_PIX_COPIA_E_COLA_DA_LOJA', 
      cor: 'bg-green-600'
    }
  ];

  const copiarChave = (texto: string) => {
    navigator.clipboard.writeText(texto);
    addToast('Código Pix copiado!', 'success');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">Pagamentos Pix</h2>
        <p className="text-slate-500 font-medium">Escaneie o QR Code ou copie o código abaixo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {contas.map((conta, idx) => (
          <div key={idx} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <div className={`p-4 rounded-3xl ${conta.cor} text-white mb-6 shadow-lg`}><QrCode size={40} /></div>
            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 tracking-tighter">{conta.titulo}</h3>
            
            <div className="bg-white p-4 rounded-3xl mb-6 border-2 border-dashed border-slate-200 shadow-inner">
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(conta.payload)}`} 
                    alt="QR Code" 
                    className="w-48 h-48 mx-auto" 
                />
            </div>

            <button 
                onClick={() => copiarChave(conta.payload)} 
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
            >
                <Copy size={18}/> Copiar Código Pix
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}