import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Lock,
  Clock,
  RotateCcw,
  RotateCw,
  MessageCircle,
  CheckCircle2,
  ListVideo,
  Tv,
  Subtitles,
  Smartphone,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import Hls from 'hls.js';
import { Series, Episode } from '../types/series';
import { parseVideoSource } from '../utils/videoUtils';
import { SmartTvModal } from './SmartTvModal';

interface VideoPlayerProps {
  series: Series;
  isUnlocked: boolean;
  onUnlockRequested: () => void;
  onSimulateUnlock: (seriesId: string) => void;
  onSeriesEnded?: (series: Series) => void;
  whatsappNumber: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  series,
  isUnlocked,
  onUnlockRequested,
  onSimulateUnlock,
  onSeriesEnded,
  whatsappNumber,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Active episode tracking
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);

  // Aspect ratio state (Auto, 9:16 vertical for Mini Novelas, 16:9 widescreen)
  const [aspectRatioMode, setAspectRatioMode] = useState<'auto' | '9:16' | '16:9'>(() => {
    return series.aspectRatio || 'auto';
  });

  // Determine current active episode or fallback to series default video
  const hasEpisodes = Boolean(series.episodes && series.episodes.length > 0);
  const currentEpisode: Episode | undefined = hasEpisodes && series.episodes
    ? series.episodes[activeEpisodeIndex] || series.episodes[0]
    : undefined;

  const rawVideoUrl = currentEpisode ? currentEpisode.videoUrl : series.videoUrl;
  const currentSubtitleUrl = currentEpisode?.subtitleUrl || series.subtitleUrl;
  const parsedVideo = parseVideoSource(rawVideoUrl);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  // Playback speed state
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const availableSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Effective preview limit: at least 120 seconds (2 minutes)
  const effectivePreviewLimit = Math.max(120, series.previewLimitSeconds || 120);

  // Buffer and error states
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  // Resumption state
  const [savedResumeTime, setSavedResumeTime] = useState<number | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Smart TV modal state
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);

  // Live dynamic counter
  const [liveViewers, setLiveViewers] = useState(series.fakeViewers || 2480);

  const episodeKey = currentEpisode ? `${series.id}_ep_${currentEpisode.id || activeEpisodeIndex}` : `${series.id}_main`;

  // Check for saved playback position
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`cineflix_pos_${episodeKey}`);
      if (stored) {
        const parsedSecs = parseFloat(stored);
        if (parsedSecs > 10 && (!series.previewLimitSeconds || parsedSecs < (duration || 9999) - 15)) {
          setSavedResumeTime(parsedSecs);
          setShowResumeBanner(true);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }, [episodeKey, duration, series.previewLimitSeconds]);

  // Clean and initialize HLS or Native playback
  const initializePlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video || parsedVideo.isEmbed) return;

    setMediaError(null);
    setIsLoadingMedia(true);
    setCanRetry(false);

    // Resets on source change
    setMediaError(null);
    setIsLoadingMedia(true);
    setCanRetry(false);

    // Destroy existing Hls instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const videoUrl = parsedVideo.url;
    // Strict HLS detection: only .m3u8 files are HLS. Bunny direct MP4s must NOT be treated as HLS!
    const isHlsUrl = parsedVideo.isHls || videoUrl.toLowerCase().includes('.m3u8');

    // Case 1: HLS Stream with HLS.js support (Chrome, Firefox, Edge, Android)
    if (isHlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoadingMedia(false);
        setMediaError(null);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS.js event error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setMediaError('Erro de conexão ou CORS ao carregar o stream HLS do Bunny. Verifique se o endereço .m3u8 está correto e acessível.');
              setCanRetry(true);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setMediaError('Erro de decodificação da mídia HLS. Tentando recuperar...');
              hls.recoverMediaError();
              break;
            default:
              setMediaError('Não foi possível reproduzir a URL HLS. Verifique se o link .m3u8 está público no Bunny.');
              setCanRetry(true);
              hls.destroy();
              break;
          }
          setIsLoadingMedia(false);
        }
      });
    }
    // Case 2: Native HLS support (Safari iOS, macOS)
    else if (isHlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoadingMedia(false);
        setMediaError(null);
      }, { once: true });
      video.addEventListener('error', () => {
        setIsLoadingMedia(false);
        setMediaError('Erro ao carregar stream HLS nativo no Safari.');
        setCanRetry(true);
      }, { once: true });
    }
    // Case 3: Direct MP4/WebM video (Bunny MP4, Google Cloud, direct URL)
    else {
      video.src = videoUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoadingMedia(false);
        setMediaError(null);
      }, { once: true });
      video.addEventListener('error', (e) => {
        setIsLoadingMedia(false);
        console.warn('Direct video error:', e);
        setMediaError('Erro ao carregar o arquivo de vídeo MP4. Verifique a URL ou se o link é público.');
        setCanRetry(true);
      }, { once: true });
    }
  }, [parsedVideo.url, parsedVideo.isEmbed, parsedVideo.isHls]);

  // Effect to re-initialize player on source change
  useEffect(() => {
    initializePlayer();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [initializePlayer]);

  // Reset states when series or episode changes
  useEffect(() => {
    setActiveEpisodeIndex(0);
    setLiveViewers(series.fakeViewers || 2480);
    setIsLockedOut(false);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowResumeBanner(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, [series.id]);

  useEffect(() => {
    setIsLockedOut(false);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowResumeBanner(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, [activeEpisodeIndex]);

  // Unlock state sync
  useEffect(() => {
    if (isUnlocked) {
      setIsLockedOut(false);
    }
  }, [isUnlocked]);

  // Preview countdown timer for embedded iframe providers (Google Drive, Vimeo, Bunny embed)
  useEffect(() => {
    if (parsedVideo.isEmbed && !isUnlocked && !isLockedOut) {
      const timer = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          if (next >= effectivePreviewLimit) {
            setIsLockedOut(true);
            onUnlockRequested();
            clearInterval(timer);
            return effectivePreviewLimit;
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [parsedVideo.isEmbed, isUnlocked, isLockedOut, effectivePreviewLimit, onUnlockRequested]);

  // Viewer count flux
  useEffect(() => {
    const interval = setInterval(() => {
      const delta = Math.floor(Math.random() * 7) - 3;
      setLiveViewers((prev) => Math.max(1200, prev + delta));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isEffectiveLocked = !isUnlocked && isLockedOut;

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Save playback position periodically
    if (time > 5) {
      try {
        localStorage.setItem(`cineflix_pos_${episodeKey}`, String(Math.floor(time)));
      } catch (e) {
        // Ignored
      }
    }

    // Free preview lock check (at least 120s / 2 minutes)
    if (!isUnlocked && time >= effectivePreviewLimit) {
      videoRef.current.pause();
      videoRef.current.currentTime = effectivePreviewLimit;
      setIsPlaying(false);
      setIsLockedOut(true);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || series.durationMinutes * 60);
      videoRef.current.volume = volume;
      videoRef.current.playbackRate = playbackSpeed;
      setIsLoadingMedia(false);
    }
  };

  const togglePlay = () => {
    if (parsedVideo.isEmbed) {
      if (isEffectiveLocked) {
        onUnlockRequested();
        return;
      }
      setIsPlaying(!isPlaying);
      return;
    }

    if (!videoRef.current) return;

    if (isEffectiveLocked) {
      onUnlockRequested();
      return;
    }

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!isUnlocked && currentTime >= effectivePreviewLimit) {
        setIsLockedOut(true);
        onUnlockRequested();
        return;
      }
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => console.warn('Play interrupted:', err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (!isUnlocked && targetTime >= effectivePreviewLimit) {
      setIsLockedOut(true);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = effectivePreviewLimit;
      }
      setIsPlaying(false);
      onUnlockRequested();
      return;
    }

    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleSkipTime = (secondsDelta: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + secondsDelta, duration || 9999));
    if (!isUnlocked && newTime >= effectivePreviewLimit) {
      setIsLockedOut(true);
      videoRef.current.pause();
      videoRef.current.currentTime = effectivePreviewLimit;
      setIsPlaying(false);
      onUnlockRequested();
      return;
    }
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
        // iPhone native video fullscreen
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const handleRestartPreview = () => {
    setIsLockedOut(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      setIsPlaying(true);
    }
  };

  const handleResumeSavedPosition = () => {
    if (savedResumeTime && videoRef.current) {
      videoRef.current.currentTime = savedResumeTime;
      setCurrentTime(savedResumeTime);
      setShowResumeBanner(false);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleWhatsAppContact = () => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const message = encodeURIComponent(
      `Olá! Assisti à prévia de "${series.title}" no Mini Novelas e gostaria de liberar o acesso completo por R$ 5,00 no Pix!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppInterest = () => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const message = encodeURIComponent(
      `Olá! Tenho muito interesse na série "${series.title}" no Mini Novelas. Gostaria de saber como liberar todos os episódios completos!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const remainingPreviewSeconds = Math.max(0, effectivePreviewLimit - Math.floor(currentTime));
  const effectiveDuration = duration || series.durationMinutes * 60;

  // Compute container aspect ratio class based on mode
  const isVerticalRatio = aspectRatioMode === '9:16';
  const containerAspectClass = isVerticalRatio
    ? 'aspect-[9/16] max-w-[380px] mx-auto'
    : 'aspect-video w-full';

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Live Viewers & TV Streaming Button Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs text-white">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-600/20 border border-pink-500/30 text-pink-400 font-bold font-mono text-xs tabular-nums">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            <span>{liveViewers.toLocaleString('pt-BR')} pessoas assistindo agora</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Smart TV Transmission Button */}
          <button
            type="button"
            onClick={() => setIsTvModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
            title="Assistir na TV via Google Cast ou AirPlay"
          >
            <Tv className="w-4 h-4 text-pink-500" />
            <span className="hidden sm:inline">Assistir na TV</span>
            <span className="sm:hidden">Na TV</span>
          </button>

          {/* Mini Novelas Aspect Ratio Toggle (9:16 Vertical vs 16:9 Widescreen) */}
          <button
            type="button"
            onClick={() => setAspectRatioMode((prev) => (prev === '9:16' ? '16:9' : '9:16'))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              aspectRatioMode === '9:16'
                ? 'bg-red-600/20 border-red-500 text-white'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="Alternar entre formato vertical (Mini Novelas) e horizontal"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">{aspectRatioMode === '9:16' ? '9:16 Vertical' : '16:9'}</span>
          </button>

          {!isUnlocked && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold px-2">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Prévia</span>
            </div>
          )}
        </div>
      </div>

      {/* Resume Playback Banner */}
      {showResumeBanner && savedResumeTime && !isEffectiveLocked && (
        <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-white animate-in fade-in">
          <span>Você parou em <strong>{formatTime(savedResumeTime)}</strong>. Deseja continuar?</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResumeSavedPosition}
              className="px-2.5 py-1 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-500 transition-colors"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={() => setShowResumeBanner(false)}
              className="text-slate-400 hover:text-white"
            >
              Ignorar
            </button>
          </div>
        </div>
      )}

      {/* Video Player Main Container */}
      <div
        ref={containerRef}
        className={`relative ${containerAspectClass} bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group select-none transition-all duration-300`}
      >
        {/* Render Embedded Player (Google Drive, Vimeo, Bunny Embed, etc.) */}
        {parsedVideo.isEmbed ? (
          <div className="relative w-full h-full bg-black">
            <iframe
              src={parsedVideo.url}
              title={currentEpisode ? currentEpisode.title : series.title}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          /* Render Universal HTML5 Video with HLS.js and Subtitles support */
          <>
            <video
              ref={videoRef}
              poster={series.coverUrl}
              playsInline
              webkit-playsinline="true"
              x-webkit-airplay="allow"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => setIsLoadingMedia(true)}
              onPlaying={() => {
                setIsLoadingMedia(false);
                setIsPlaying(true);
              }}
              onEnded={() => {
                setIsPlaying(false);
                if (onSeriesEnded) {
                  onSeriesEnded(series);
                }
              }}
              className="w-full h-full object-contain bg-black cursor-pointer"
              onClick={togglePlay}
            >
              {currentSubtitleUrl && subtitlesEnabled && (
                <track
                  kind="subtitles"
                  src={currentSubtitleUrl}
                  srcLang="pt"
                  label="Português"
                  default
                />
              )}
            </video>

            {/* Media Loading Spinner */}
            {isLoadingMedia && !isEffectiveLocked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/30 backdrop-blur-[1px]">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                  <span className="text-[11px] font-bold text-white tracking-wider uppercase">Carregando...</span>
                </div>
              </div>
            )}

            {/* Media Error State Overlay */}
            {mediaError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/90 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
                <h4 className="text-sm font-bold text-white">Falha ao reproduzir mídia</h4>
                <p className="text-xs text-slate-300 max-w-sm">{mediaError}</p>
                {canRetry && (
                  <button
                    type="button"
                    onClick={initializePlayer}
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tentar Novamente</span>
                  </button>
                )}
              </div>
            )}

            {/* Center Play Icon */}
            {!isPlaying && !isLoadingMedia && !mediaError && !isEffectiveLocked && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer bg-black/40 backdrop-blur-[1px]"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-pink-600 text-white flex items-center justify-center shadow-2xl shadow-pink-600/50 transform group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 sm:w-9 sm:h-9 ml-1 fill-white" />
                </div>
              </div>
            )}

            {/* Bottom Control Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
              {/* Timeline Bar */}
              <div className="relative w-full flex items-center">
                <input
                  type="range"
                  min="0"
                  max={effectiveDuration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                {!isUnlocked && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-pink-500 shadow-sm pointer-events-none"
                    style={{
                      left: `${Math.min(100, (effectivePreviewLimit / effectiveDuration) * 100)}%`,
                    }}
                    title="Fim da Prévia Grátis"
                  />
                )}
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                    className="p-1 hover:text-pink-400 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                  </button>

                  {/* Backward 10s */}
                  <button
                    type="button"
                    onClick={() => handleSkipTime(-10)}
                    aria-label="Voltar 10 segundos"
                    className="p-1 hover:text-pink-400 transition-colors"
                    title="-10s"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Forward 10s */}
                  <button
                    type="button"
                    onClick={() => handleSkipTime(10)}
                    aria-label="Avançar 10 segundos"
                    className="p-1 hover:text-pink-400 transition-colors"
                    title="+10s"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Mute */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Desmutar' : 'Mutar'}
                    className="p-1 hover:text-pink-400 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <div className="font-mono text-slate-400 text-[11px] tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span className="mx-1">/</span>
                    <span>{formatTime(effectiveDuration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Speed Selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      aria-label="Velocidade de reprodução"
                      className="px-2 py-0.5 rounded text-xs font-bold font-mono transition-colors text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10"
                      title="Velocidade de Reprodução"
                    >
                      {playbackSpeed}x
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-full mb-2 right-0 bg-[#0d0f17] border border-pink-500/40 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-50 min-w-[75px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold px-1.5 py-0.5">
                          Velocidade
                        </span>
                        {availableSpeeds.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setPlaybackSpeed(s);
                              if (videoRef.current) {
                                videoRef.current.playbackRate = s;
                              }
                              setShowSpeedMenu(false);
                            }}
                            className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors text-left font-mono ${
                              playbackSpeed === s
                                ? 'bg-pink-600 text-white'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subtitles Toggle */}
                  {currentSubtitleUrl && (
                    <button
                      type="button"
                      onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                      aria-label="Legendas"
                      className={`p-1 transition-colors ${subtitlesEnabled ? 'text-pink-500' : 'text-slate-400 hover:text-white'}`}
                      title={subtitlesEnabled ? 'Desativar Legendas' : 'Ativar Legendas'}
                    >
                      <Subtitles className="w-4 h-4" />
                    </button>
                  )}

                  {/* Cast / TV Quick Button in Player */}
                  <button
                    type="button"
                    onClick={() => setIsTvModalOpen(true)}
                    aria-label="Assistir na TV"
                    className="p-1 hover:text-pink-500 transition-colors"
                    title="Assistir na Smart TV"
                  >
                    <Tv className="w-4 h-4" />
                  </button>

                  {/* Fullscreen */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label="Tela cheia"
                    className="p-1 hover:text-pink-500 transition-colors"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Top Floating Indicators */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-white border border-white/10 rounded-md">
              {currentEpisode ? `Episódio ${currentEpisode.episodeNumber}: ${currentEpisode.title}` : 'Episódio Completo'}
            </span>
            {parsedVideo.provider === 'gdrive' && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded">
                Google Drive
              </span>
            )}
            {parsedVideo.isHls && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded">
                HLS (.m3u8)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {parsedVideo.provider === 'gdrive' && (
              <a
                href={parsedVideo.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white border border-white/20 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 backdrop-blur-md"
                title="Abrir diretamente no Google Drive em nova aba"
              >
                <ExternalLink className="w-3 h-3 text-blue-400" />
                <span className="hidden sm:inline">Abrir no Drive</span>
              </a>
            )}

            {!isUnlocked && (
              <div className="px-2.5 py-1 bg-pink-600 text-white border border-pink-400/40 rounded-md backdrop-blur-md text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-pink-600/30">
                <Clock className="w-3.5 h-3.5" />
                <span>Prévia: {formatTime(remainingPreviewSeconds)}</span>
              </div>
            )}
          </div>
        </div>

        {/* LOCKED OUT SCREEN (Paywall) */}
        {isEffectiveLocked && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-fade-in font-sans">
            <div className="max-w-md w-full flex flex-col items-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center shadow-xl shadow-pink-600/40 text-white animate-bounce" style={{ animationDuration: '2s' }}>
                <Lock className="w-7 h-7" />
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-pink-400">
                Fim da Prévia Gratuita de 2 Minutos
              </span>

              <h3 className="font-display text-xl sm:text-2xl font-black text-white leading-tight">
                {series.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300">
                Desbloqueie os episódios completos da mini novela em alta definição com liberação imediata no Pix!
              </p>

              <div className="w-full bg-white/5 border border-pink-500/30 rounded-xl p-3 flex items-center justify-between text-left">
                <div>
                  <div className="text-[11px] text-slate-400">Acesso Completo via Pix:</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold text-pink-400 font-mono">
                      R$ 5,00
                    </span>
                    <span className="text-[11px] text-slate-400">pagamento único</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onUnlockRequested}
                  className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all active:scale-95 whitespace-nowrap"
                >
                  Pagar R$ 5 no Pix
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
                <button
                  type="button"
                  onClick={handleWhatsAppContact}
                  className="flex-1 min-w-[150px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0b0f17] hover:bg-black text-white font-bold text-xs border border-pink-500/40 hover:border-pink-500 shadow-md transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-pink-500" />
                  <span>Liberar no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestartPreview}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rever Prévia (2 min)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Episode Selector */}
      {hasEpisodes && series.episodes && series.episodes.length > 0 && (
        <div className="bg-[#0b0f17] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-xs sm:text-sm text-white flex items-center gap-2">
              <ListVideo className="w-4 h-4 text-pink-500" />
              <span>Episódios da Série ({series.episodes.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Selecione o episódio para assistir
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            {series.episodes.map((ep, idx) => {
              const isSelected = idx === activeEpisodeIndex;
              return (
                <button
                  key={ep.id || idx}
                  type="button"
                  onClick={() => setActiveEpisodeIndex(idx)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-pink-600/20 border-pink-500 text-white shadow-md shadow-pink-600/20'
                      : 'bg-black/40 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-pink-600 text-white' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {ep.episodeNumber || idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {ep.title}
                      </p>
                      {ep.durationMinutes && (
                        <p className="text-[10px] text-slate-400">
                          {ep.durationMinutes} min
                        </p>
                      )}
                    </div>
                  </div>

                  <Play className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'fill-pink-500 text-pink-500' : 'text-slate-500'}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Series Info & Primary Callout */}
      <div className="bg-[#0b0f17] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-red-500 font-bold">{series.category}</span>
            <span aria-hidden="true">·</span>
            <span>{series.durationMinutes} min</span>
            <span aria-hidden="true">·</span>
            <span>{hasEpisodes && series.episodes ? `${series.episodes.length} Episódios` : 'Episódio Único Compilado'}</span>
          </div>

          <h1 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">
            {series.title}
          </h1>
          <p className="text-xs text-slate-300 line-clamp-2 max-w-2xl">
            {series.synopsis || series.tagline}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {/* Tenho interesse Button */}
          <button
            type="button"
            onClick={handleWhatsAppInterest}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Tenho interesse</span>
          </button>

          {!isUnlocked ? (
            <button
              type="button"
              onClick={onUnlockRequested}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Liberar no Pix por R$ 5,00</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-pink-500" />
              <span>Acesso Completo Liberado</span>
            </div>
          )}
        </div>
      </div>

      {/* Smart TV Modal */}
      <SmartTvModal
        isOpen={isTvModalOpen}
        onClose={() => setIsTvModalOpen(false)}
        series={series}
        currentEpisode={currentEpisode}
        videoUrl={parsedVideo.url}
        videoElement={videoRef.current}
      />
    </div>
  );
};
