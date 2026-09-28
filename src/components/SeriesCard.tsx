import React from 'react';
import { Play, Lock, CheckCircle2, Clock, MessageCircle, ListVideo } from 'lucide-react';
import { Series } from '../types/series';

interface SeriesCardProps {
  series: Series;
  isUnlocked: boolean;
  isActive: boolean;
  onSelect: (series: Series) => void;
  onUnlockRequested: (series: Series) => void;
  whatsappNumber?: string;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
  series,
  isUnlocked,
  isActive,
  onSelect,
  onUnlockRequested,
  whatsappNumber = '5548992041577',
}) => {
  const handleInterestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const message = encodeURIComponent(
      `Olá! Tenho interesse na série "${series.title}" no Cineflix. Gostaria de saber como liberar o acesso!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const hasMultipleEpisodes = Boolean(series.episodes && series.episodes.length > 0);

  return (
    <div
      onClick={() => onSelect(series)}
      className={`group relative flex flex-col bg-[#0b0f17] rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer ${
        isActive
          ? 'border-pink-500 ring-2 ring-pink-500/40 shadow-xl shadow-pink-950/50'
          : !isUnlocked
          ? 'border-pink-950/60 hover:border-pink-500/50 hover:shadow-lg hover:shadow-black/60'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Poster Media Frame */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <img
          src={series.coverUrl}
          alt={series.title}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            !isUnlocked ? 'brightness-75 saturate-90' : ''
          }`}
        />

        {/* Contrast Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-black/40 to-transparent" />

        {/* ULTRA-VISIBLE LOCKED OR UNLOCKED BADGE */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
          {!isUnlocked ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg shadow-lg shadow-pink-600/40 border border-pink-400/50 backdrop-blur-md">
              <Lock className="w-3.5 h-3.5 text-white" />
              <span>BLOQUEADO</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-white/15 text-white rounded-lg shadow-md border border-white/20 backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
              <span>LIBERADO</span>
            </div>
          )}

          {/* Viewers Counter */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-mono text-white border border-white/10 tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
            <span className="font-semibold">{series.fakeViewers.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Center Lock or Play Indicator */}
        {!isUnlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-black/75 border border-pink-500/40 text-pink-400 flex items-center justify-center shadow-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5 text-pink-500" />
            </div>
            <span className="mt-1.5 px-2 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-pink-300 border border-pink-500/30 backdrop-blur-sm">
              Prévia de 2 min ({Math.max(120, series.previewLimitSeconds || 120)}s)
            </span>
          </div>
        )}

        {isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
              <Play className="w-5 h-5 ml-0.5 fill-black" />
            </div>
          </div>
        )}

        {/* Duration bottom tags */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between pointer-events-none">
          {hasMultipleEpisodes ? (
            <span className="px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-amber-400 backdrop-blur-sm flex items-center gap-1">
              <ListVideo className="w-3 h-3" />
              <span>{series.episodes?.length} Episódios</span>
            </span>
          ) : (
            <span />
          )}

          <div className="px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300 backdrop-blur-sm flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{series.durationMinutes} min</span>
          </div>
        </div>
      </div>

      {/* Content & Action */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium truncate mb-0.5">
            <span>{series.category}</span>
            {series.aspectRatio === '9:16' && (
              <span className="text-pink-400 font-bold uppercase text-[9px] px-1.5 py-0.2 bg-pink-600/10 rounded border border-pink-500/20">
                Mini Novela
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-pink-400 transition-colors line-clamp-1">
            {series.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
            {series.tagline || series.synopsis}
          </p>
        </div>

        {/* Action Row */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
          {!isUnlocked ? (
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-baseline gap-1">
                <span className="text-white font-extrabold text-sm font-mono">
                  R$ {series.promoPrice || series.price || 5},00
                </span>
                <span className="text-[10px] text-slate-400">no Pix</span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Tenho interesse */}
                <button
                  type="button"
                  onClick={handleInterestClick}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Tenho interesse no WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlockRequested(series);
                  }}
                  className="px-3 py-1.5 text-[11px] font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg transition-colors shadow-sm shadow-pink-600/30 whitespace-nowrap"
                >
                  Liberar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-xs">
              <span className="text-slate-300 font-semibold text-[11px]">
                {hasMultipleEpisodes ? `${series.episodes?.length} episódios` : 'Episódio Completo'}
              </span>
              <span className="text-pink-400 font-bold text-[11px] flex items-center gap-1">
                Assistir <Play className="w-3 h-3 fill-pink-400" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
