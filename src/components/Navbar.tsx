import React, { useState } from 'react';
import { Search, MessageCircle, Crown, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  customerName?: string;
  isLoggedIn: boolean;
  hasActiveVip: boolean;
  vipDaysRemaining?: number;
  onOpenLogin: () => void;
  onOpenActivateVip: () => void;
  onLogout: () => void;
  onOpenSearch: () => void;
  onOpenCreatorPanel: () => void;
  onOpenVipModal: () => void;
  whatsappNumber: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  customerName,
  isLoggedIn,
  hasActiveVip,
  vipDaysRemaining = 0,
  onOpenLogin,
  onOpenActivateVip,
  onLogout,
  onOpenSearch,
  onOpenCreatorPanel,
  onOpenVipModal,
  whatsappNumber,
}) => {
  // Secret admin unlock: 5 taps on the Cineflix logo
  const [tapCount, setTapCount] = useState(0);

  const handleLogoTap = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = tapCount + 1;
    if (next >= 5) {
      setTapCount(0);
      onOpenCreatorPanel();
    } else {
      setTapCount(next);
      setTimeout(() => setTapCount(0), 3000);
    }
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const message = encodeURIComponent('Olá! Gostaria de tirar dúvidas no WhatsApp sobre as séries do Cineflix.');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#07090e]/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col items-center gap-2">
        {/* TOP ROW: CINEFLIX LOGO WITH VIP AT TOP RIGHT */}
        <div className="w-full flex items-center justify-between relative">
          {/* Left subtle indicator / greeting */}
          <div className="flex items-center justify-start min-w-[70px] sm:min-w-[110px]">
            {customerName ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-300 truncate max-w-[95px] sm:max-w-[140px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasActiveVip ? 'bg-amber-400' : 'bg-red-500'} animate-pulse shrink-0`} />
                  <span className="truncate">{customerName}</span>
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sair da conta"
                  className="text-[9px] text-slate-500 hover:text-red-400 transition-colors hidden sm:inline"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenCreatorPanel}
                title="Painel Administrativo"
                className="p-1 rounded-lg text-slate-600 hover:text-slate-400 text-xs transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 opacity-30 hover:opacity-100" />
              </button>
            )}
          </div>

          {/* Centered Brand Name: text only, no image */}
          <div
            onClick={handleLogoTap}
            className="flex items-center justify-center cursor-pointer select-none group px-1 py-0.5"
            title="Mini Novelas (Toque 5x para painel do criador)"
          >
            <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-white flex items-center drop-shadow-[0_2px_14px_rgba(255,0,127,0.7)] group-hover:scale-105 transition-transform">
              MINI <span className="text-pink-500 ml-1.5">NOVELAS</span>
            </span>
          </div>

          {/* Right Corner: VIP button */}
          <div className="flex items-center justify-end min-w-[50px] sm:min-w-[100px]">
            {hasActiveVip ? (
              <button
                type="button"
                onClick={onOpenVipModal}
                title="Clique para ver detalhes do seu VIP"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-extrabold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-105 text-black rounded-xl shadow border border-yellow-300 transition-all active:scale-95 whitespace-nowrap"
              >
                <Crown className="w-3.5 h-3.5 fill-black text-black shrink-0" />
                <span>VIP ({vipDaysRemaining}d)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenActivateVip}
                title="Ativar Passe VIP"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black shadow-md shadow-pink-600/30 transition-all whitespace-nowrap active:scale-95 border border-pink-400/30"
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>VIP</span>
              </button>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: JUST 2 BUTTONS (Pesquisar Séries e WhatsApp) */}
        <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-2 pt-0.5">
          {/* 1. Pesquisar Séries */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white rounded-xl border border-white/10 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span className="truncate">Pesquisar Séries</span>
          </button>

          {/* 2. WhatsApp */}
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            title="Tirar Dúvidas no WhatsApp"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold bg-[#0e0d14] hover:bg-black text-white rounded-xl border border-pink-500/40 hover:border-pink-500 shadow-md shadow-pink-950/30 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </header>
  );
};
