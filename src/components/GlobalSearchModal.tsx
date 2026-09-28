import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Mic,
  MicOff,
  Loader2,
  MessageCircle,
  Play,
  Film,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Series } from '../types/series';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesList: Series[];
  onSelectLocalSeries: (series: Series) => void;
  whatsappNumber: string;
}

interface TVShowResult {
  id: number;
  name: string;
  year?: string;
  genres?: string[];
  poster?: string;
  summary?: string;
  isLocal?: boolean;
  localSeries?: Series;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  seriesList,
  onSelectLocalSeries,
  whatsappNumber,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<TVShowResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Microphone audio transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setResults([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Perform search against local series + Global Internet TV Database (TVMaze)
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);

      // 1. Local series match
      const localMatches: TVShowResult[] = seriesList
        .filter(
          (s) =>
            s.title.toLowerCase().includes(trimmed.toLowerCase()) ||
            s.category.toLowerCase().includes(trimmed.toLowerCase())
        )
        .map((s) => ({
          id: -Math.abs(s.id.charCodeAt(0) * 100),
          name: s.title,
          year: String(s.year),
          genres: [s.category],
          poster: s.coverUrl,
          summary: s.tagline,
          isLocal: true,
          localSeries: s,
        }));

      // 2. Global Internet Series Database (TVMaze API - open, free, CORS-enabled)
      let webMatches: TVShowResult[] = [];
      try {
        const response = await fetch(
          `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(trimmed)}`
        );
        if (response.ok) {
          const data = await response.json();
          webMatches = data.slice(0, 15).map((item: any) => ({
            id: item.show?.id || Math.random(),
            name: item.show?.name || 'Série',
            year: item.show?.premiered ? item.show.premiered.split('-')[0] : '',
            genres: item.show?.genres || [],
            poster: item.show?.image?.medium || item.show?.image?.original,
            summary: item.show?.summary ? item.show.summary.replace(/<[^>]*>?/gm, '') : '',
            isLocal: false,
          }));
        }
      } catch (err) {
        console.warn('TVMaze search error:', err);
      }

      // Combine results: local first, then global internet series
      const combined = [...localMatches, ...webMatches];
      setResults(combined);
      setIsLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, seriesList]);

  // Voice search transcription using gemini-3.5-transcribe
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setIsTranscribing(true);

          try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Audio = reader.result as string;
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Audio }),
              });
              if (res.ok) {
                const data = await res.json();
                if (data.text) {
                  setSearchTerm(data.text);
                }
              }
              setIsTranscribing(false);
            };
          } catch (e) {
            console.warn('Voice transcription error:', e);
            setIsTranscribing(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Microphone error:', err);
      }
    }
  };

  // Open WhatsApp directly with the series requested
  const handleRequestOnWhatsApp = (seriesName: string) => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const message = encodeURIComponent(
      `Olá! Estava navegando no Cineflix e gostaria de solicitar acesso à série "${seriesName}". Como posso adquirir?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-12 sm:pt-16 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0b0f17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Header Bar */}
        <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center gap-3">
          <div className="relative flex-1 flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquise qualquer série do mundo..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder:text-slate-500 focus:border-pink-500 focus:outline-none transition-colors"
            />
            {/* Mic voice search button */}
            <button
              type="button"
              onClick={toggleRecording}
              title={isRecording ? 'Parar gravação' : 'Pesquisar com voz (IA)'}
              className={`absolute right-3 p-1.5 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-pink-500 text-white animate-pulse'
                  : isTranscribing
                  ? 'text-pink-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Quick hint */}
        <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {isRecording
              ? '🔴 Ouvindo sua voz... Fale o nome da série'
              : isTranscribing
              ? '✨ Transcrevendo áudio com Gemini 3.5...'
              : 'Digite qualquer série nacional ou internacional'}
          </span>
          {results.length > 0 && (
            <span className="text-slate-300 font-mono">{results.length} encontradas</span>
          )}
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <span className="text-xs">Buscando séries na rede mundial...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all gap-3"
              >
                {/* Poster & Info */}
                <div className="flex items-center gap-3 truncate">
                  <div className="w-14 h-18 sm:w-16 sm:h-20 bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film className="w-6 h-6 text-slate-600" />
                    )}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                      {item.year && (
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          ({item.year})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {item.isLocal ? (
                        <span className="px-1.5 py-0.5 rounded bg-pink-600/20 text-pink-400 text-[10px] font-bold border border-pink-500/30">
                          Disponível no Mini Novelas
                        </span>
                      ) : (
                        <span className="text-slate-400 truncate">
                          {item.genres?.slice(0, 2).join(', ') || 'Série Internacional'}
                        </span>
                      )}
                    </div>

                    {item.summary && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 max-w-md hidden sm:block">
                        {item.summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Direct Action Button */}
                <div className="shrink-0">
                  {item.isLocal && item.localSeries ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLocalSeries(item.localSeries!);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Assistir</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestOnWhatsApp(item.name)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-xl border border-pink-500/40 hover:border-pink-500 shadow-md transition-all active:scale-95 whitespace-nowrap"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-pink-500" />
                      <span>Pedir no WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : searchTerm ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <p className="text-xs">Nenhuma série encontrada com "{searchTerm}".</p>
              <button
                type="button"
                onClick={() => handleRequestOnWhatsApp(searchTerm)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-xl border border-pink-500/40 hover:border-pink-500 transition-all shadow-md"
              >
                <MessageCircle className="w-4 h-4 text-pink-500" />
                <span>Pedir "{searchTerm}" pelo WhatsApp</span>
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Film className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-xs text-slate-400">
                Pesquise por títulos como <em>Stranger Things</em>, <em>Breaking Bad</em>, <em>Suits</em> ou temas...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
