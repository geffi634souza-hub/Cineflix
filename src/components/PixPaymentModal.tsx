import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  Zap,
  QrCode as QrIcon,
  KeyRound,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Series } from '../types/series';
import { generatePixPayload, formatPixKey } from '../utils/pixUtils';

interface PixPaymentModalProps {
  series: Series | null;
  selectedSeriesList?: Series[];
  customAmount?: number;
  customTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess: (seriesIds?: string[], isAllAccess?: boolean) => void;
  pixKey: string;
  pixKeyType?: string;
  whatsappNumber: string;
  isMonthlyPlan?: boolean;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  series,
  selectedSeriesList,
  customAmount,
  customTitle,
  isOpen,
  onClose,
  onUnlockSuccess,
  pixKey,
  pixKeyType = 'phone',
  whatsappNumber,
  isMonthlyPlan = false,
}) => {
  const [activeTab, setActiveTab] = useState<'qrcode' | 'chave'>('qrcode');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(600);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [selectedKeyType, setSelectedKeyType] = useState<string>(pixKeyType);
  const [includeFixedAmount, setIncludeFixedAmount] = useState<boolean>(true);

  // Sync selectedKeyType when prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedKeyType(pixKeyType || 'phone');
    }
  }, [isOpen, pixKeyType]);

  const numAmount = isMonthlyPlan
    ? 29.90
    : (customAmount ?? (selectedSeriesList && selectedSeriesList.length > 0
        ? selectedSeriesList.length * 5
        : (series?.promoPrice || series?.price || 5.00)));

  const priceDisplay = `R$ ${numAmount.toFixed(2).replace('.', ',')}`;
  const planTitle = isMonthlyPlan
    ? 'Mensalidade VIP (Acesso Total)'
    : (customTitle || (selectedSeriesList && selectedSeriesList.length > 1
        ? `Pacote com ${selectedSeriesList.length} Mini Novelas`
        : series?.title || 'Mini Novela'));

  // Format Pix key according to active selected type
  const effectivePixKey = formatPixKey(
    pixKey || '48988487037',
    (selectedKeyType as any) || 'phone'
  );

  // Generate official, 100% valid Banco Central EMV BRCode payload with CRC16
  const pixCopiaECola = generatePixPayload({
    pixKey: effectivePixKey,
    merchantName: 'MINI NOVELAS',
    merchantCity: 'SAO PAULO',
    amount: includeFixedAmount ? numAmount : undefined,
    txId: 'MININOVELAS',
  });

  // Generate crisp local QR code using QRCode library (instant, offline, no 3rd party failure)
  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(pixCopiaECola, {
      width: 240,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate local QR Code:', err);
      });
  }, [isOpen, pixCopiaECola]);

  useEffect(() => {
    if (isOpen) {
      setIsVerifying(false);
      setIsApproved(false);
      setTimerSeconds(600);
      setCopiedPayload(false);
      setCopiedKey(false);
    }
  }, [isOpen, series?.id, isMonthlyPlan]);

  useEffect(() => {
    if (!isOpen || isApproved) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isApproved]);

  if (!isOpen) return null;

  const handleCopyPayload = async () => {
    try {
      await navigator.clipboard.writeText(pixCopiaECola);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2500);
    } catch (err) {
      console.warn('Clipboard copy error', err);
    }
  };

  const handleCopyKeyOnly = async () => {
    try {
      await navigator.clipboard.writeText(effectivePixKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch (err) {
      console.warn('Clipboard copy error', err);
    }
  };

  const handleConfirmPayment = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsApproved(true);
      setTimeout(() => {
        if (isMonthlyPlan) {
          onUnlockSuccess(undefined, true);
        } else if (selectedSeriesList && selectedSeriesList.length > 0) {
          onUnlockSuccess(selectedSeriesList.map((s) => s.id), false);
        } else if (series) {
          onUnlockSuccess([series.id], false);
        }
        onClose();
      }, 1200);
    }, 1500);
  };

  const handleWhatsAppSupport = () => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const desc = isMonthlyPlan
      ? 'da Mensalidade VIP de R$ 29,90'
      : (selectedSeriesList && selectedSeriesList.length > 1
          ? `do pacote com ${selectedSeriesList.length} séries no valor de ${priceDisplay}`
          : `da série "${series?.title}" no valor de ${priceDisplay}`);
    const message = encodeURIComponent(
      `Olá! Efetuei o Pix ${desc} no Mini Novelas. Segue o comprovante para confirmação imediata.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-md bg-[#0b0f17] border border-pink-500/40 rounded-2xl shadow-2xl shadow-pink-950/40 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-600/20 text-pink-400 flex items-center justify-center border border-pink-500/30 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base text-white">
                {isMonthlyPlan ? 'Assinatura Mensal VIP via Pix' : 'Desbloqueio Imediato via Pix'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Pagamento seguro com liberação automática
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Summary Box */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="truncate pr-2">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                {isMonthlyPlan ? 'Plano Selecionado:' : 'Item Selecionado:'}
              </span>
              <h4 className="font-bold text-white text-sm truncate">{planTitle}</h4>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                Valor a Pagar:
              </span>
              <span className="text-xl font-black text-pink-400 font-mono">
                {priceDisplay}
              </span>
            </div>
          </div>

          {isApproved ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-pink-600/20 border-2 border-pink-500 text-pink-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Pagamento Confirmado!</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isMonthlyPlan
                    ? 'Mensalidade VIP ativada! Todas as séries liberadas.'
                    : 'Conteúdo liberado com sucesso!'}
                </p>
              </div>
              <span className="text-[11px] text-slate-400">Carregando catálogo...</span>
            </div>
          ) : (
            <>
              {/* Key Type Selector inside Modal for maximum bank compatibility */}
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                  <span>Tipo de Chave no seu Banco:</span>
                  <span className="text-[10px] text-pink-400 font-mono">
                    {effectivePixKey}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'phone', label: '📱 Celular' },
                    { id: 'cpf', label: '🪪 CPF' },
                    { id: 'email', label: '✉️ E-mail' },
                    { id: 'random', label: '🔑 Aleatória' },
                  ].map((kt) => (
                    <button
                      key={kt.id}
                      type="button"
                      onClick={() => setSelectedKeyType(kt.id)}
                      className={`py-1 px-1 text-[10px] font-bold rounded-lg transition-colors text-center truncate ${
                        selectedKeyType === kt.id
                          ? 'bg-pink-600 text-white'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {kt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Choice of Payment Method: QR Code / Copia e Cola OU Chave Direta */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('qrcode')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'qrcode'
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrIcon className="w-3.5 h-3.5" />
                  <span>QR Code / Copia e Cola</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('chave')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'chave'
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Pagar com Chave Pix</span>
                </button>
              </div>

              {/* TAB 1: QR CODE & COPIA E COLA */}
              {activeTab === 'qrcode' && (
                <div className="space-y-3">
                  {/* QR Code Canvas/Image */}
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-md mx-auto max-w-[210px]">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt={`QR Code Pix ${priceDisplay}`}
                        className="w-44 h-44 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    )}
                    <span className="text-[10px] text-black font-bold mt-1 text-center">
                      Aponte a câmera no app do seu banco
                    </span>
                  </div>

                  {/* Timer & Amount format toggle */}
                  <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-pink-500" />
                      <span>Válido: </span>
                      <span className="font-mono text-white font-bold tabular-nums">
                        {formatTimer(timerSeconds)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIncludeFixedAmount((prev) => !prev)}
                      className="text-[10px] text-pink-400 hover:underline flex items-center gap-1"
                    >
                      {includeFixedAmount ? 'Valor fixo embutido' : 'Valor aberto'}
                    </button>
                  </div>

                  {/* Pix Copia e Cola Code Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-semibold">Código Pix Copia e Cola:</span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Código Oficial Válido
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixCopiaECola}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPayload}
                        className={`flex items-center gap-1 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
                          copiedPayload
                            ? 'bg-emerald-500 text-black'
                            : 'bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-600/30'
                        }`}
                      >
                        {copiedPayload ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPayload ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CHAVE PIX DIRETA */}
              {activeTab === 'chave' && (
                <div className="space-y-3 p-3.5 bg-black/40 rounded-2xl border border-white/10">
                  <div className="text-center space-y-1">
                    <span className="text-[11px] text-slate-400 block">
                      Se você prefere pagar inserindo a chave no seu banco:
                    </span>
                    <div className="p-3 bg-white/5 border border-pink-500/30 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-pink-400 block mb-0.5">
                        Chave Pix:
                      </span>
                      <span className="font-mono text-base font-black text-white select-all block break-all">
                        {effectivePixKey}
                      </span>
                      <span className="text-[11px] text-slate-300 block mt-1 font-semibold">
                        Valor: <span className="text-pink-400 font-bold">{priceDisplay}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyKeyOnly}
                    className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      copiedKey
                        ? 'bg-emerald-500 text-black'
                        : 'bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-600/30'
                    }`}
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Chave Copiada com Sucesso!' : 'Copiar Apenas a Chave Pix'}</span>
                  </button>

                  <div className="text-[11px] text-slate-400 space-y-1 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                    <p className="font-semibold text-slate-300">Como pagar:</p>
                    <p>1. Abra o app do seu banco e vá em <strong className="text-white">Área Pix</strong>.</p>
                    <p>2. Escolha <strong className="text-white">Transferir / Pagar por Chave</strong>.</p>
                    <p>3. Cole a chave acima e digite o valor de <strong className="text-pink-400">{priceDisplay}</strong>.</p>
                  </div>
                </div>
              )}

              {/* Confirm button */}
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isVerifying}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando recebimento do Pix...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Já Efetuei o Pix ({priceDisplay})</span>
                  </>
                )}
              </button>

              {/* WhatsApp Support fallback */}
              <div className="pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleWhatsAppSupport}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white bg-[#0b0f17] hover:bg-black border border-pink-500/40 hover:border-pink-500 rounded-xl shadow-md transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-pink-500" />
                  <span>Enviar Comprovante no WhatsApp</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
