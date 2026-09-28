import React from 'react';
import { X, Play, Clock, Bell } from 'lucide-react';
import { Series } from '../types/series';

interface NotificationToastProps {
  series: Series | null;
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  series,
  isOpen,
  onClose,
  onResume,
}) => {
  if (!isOpen || !series) return null;

  return (
    <div className="fixed top-16 inset-x-3 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-slide-down">
      <div className="bg-[#0e1420]/95 backdrop-blur-xl border border-pink-500/40 rounded-2xl shadow-2xl p-3.5 text-white flex items-center gap-3 shadow-pink-950/40">
        <div className="w-10 h-10 rounded-xl bg-pink-600/20 text-pink-500 border border-pink-500/30 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-pink-400">
              Lembrete de Sessão
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-200 font-semibold truncate mt-0.5">
            Você não terminou {series.title}!
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => {
                onResume();
                onClose();
              }}
              className="px-2.5 py-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm shadow-pink-600/30 transition-colors"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Continuar Assistindo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
