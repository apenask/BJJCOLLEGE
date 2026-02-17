import React from 'react';
import { QrCode, Copy, Wifi } from 'lucide-react'; // Adicionado Wifi
import { useToast } from '../contexts/ToastContext';

export default function Pix() {
  const { addToast } = useToast();
  
  const contas = [
    { 
      titulo: 'Mensalidade / Graduação', 
      payload: 'COLE_AQUI_O_PIX_COPIA_E_COLA_DA_MENSALIDADE', 
      chaveExtenso: 'suachave@email.com', // Chave por extenso
      qrImageUrl: '', // Cole aqui o link da imagem do seu QR Code
      cor: 'bg-blue-600'
    },
    { 
      titulo: 'Loja BJJ College', 
      payload: 'COLE_AQUI_O_PIX_COPIA_E_COLA_DA_LOJA', 
      chaveExtenso: '00.000.000/0001-00', // Chave por extenso
      qrImageUrl: '', // Cole aqui o link da imagem do seu QR Code
      cor: 'bg-green-600'
    }
  ];

  const wifiData = {
    nome: 'BJJ COLLEGE GUEST',
    senha: 'senhawifiaqui',
    qrImageUrl: '' // Link para imagem do QR Code do Wi-Fi
  };

  const copiarChave = (texto: string) => {
    navigator.clipboard.writeText(texto);
    addToast('Código copiado!', 'success');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">Pagamentos e Acesso</h2>
        <p className="text-slate-500 font-medium">Escaneie o QR Code ou utilize as chaves abaixo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {contas.map((conta, idx) => (
          <div key={idx} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <div className={`p-4 rounded-3xl ${conta.cor} text-white mb-6 shadow-lg`}><QrCode size={40} /></div>
            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 tracking-tighter">{conta.titulo}</h3>
            
            <div className="bg-white p-4 rounded-3xl mb-4 border-2 border-dashed border-slate-200 shadow-inner">
                {conta.qrImageUrl ? (
                    <img src={conta.qrImageUrl} alt="QR Code" className="w-48 h-48 mx-auto object-contain" />
                ) : (
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(conta.payload)}`} 
                        alt="QR Code" 
                        className="w-48 h-48 mx-auto" 
                    />
                )}
            </div>

            <p className="text-sm font-bold text-slate-600 mb-4 break-all px-4">{conta.chaveExtenso}</p>

            <button 
                onClick={() => copiarChave(conta.payload)} 
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
            >
                <Copy size={18}/> Copiar Código Pix
            </button>
          </div>
        ))}

        {/* Card de Wi-Fi */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <div className="p-4 rounded-3xl bg-purple-600 text-white mb-6 shadow-lg"><Wifi size={40} /></div>
            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 tracking-tighter">Wi-Fi Academia</h3>
            
            <div className="bg-white p-4 rounded-3xl mb-4 border-2 border-dashed border-slate-200 shadow-inner">
                {wifiData.qrImageUrl ? (
                    <img src={wifiData.qrImageUrl} alt="QR Code Wi-Fi" className="w-48 h-48 mx-auto object-contain" />
                ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-300">Sem Imagem</div>
                )}
            </div>

            <p className="text-xs font-black text-slate-400 uppercase">Senha</p>
            <p className="text-lg font-bold text-slate-800 mb-4">{wifiData.senha}</p>

            <button 
                onClick={() => copiarChave(wifiData.senha)} 
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
            >
                <Copy size={18}/> Copiar Senha
            </button>
          </div>
      </div>
    </div>
  );
}