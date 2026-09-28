import React from 'react';
import {
  Check,
  Plus,
  Play,
  Lock,
  Sparkles,
  ShoppingBag,
  Layers,
  Crown,
  CheckCircle2,
  Tv,
} from 'lucide-react';
import { Series } from '../types/series';

interface SeriesSelectorGridProps {
  seriesList: Series[];
  activeSeriesId: string;
  unlockedSet: Set<string>;
  hasActiveVip: boolean;
  selectedSeriesIds: Set<string>;
  onToggleSelectSeries: (seriesId: string) => void;
  onSelectAllSeries: () => void;
  onClearSelection: () => void;
  onPlaySeries: (series: Series) => void;
  onCheckoutSelected: (selectedSeries: Series[]) => void;
  onOpenVipPass: () => void;
}

export const SeriesSelectorGrid: React.FC<SeriesSelectorGridProps> = ({
  seriesList,
  activeSeriesId,
  unlockedSet,
  hasActiveVip,
  selectedSeriesIds,
  onToggleSelectSeries,
  onSelectAllSeries,
  onClearSelection,
  onPlaySeries,
  onCheckoutSelected,
  onOpenVipPass,
}) => {
  const selectedCount = selectedSeriesIds.size;
  const totalPrice = selectedCount * 5; // R$ 5 each
  const selectedSeriesArray = seriesList.filter((s) => selectedSeriesIds.has(s.id));

  return (
    <section className="space-y-4 font-sans" aria-label="Catálogo e Seleção de Séries">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-pink-950/30 via-[#0e0d14] to-[#08080c] border border-pink-500/20 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
            <span className="text-[11px] font-bold font-mono tracking-widest text-pink-400 uppercase">
              Catálogo Mini Novelas
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Escolha Suas Séries</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 font-mono">
              R$ 5,00 cada
            </span>
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Clique nas capas para selecionar uma ou várias séries ao mesmo tempo e calcular o total no Pix, ou clique em <strong>Assistir</strong> para ver a prévia.
          </p>
        </div>

        {/* Quick Selection Shortcuts */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onSelectAllSeries}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Selecionar Todas
          </button>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors"
            >
              Limpar ({selectedCount})
            </button>
          )}
        </div>
      </div>

      {/* Grid: 3 series side by side on desktop/tablet, 2 on compact mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3.5 sm:gap-5">
        {seriesList.map((series) => {
          const isSelected = selectedSeriesIds.has(series.id);
          const isUnlocked = hasActiveVip || unlockedSet.has(series.id);
          const isActiveInPlayer = activeSeriesId === series.id;

          return (
            <div
              key={series.id}
              className={`group relative rounded-2xl overflow-hidden flex flex-col bg-[#0d0f17] border transition-all duration-300 shadow-md ${
                isSelected
                  ? 'border-pink-500 ring-2 ring-pink-500/50 shadow-pink-500/20 shadow-xl translate-y-[-2px]'
                  : isActiveInPlayer
                  ? 'border-pink-500/40 bg-pink-950/10'
                  : 'border-white/10 hover:border-pink-500/30 hover:shadow-lg'
              }`}
            >
              {/* Cover Card Area */}
              <div
                onClick={() => {
                  if (!isUnlocked) {
                    onToggleSelectSeries(series.id);
                  } else {
                    onPlaySeries(series);
                  }
                }}
                className="relative aspect-[9/16] w-full overflow-hidden bg-black cursor-pointer select-none"
              >
                <img
                  src={series.coverUrl}
                  alt={series.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f17] via-transparent to-black/60 pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md text-pink-400 border border-pink-500/30">
                    {series.category.split('&')[0].trim()}
                  </span>

                  {/* Multi-Select Checkbox Pill */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectSeries(series.id);
                    }}
                    className={`pointer-events-auto p-1.5 rounded-xl border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-600/50 scale-105'
                        : 'bg-black/70 backdrop-blur-md border-white/20 text-white hover:border-pink-400'
                    }`}
                    title={isSelected ? 'Remover da seleção' : 'Selecionar para comprar'}
                  >
                    {isSelected ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <Plus className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                </div>

                {/* Unlocked / Locked Status Banner in Cover */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] pointer-events-none z-10">
                  {isUnlocked ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600/90 text-white font-bold flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Liberada</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-pink-600/90 text-white font-bold font-mono shadow-md">
                      R$ 5,00
                    </span>
                  )}

                  {isActiveInPlayer && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold backdrop-blur-md">
                      No Player
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Card Content */}
              <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2.5 bg-[#0d0f17]">
                <div className="space-y-1">
                  <h3
                    onClick={() => onPlaySeries(series)}
                    className="font-display font-bold text-xs sm:text-sm text-white line-clamp-2 hover:text-pink-400 cursor-pointer transition-colors leading-tight"
                    title={series.title}
                  >
                    {series.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {series.synopsis}
                  </p>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => onPlaySeries(series)}
                    className="flex-1 py-1.5 px-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-white/10"
                    title="Assistir prévia no player principal"
                  >
                    <Play className="w-3 h-3 text-pink-500 fill-pink-500" />
                    <span>Assistir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleSelectSeries(series.id)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap active:scale-95 ${
                      isSelected
                        ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                        : isUnlocked
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Escolhida</span>
                      </>
                    ) : isUnlocked ? (
                      <span>Liberada</span>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Adicionar R$ 5</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar when 1 or more series are selected */}
      {selectedCount > 0 && (
        <div className="sticky bottom-3 z-40 p-3 sm:p-4 rounded-2xl bg-[#0e0d14]/95 backdrop-blur-xl border border-pink-500/50 shadow-2xl shadow-pink-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/40 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  {selectedCount} {selectedCount === 1 ? 'série selecionada' : 'séries selecionadas'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-pink-600/30 text-pink-300 font-mono font-bold text-xs border border-pink-500/40">
                  Total: R$ {totalPrice},00
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Liberação imediata de todos os episódios completos no Pix.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClearSelection}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => onCheckoutSelected(selectedSeriesArray)}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-pink-600/40 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Liberar no Pix por R$ {totalPrice},00</span>
            </button>
          </div>
        </div>
      )}

      {/* VIP Upsell Teaser */}
      {!hasActiveVip && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-[#0e0d14] border border-pink-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2 justify-center sm:justify-start">
                <span>Quer assistir a TODAS as séries sem limites?</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500 text-white font-mono uppercase">
                  Passe VIP
                </span>
              </h4>
              <p className="text-xs text-slate-300">
                Assine o Acesso VIP Mensal por apenas <strong>R$ 29,90/mês</strong> e desbloqueie 100% do catálogo!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenVipPass}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95"
          >
            <Crown className="w-4 h-4" />
            <span>Assinar VIP por R$ 29,90</span>
          </button>
        </div>
      )}
    </section>
  );
};
