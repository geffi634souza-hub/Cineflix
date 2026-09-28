import React, { useState } from 'react';
import { MessageCircle, X, ChevronUp, Sparkles } from 'lucide-react';
import { Series } from '../types/series';

interface FloatingWhatsAppProps {
  whatsappNumber: string;
  activeSeries?: Series | null;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  whatsappNumber,
  activeSeries,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return localStorage.getItem('cineflix_wa_minimized') === 'true';
  });

  const [hasInteracted, setHasInteracted] = useState(false);

  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMinimized;
    setIsMinimized(next);
    localStorage.setItem('cineflix_wa_minimized', String(next));
    setHasInteracted(true);
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    let message: string;

    if (activeSeries && activeSeries.title) {
      message = encodeURIComponent(
        `Olá! Estou no Cineflix acompanhando "${activeSeries.title}". Gostaria de tirar uma dúvida sobre a liberação de episódios e acesso completo!`
      );
    } else {
      message = encodeURIComponent(
        'Olá! Estou navegando no Cineflix e gostaria de saber mais sobre o catálogo de séries e o acesso VIP.'
      );
    }

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <aside
      aria-label="Atendimento via WhatsApp"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 pointer-events-auto select-none font-sans"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {isMinimized ? (
        // Compact Minimized Circle Icon
        <div className="relative group">
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            title={activeSeries ? `Dúvidas sobre "${activeSeries.title}" no WhatsApp` : 'Falar no WhatsApp'}
            className="w-13 h-13 rounded-full bg-[#0b0f17] border-2 border-emerald-500/80 hover:border-emerald-400 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
          >
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#07090e] animate-pulse" />
            <MessageCircle className="w-6 h-6 text-emerald-400 fill-emerald-500/20" />
          </button>

          {/* Un-minimize helper trigger */}
          <button
            type="button"
            onClick={toggleMinimize}
            title="Expandir atendimento"
            className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      ) : (
        // Expanded Discreet Card with Close/Minimize Action
        <div className="flex flex-col items-end gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-[280px] sm:max-w-[320px]">
          <div className="bg-[#0c1017]/95 backdrop-blur-md border border-emerald-500/40 hover:border-emerald-500/70 rounded-2xl p-3 shadow-2xl shadow-black/80 flex items-center gap-3 text-left">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex items-center gap-3 flex-1 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                <MessageCircle className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
              </div>

              <div className="min-w-0 pr-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Atendimento Rápido</span>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-0.5">
                  {activeSeries ? activeSeries.title : 'Suporte Cineflix'}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  Clique para falar no WhatsApp
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={toggleMinimize}
              title="Minimizar botão"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Minimizar WhatsApp"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
