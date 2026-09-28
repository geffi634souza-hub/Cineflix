import React from 'react';
import { X, Trophy, Lock, Play, MessageCircle } from 'lucide-react';
import { Series } from '../types/series';

interface SeriesCompletedModalProps {
  completedSeries: Series | null;
  nextSeries: Series | null;
  isOpen: boolean;
  onClose: () => void;
  onUnlockNext: (series: Series) => void;
  onPlayNextDirect: (series: Series) => void;
  isNextUnlocked: boolean;
  whatsappNumber: string;
}

export const SeriesCompletedModal: React.FC<SeriesCompletedModalProps> = ({
  completedSeries,
  nextSeries,
  isOpen,
  onClose,
  onUnlockNext,
  onPlayNextDirect,
  isNextUnlocked,
  whatsappNumber,
}) => {
  if (!isOpen || !completedSeries) return null;

  const handleWhatsApp = () => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const message = encodeURIComponent(
      `Olá! Acabei de assistir à série "${completedSeries.title}" no Cineflix e quero liberar o próximo episódio!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0b0f17] border border-red-600/30 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 text-center space-y-4">
        {/* Glow */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy & Badge */}
        <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-600/20">
          <Trophy className="w-7 h-7" />
        </div>

        <div>
          <span className="px-3 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider">
            Episódio Concluído!
          </span>
          <h3 className="font-display font-black text-xl text-white mt-1.5">
            Você terminou {completedSeries.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Continue maratonando! A próxima série já está pronta:
          </p>
        </div>

        {/* Next Series Card */}
        {nextSeries && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 text-left">
            <img
              src={nextSeries.coverUrl}
              alt={nextSeries.title}
              className="w-16 h-20 object-cover rounded-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-pink-400 uppercase block">
                Próxima Recomendação
              </span>
              <h4 className="font-bold text-white text-sm truncate">{nextSeries.title}</h4>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {nextSeries.tagline}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs font-extrabold text-white font-mono">
                  {isNextUnlocked ? 'Liberada' : 'R$ 5,00 no Pix'}
                </span>
                <span className="text-[10px] text-slate-500">· {nextSeries.durationMinutes} min</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {nextSeries && (
            isNextUnlocked ? (
              <button
                type="button"
                onClick={() => {
                  onPlayNextDirect(nextSeries);
                  onClose();
                }}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Começar {nextSeries.title} Agora</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onUnlockNext(nextSeries);
                  onClose();
                }}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span>Liberar Próxima Série por R$ 5,00 no Pix</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full py-2.5 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-xl border border-pink-500/40 hover:border-pink-500 transition-colors flex items-center justify-center gap-1.5 shadow-md"
          >
            <MessageCircle className="w-4 h-4 text-pink-500" />
            <span>Tirar Dúvidas no WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
