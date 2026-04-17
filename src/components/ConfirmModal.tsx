import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ConfirmType } from '../lib/config';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string;
  type?: ConfirmType;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmModal({
  show,
  title,
  message,
  type = 'danger',
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel = 'Cancelar'
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconBg: 'bg-green-100 text-green-600',
          confirmBg: 'bg-green-600 hover:bg-green-700 text-white shadow-green-200',
          border: 'border-green-600'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-yellow-100 text-yellow-600',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-200',
          border: 'border-yellow-600'
        };
      case 'info':
        return {
          icon: Info,
          iconBg: 'bg-blue-100 text-blue-600',
          confirmBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
          border: 'border-blue-600'
        };
      case 'danger':
      default:
        return {
          icon: AlertCircle,
          iconBg: 'bg-red-100 text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700 text-white shadow-red-200',
          border: 'border-red-600'
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className={`bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-4 ${styles.border} transform transition-all animate-scaleIn mx-4`}>
        {/* Ícone */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${styles.iconBg}`}>
          <IconComponent size={40} />
        </div>

        {/* Título e Mensagem */}
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic mb-2 text-center">
          {title}
        </h3>
        <p className="text-slate-500 mb-8 leading-relaxed font-medium text-center px-4">
          {message}
        </p>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-[1.5rem] uppercase tracking-widest text-xs hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-4 font-black uppercase tracking-widest text-xs shadow-xl transition-all rounded-[1.5rem] disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBg}`}
          >
            {loading ? 'PROCESSANDO...' : (confirmLabel || 'CONFIRMAR')}
          </button>
        </div>
      </div>
    </div>
  );
}
