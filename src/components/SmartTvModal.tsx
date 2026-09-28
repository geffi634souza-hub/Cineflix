import React, { useState, useEffect } from 'react';
import {
  X,
  Tv,
  Cast,
  Wifi,
  Radio,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Smartphone,
  Info,
  HelpCircle,
} from 'lucide-react';
import { Series, Episode } from '../types/series';

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    chrome?: any;
    cast?: any;
  }
}

interface SmartTvModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: Series;
  currentEpisode?: Episode;
  videoUrl: string;
  videoElement: HTMLVideoElement | null;
}

export const SmartTvModal: React.FC<SmartTvModalProps> = ({
  isOpen,
  onClose,
  series,
  currentEpisode,
  videoUrl,
  videoElement,
}) => {
  const [activeTab, setActiveTab] = useState<'cast' | 'airplay' | 'smartview' | 'tvbrowser'>('cast');
  const [isCastAvailable, setIsCastAvailable] = useState<boolean>(false);
  const [castSession, setCastSession] = useState<any>(null);
  const [castDeviceName, setCastDeviceName] = useState<string>('');
  const [isCasting, setIsCasting] = useState<boolean>(false);
  const [castStatus, setCastStatus] = useState<string>('Pronto para conectar');
  const [castError, setCastError] = useState<string | null>(null);

  // AirPlay detection
  const isAirPlaySupported = Boolean(
    videoElement && (videoElement as any).webkitShowPlaybackTargetPicker
  );

  // Initialize and check Google Cast Web Sender SDK
  useEffect(() => {
    function checkCastSupport() {
      if (window.cast?.framework && window.chrome?.cast) {
        setIsCastAvailable(true);
        try {
          const context = window.cast.framework.CastContext.getInstance();
          context.setOptions({
            receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });

          // Session change listener
          context.addEventListener(
            window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            (event: any) => {
              const session = context.getCurrentSession();
              if (session) {
                setCastSession(session);
                setIsCasting(true);
                setCastDeviceName(session.getCastDevice().friendlyName || 'Smart TV / Chromecast');
                setCastStatus('Conectado à televisão');
              } else {
                setCastSession(null);
                setIsCasting(false);
                setCastDeviceName('');
                setCastStatus('Desconectado');
              }
            }
          );
        } catch (e) {
          console.warn('Cast context setup:', e);
        }
      }
    }

    if (window.cast?.framework) {
      checkCastSupport();
    } else {
      window.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable) {
          checkCastSupport();
        }
      };
    }
  }, []);

  if (!isOpen) return null;

  const currentTitle = currentEpisode
    ? `${series.title} - Ep. ${currentEpisode.episodeNumber}: ${currentEpisode.title}`
    : series.title;

  // Request Google Cast Session
  const handleStartCast = async () => {
    setCastError(null);
    if (!window.cast?.framework) {
      setCastError('O Google Cast Web Sender não está disponível neste navegador. Use o Google Chrome no Android, Windows ou Mac.');
      return;
    }

    try {
      setCastStatus('Buscando dispositivos na rede Wi-Fi...');
      const context = window.cast.framework.CastContext.getInstance();
      await context.requestSession();

      const session = context.getCurrentSession();
      if (!session) {
        setCastStatus('Nenhum dispositivo selecionado.');
        return;
      }

      setCastSession(session);
      setIsCasting(true);
      setCastDeviceName(session.getCastDevice().friendlyName || 'Smart TV');

      // Load media into receiver
      const isHls = videoUrl.includes('.m3u8');
      const contentType = isHls ? 'application/x-mpegURL' : 'video/mp4';

      const mediaInfo = new window.chrome.cast.media.MediaInfo(videoUrl, contentType);
      mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = currentTitle;
      mediaInfo.metadata.subtitle = 'Cineflix Streaming';
      if (series.coverUrl) {
        mediaInfo.metadata.images = [{ url: series.coverUrl }];
      }

      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;
      if (videoElement) {
        request.currentTime = videoElement.currentTime || 0;
      }

      session.loadMedia(request).then(
        () => {
          setCastStatus('Reproduzindo na Smart TV');
        },
        (err: any) => {
          console.warn('Cast load error:', err);
          setCastError('A Smart TV não conseguiu carregar este link. Certifique-se de que o link é HTTPS e possui CORS ativo.');
        }
      );
    } catch (err: any) {
      if (err !== 'cancel') {
        console.warn('Cast error:', err);
        setCastError('Não foi possível iniciar a transmissão. Verifique se a TV está ligada na mesma rede Wi-Fi.');
      }
    }
  };

  const handleStopCast = () => {
    if (window.cast?.framework) {
      const context = window.cast.framework.CastContext.getInstance();
      context.endCurrentSession(true);
      setIsCasting(false);
      setCastSession(null);
      setCastStatus('Transmissão encerrada');
    }
  };

  const handleTriggerAirPlay = () => {
    if (videoElement && (videoElement as any).webkitShowPlaybackTargetPicker) {
      (videoElement as any).webkitShowPlaybackTargetPicker();
    } else {
      alert('AirPlay nativo disponível pelo Safari no iPhone, iPad ou Mac.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-[#0b0f17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-white">
                Assistir na Smart TV
              </h2>
              <p className="text-xs text-slate-400">
                Transmita do celular direto para a televisão sem complicação
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Series banner context */}
        <div className="px-4 py-2.5 bg-white/5 border-b border-white/5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-red-500 font-bold">Conteúdo:</span>
            <span className="text-white font-medium truncate">{currentTitle}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 shrink-0">
            {videoUrl.includes('.m3u8') ? 'HLS Stream' : 'Vídeo HD'}
          </span>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-white/10 bg-black/20 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('cast')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'cast'
                ? 'border-red-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Cast className="w-4 h-4 text-red-500" />
            <span>Google Cast (Chromecast / Android TV)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('airplay')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'airplay'
                ? 'border-red-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4 text-red-500" />
            <span>AirPlay (iPhone / Apple TV)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smartview')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'smartview'
                ? 'border-red-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4 text-red-500" />
            <span>Smart View / Espelhamento</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tvbrowser')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'tvbrowser'
                ? 'border-red-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ExternalLink className="w-4 h-4 text-red-500" />
            <span>Navegador da TV</span>
          </button>
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* TAB 1: GOOGLE CAST */}
          {activeTab === 'cast' && (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Google Cast Web Sender SDK
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Transmita para Chromecast, Google TV, TVs TCL, Sony, Philco ou Android TV conectados ao seu Wi-Fi.
                  </p>
                  {castDeviceName && (
                    <p className="text-xs text-emerald-400 font-semibold pt-1">
                      Conectado a: {castDeviceName}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCasting ? (
                    <button
                      type="button"
                      onClick={handleStopCast}
                      className="px-4 py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30 text-xs font-bold transition-all"
                    >
                      Desconectar TV
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartCast}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Cast className="w-4 h-4" />
                      <span>Conectar à Televisão</span>
                    </button>
                  )}
                </div>
              </div>

              {castError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{castError}</span>
                </div>
              )}

              {/* Wi-Fi checklist */}
              <div className="bg-[#07090e] border border-white/5 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-red-500" />
                  <span>Requisitos fundamentais de rede:</span>
                </h4>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Mesma rede Wi-Fi:</strong> O celular e a TV precisam estar conectados no mesmo roteador (ex: mesmo Wi-Fi de 2.4GHz ou 5GHz).
                  </li>
                  <li>
                    <strong>Desative VPNs:</strong> Se você estiver com VPN ativa no celular, a descoberta de aparelhos locais é bloqueada.
                  </li>
                  <li>
                    <strong>Isolamento de Dispositivos (AP Isolation):</strong> Alguns roteadores bloqueiam a conversa entre aparelhos por segurança. Caso a TV não apareça, verifique essa opção nas configurações do roteador.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: AIRPLAY */}
          {activeTab === 'airplay' && (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    AirPlay 2 (Apple)
                  </span>
                  <p className="text-xs text-slate-300">
                    Compatível com Apple TV, televisores LG ThinQ, Samsung Crystal/OLED e Roku com suporte a AirPlay 2.
                  </p>
                </div>

                {isAirPlaySupported ? (
                  <button
                    type="button"
                    onClick={handleTriggerAirPlay}
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-extrabold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-2 shrink-0"
                  >
                    <Radio className="w-4 h-4 text-black" />
                    <span>Abrir AirPlay</span>
                  </button>
                ) : (
                  <div className="text-xs text-amber-400 font-medium bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-lg">
                    Abra este site no Safari do seu iPhone/Mac para acionar o AirPlay diretamente.
                  </div>
                )}
              </div>

              <div className="bg-[#07090e] border border-white/5 rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
                <h4 className="font-bold text-white">Como transmitir pelo iPhone:</h4>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>Abra o Centro de Controle do iPhone (deslize do canto superior direito para baixo).</li>
                  <li>Toque no ícone de <strong>Espelhar a Tela</strong> (dois retângulos sobrepostos).</li>
                  <li>Selecione sua TV ou Apple TV na lista.</li>
                  <li>Pronto! O vídeo do Cineflix tocará em tela cheia na sua TV.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: SMART VIEW / ESPELHAMENTO */}
          {activeTab === 'smartview' && (
            <div className="space-y-4 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-red-500" />
                  <span>Samsung Smart View / Transmitir Android</span>
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  O espelhamento de tela direto é gerenciado pelo sistema operacional do celular (Android/OneUI/MIUI), sem necessidade de instalar aplicativos externos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#07090e] border border-white/5 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Celulares Samsung (Galaxy)</span>
                  </h4>
                  <ol className="list-decimal list-inside text-slate-300 space-y-1">
                    <li>Deslize a barra de notificações duas vezes para baixo.</li>
                    <li>Toque no botão <strong>Smart View</strong>.</li>
                    <li>Escolha sua TV Samsung ou compatível.</li>
                    <li>Coloque o vídeo do Cineflix em tela cheia.</li>
                  </ol>
                </div>

                <div className="bg-[#07090e] border border-white/5 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Motorola, Xiaomi e outros Android</span>
                  </h4>
                  <ol className="list-decimal list-inside text-slate-300 space-y-1">
                    <li>Acesse as <strong>Configurações do Android</strong>.</li>
                    <li>Vá em <strong>Dispositivos Conectados &gt; Transmitir</strong> (ou <strong>Emitir</strong>).</li>
                    <li>Ative a busca de telas sem fio e selecione sua Smart TV.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NAVEGADOR DA SMART TV */}
          {activeTab === 'tvbrowser' && (
            <div className="space-y-4 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-red-500" />
                  <span>Acesso direto pelo Navegador da Televisão</span>
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Todas as Smart TVs modernas (Samsung Tizen, LG webOS, Android TV, Fire TV Stick) possuem um navegador de internet integrado (Internet / Web Browser / Silk).
                </p>
              </div>

              <div className="bg-[#07090e] border border-white/5 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-white">Passo a passo rápido:</h4>
                <ol className="list-decimal list-inside text-slate-300 space-y-2 leading-relaxed">
                  <li>No controle remoto da sua TV, abra o aplicativo <strong>Navegador / Internet</strong>.</li>
                  <li>Digite o endereço deste site na barra de navegação da TV:
                    <div className="my-1.5 p-2 bg-black rounded-lg font-mono text-[11px] text-red-400 border border-white/10 select-all">
                      {window.location.origin}
                    </div>
                  </li>
                  <li>Faça login ou abra a série diretamente. O player universal HLS funcionará em alta definição na TV com controle remoto!</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span>{castStatus}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
