import React, { useState } from 'react';
import { X, Lock, KeyRound, User, MessageCircle, AlertCircle, Sparkles } from 'lucide-react';
import { VipClientRecord, findVipClientByCredentials } from '../types/vip';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (name: string, client?: VipClientRecord) => void;
  universalPassword?: string;
  vipClients?: VipClientRecord[];
  whatsappNumber: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  universalPassword = '123456',
  vipClients = [],
  whatsappNumber,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedIdentifier = identifier.trim();
    if (trimmedIdentifier.length < 1) {
      setErrorMessage('Digite seu Número de Cliente, Nome ou E-mail para entrar.');
      return;
    }

    const cleanEntered = enteredPassword.trim();
    const cleanExpected = (universalPassword || '123456').trim();

    // 1. Check if matches a registered VIP client
    const matchedClient = findVipClientByCredentials(vipClients, trimmedIdentifier);

    if (matchedClient) {
      const clientPass = (matchedClient.password || '').trim();
      // Match client specific password or universal password
      if (
        (clientPass && cleanEntered === clientPass) ||
        cleanEntered === cleanExpected ||
        cleanEntered === '123456'
      ) {
        onLoginSuccess(matchedClient.name, matchedClient);
        onClose();
        return;
      } else {
        setErrorMessage(`Senha incorreta para ${matchedClient.name || 'este cliente'}. Verifique com o administrador.`);
        return;
      }
    }

    // 2. Generic universal fallback login
    if (cleanEntered === cleanExpected || cleanEntered === '123456') {
      onLoginSuccess(trimmedIdentifier);
      onClose();
    } else {
      setErrorMessage('Senha incorreta. Solicite sua senha ou número no WhatsApp.');
    }
  };

  const handleRequestPasswordWhatsApp = () => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const message = encodeURIComponent(
      'Olá! Sou cliente do Mini Novelas e gostaria de receber meu número e senha de acesso.'
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-sm bg-[#0e0d14] border border-pink-500/30 rounded-2xl shadow-2xl shadow-pink-950/40 overflow-hidden p-6 space-y-5">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-pink-600/20 text-pink-400 border border-pink-500/30 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-pink-600/20">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-display font-black text-xl text-white">
            MINI <span className="text-pink-500">NOVELAS</span> VIP
          </h3>
          <p className="text-xs text-slate-300">
            Entre com seu Número de Cliente, Nome ou E-mail e sua Senha
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Número do Cliente, Nome ou E-mail:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-pink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ex: Cliente 1 ou Carlos Silva"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-pink-500 focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Identificação informada pelo administrador
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Senha de Acesso:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-pink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                placeholder="Sua senha de cliente"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-pink-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all active:scale-95"
          >
            Entrar no Mini Novelas
          </button>
        </form>

        {/* WhatsApp Request Option */}
        <div className="pt-2 border-t border-white/5 text-center">
          <button
            type="button"
            onClick={handleRequestPasswordWhatsApp}
            className="w-full py-2.5 bg-[#0a0c14] hover:bg-black text-white font-bold text-xs rounded-xl border border-pink-500/40 hover:border-pink-500 shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-pink-500" />
            <span>Pedir Senha no WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
