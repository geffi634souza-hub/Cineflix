import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  Copy,
  Check,
  Share2,
  Calendar,
  Clock,
  Users,
  Gift,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

interface VipReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  hasActiveVip?: boolean;
  vipDaysRemaining?: number;
  vipActivatedAt: string;
  vipExpiresAt: string;
  referralCode: string;
  referralsCount: number;
  whatsappNumber: string;
  onOpenPixMonthly?: () => void;
}

export const VipReferralModal: React.FC<VipReferralModalProps> = ({
  isOpen,
  onClose,
  customerName,
  hasActiveVip = true,
  vipActivatedAt,
  vipExpiresAt,
  referralCode,
  referralsCount,
  whatsappNumber,
  onOpenPixMonthly,
}) => {
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Calculate live countdown to expiration
  useEffect(() => {
    if (!isOpen || !hasActiveVip || !vipExpiresAt) return;

    const calculateTime = () => {
      const target = new Date(vipExpiresAt).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen, hasActiveVip, vipExpiresAt]);

  if (!isOpen) return null;

  const formatDate = (iso: string) => {
    if (!iso) return '--/--/----';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const referralLink = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(
    referralCode
  )}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `🍿 Olha esse streaming com séries completas compiladas em episódio único sem enrolação!\n\nUse o meu link de convidado no Cineflix para assistir:\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleContactAdminWhatsApp = () => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const message = encodeURIComponent(
      hasActiveVip
        ? `Olá! Sou o assinante VIP "${customerName || 'Cliente'}" (código: ${referralCode}). Gostaria de falar sobre meu plano!`
        : `Olá! Gostaria de ativar meu Passe VIP Cineflix para ter acesso total a todas as séries!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleActivateClick = () => {
    onClose();
    if (onOpenPixMonthly) {
      onOpenPixMonthly();
    }
  };

  const currentCount = Math.min(3, referralsCount);
  const isGoalReached = currentCount >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className={`relative w-full max-w-lg bg-[#0b0f17] border ${hasActiveVip ? 'border-amber-500/40' : 'border-red-500/40'} rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto`}>
        {/* Top Highlight Gradient */}
        <div className={`h-1.5 w-full ${hasActiveVip ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600' : 'bg-gradient-to-r from-red-600 via-red-500 to-red-700'}`} />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl ${hasActiveVip ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-black border-yellow-300 shadow-amber-500/20' : 'bg-red-600/20 text-red-500 border-red-500/40'} font-black flex items-center justify-center shadow-lg border`}>
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-bold text-sm sm:text-base text-white">
                  Passe VIP Cineflix
                </h3>
                {hasActiveVip ? (
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Ativo
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
                    Inativo / Não Assinado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {customerName ? `Membro: ${customerName}` : 'Acesso total ilimitado a 100% das séries'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-left">
          {/* IF NOT ACTIVE: Clear call to activate without false countdown */}
          {!hasActiveVip ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/30 text-slate-200 space-y-2">
                <p className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-pink-500" />
                  <span>Você ainda não possui um Passe VIP ativo</span>
                </p>
                <p className="text-xs text-slate-300">
                  Com o Passe VIP por apenas <strong>R$ 29,90 / mês</strong>, você assiste a todas as séries completas em alta definição, sem anúncios e sem travas de prévia.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleActivateClick}
                  className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-pink-600/40 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Crown className="w-4 h-4" />
                  <span>Assinar VIP no Pix (R$ 29,90 / mês)</span>
                </button>

                <button
                  type="button"
                  onClick={handleContactAdminWhatsApp}
                  className="w-full py-2.5 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-xl border border-pink-500/40 hover:border-pink-500 shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-pink-500" />
                  <span>Tirar Dúvidas ou Ativar via WhatsApp</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* VIP Validity Box */}
              <div className="bg-white/[0.03] border border-amber-500/30 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Período da Assinatura</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Plano Mensal (30 dias)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Ativado em:</span>
                    <span className="text-white font-medium font-mono text-[11px]">
                      {formatDate(vipActivatedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Válido até:</span>
                    <span className="text-amber-300 font-bold font-mono text-[11px]">
                      {formatDate(vipExpiresAt)}
                    </span>
                  </div>
                </div>

                {/* Countdown Banner */}
                <div className="bg-black/60 rounded-lg p-2.5 flex items-center justify-between border border-white/10">
                  <span className="text-[11px] text-slate-300 font-medium">
                    Tempo restante de acesso:
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs font-black text-amber-400 tabular-nums">
                    <span>{timeRemaining.days}d</span>
                    <span>:</span>
                    <span>{timeRemaining.hours.toString().padStart(2, '0')}h</span>
                    <span>:</span>
                    <span>{timeRemaining.minutes.toString().padStart(2, '0')}m</span>
                    <span>:</span>
                    <span>{timeRemaining.seconds.toString().padStart(2, '0')}s</span>
                  </div>
                </div>
              </div>

              {/* Referral Program Section ("Indique 3 Amigos e Ganhe 1 Mês Grátis") */}
              <div className="bg-gradient-to-br from-red-950/40 via-[#0b0f17] to-amber-950/30 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                        <span>Indique 3 Amigos</span>
                        <span className="text-amber-400">= Ganhe 1 Mês Grátis!</span>
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        A cada 3 clientes que assinarem pelo seu link, você ganha +30 dias de VIP.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="space-y-1.5 bg-black/50 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Seu Progresso:</span>
                    </span>
                    <span className="font-mono text-amber-400 font-extrabold">
                      {currentCount} de 3 indicados
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(currentCount / 3) * 100}%` }}
                    />
                  </div>
                  {isGoalReached && (
                    <div className="text-[11px] text-amber-300 font-bold flex items-center gap-1 pt-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Parabéns! Você atingiu 3 amigos. Fale no WhatsApp para renovar grátis!</span>
                    </div>
                  )}
                </div>

                {/* Referral Link Copy Area */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    Seu Link de Convite Pessoal:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 select-all focus:outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full py-2 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-xl border border-red-500/40 hover:border-red-500 shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Compartilhar Link com Amigos no WhatsApp</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Contact Admin via WhatsApp */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleContactAdminWhatsApp}
              className="w-full py-2.5 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-xl border border-red-500/40 hover:border-red-500 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Falar com o Criador no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
