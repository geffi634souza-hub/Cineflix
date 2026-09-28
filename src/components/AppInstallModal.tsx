import React, { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const AppInstallModal: React.FC = () => {
  const { isInstalled, isIOS, isAndroid, canPrompt, installApp } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // If already in standalone mode, do not show
    if (isInstalled) return;

    // Check if user dismissed it this session
    const dismissed = sessionStorage.getItem('cineflix_install_dismissed');
    if (dismissed) return;

    // Small delay to feel natural after initial page load
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  if (!isVisible || isInstalled) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('cineflix_install_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (canPrompt) {
      const ok = await installApp();
      if (ok) {
        setInstalledSuccess(true);
        setTimeout(() => setIsVisible(false), 2500);
      }
    } else {
      // Fallback instruction for Android browsers without direct event
      alert('Para instalar: toque no menu do seu navegador (três pontinhos no topo) e escolha "Instalar aplicativo" ou "Adicionar à tela inicial".');
    }
  };

  return (
    <div className="fixed bottom-4 inset-x-3 sm:left-auto sm:right-5 sm:max-w-sm z-50 animate-slide-up">
      <div className="relative bg-[#0d121c]/95 backdrop-blur-xl border border-pink-500/40 rounded-2xl shadow-2xl p-4 sm:p-5 text-white overflow-hidden shadow-pink-950/40">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-pink-600/30 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar aviso"
          className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand & Device Badge */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-black border border-pink-500/40 flex items-center justify-center p-1.5 shadow-lg shrink-0">
            <img src="/icon.svg" alt="Mini Novelas" className="w-full h-full object-contain" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-pink-600/20 border border-pink-500/30 text-[10px] font-black uppercase text-pink-400">
                {isIOS ? 'Detectado: Apple iOS' : isAndroid ? 'Detectado: Celular Android' : 'App Mini Novelas'}
              </span>
            </div>
            <h4 className="font-display font-bold text-sm text-white leading-tight mt-0.5">
              Instalar Aplicativo Mini Novelas
            </h4>
          </div>
        </div>

        {/* Success message */}
        {installedSuccess ? (
          <div className="py-2 flex items-center gap-2 text-white text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-pink-500" />
            <span>Aplicativo instalado com sucesso!</span>
          </div>
        ) : isIOS ? (
          /* iOS Step-by-Step Instructions */
          <div className="space-y-2.5 text-xs text-slate-300">
            <p className="text-[11px] leading-relaxed text-slate-300">
              Instale o app direto na tela de início do seu <strong>iPhone / iPad</strong>:
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-2 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-pink-600/30 text-pink-400 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="flex-1">
                  Toque no botão <Share className="w-3.5 h-3.5 inline mx-1 text-white" /> <strong>Compartilhar</strong> no rodapé do Safari.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-pink-600/30 text-pink-400 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="flex-1">
                  Selecione <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-white" /> <strong>"Adicionar à Tela de Início"</strong>.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Entendido, vou adicionar
            </button>
          </div>
        ) : (
          /* Android / Desktop Direct 1-Click Install */
          <div className="space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Baixe o aplicativo oficial para abrir em tela cheia com 1 toque, sem precisar digitar o link novamente.
            </p>

            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Baixar / Instalar App no Celular</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
