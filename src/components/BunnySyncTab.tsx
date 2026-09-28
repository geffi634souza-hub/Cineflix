import React, { useState, useEffect } from 'react';
import {
  Radio,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  FileVideo,
  Shield,
  ExternalLink,
  Save,
  Check,
  Eye,
  Sliders,
  HelpCircle,
  Film,
  Plus,
  ArrowRight,
  Info,
  Clock,
  Database,
} from 'lucide-react';
import { Series, Episode } from '../types/series';
import { analyzeVideoFileName, ParsedFileInfo } from '../utils/titleParser';
import { getStoredBunnyConfig, saveStoredBunnyConfig, BunnyConfig } from '../utils/bunnyUtils';

interface BunnySyncTabProps {
  seriesList: Series[];
  onAddSeries: (newSeries: Series) => void;
  onUpdateSeries: (updatedSeries: Series) => void;
  onPreviewSeries?: (series: Series) => void;
}

interface SyncedItem {
  id: string;
  guid: string;
  objectName: string;
  length: number;
  publicUrl: string;
  format: 'mp4' | 'hls';
  isHls: boolean;
  isSimulated?: boolean;
  analysis: ParsedFileInfo;
  // User editable review fields
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  genre: string;
  language: string;
  synopsis: string;
  tagline: string;
  coverUrl: string;
  status: 'published' | 'draft';
  targetSeriesId: 'new' | string; // 'new' or existing series ID
  selected: boolean;
  isImported?: boolean;
}

export const BunnySyncTab: React.FC<BunnySyncTabProps> = ({
  seriesList,
  onAddSeries,
  onUpdateSeries,
  onPreviewSeries,
}) => {
  // Bunny Credentials Configuration
  const [bunnyConfig, setBunnyConfig] = useState<BunnyConfig>(() => getStoredBunnyConfig());
  const [storageRegion, setStorageRegion] = useState<string>('default');
  const [streamLibraryId, setStreamLibraryId] = useState<string>('');
  const [folderPath, setFolderPath] = useState<string>('');
  const [isConfigSaved, setIsConfigSaved] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [syncedItems, setSyncedItems] = useState<SyncedItem[]>([]);

  // AI & Analysis Options - ENABLED by default for automatic poster and metadata
  const [useGeminiAi, setUseGeminiAi] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState<string | null>(null);

  // Review & Testing Modal/State
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Load stored settings on mount
  useEffect(() => {
    const config = getStoredBunnyConfig();
    setBunnyConfig(config);
  }, []);

  const handleSaveConfig = () => {
    saveStoredBunnyConfig(bunnyConfig);
    setIsConfigSaved(true);
    setTimeout(() => setIsConfigSaved(false), 3000);
  };

  // Enhance a single item with Gemini AI & Google Search
  const handleEnhanceWithGemini = async (item: SyncedItem) => {
    setIsAiProcessing(item.id);
    try {
      const res = await fetch('/api/bunny/smart-identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: item.objectName,
          metadata: {
            format: item.format,
            isHls: item.isHls,
            length: item.length,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha na resposta do Gemini');
      }

      const aiData = await res.json();

      setSyncedItems((prev) =>
        prev.map((it) => {
          if (it.id === item.id) {
            return {
              ...it,
              title: aiData.cleanTitle || it.title,
              seasonNumber: aiData.seasonNumber || it.seasonNumber,
              episodeNumber: aiData.episodeNumber || it.episodeNumber,
              genre: aiData.genre || it.genre,
              synopsis: aiData.synopsis || it.synopsis,
              tagline: aiData.tagline || it.tagline,
              coverUrl: aiData.suggestedCoverUrl || it.coverUrl,
              analysis: {
                ...it.analysis,
                cleanTitle: aiData.cleanTitle || it.analysis.cleanTitle,
                suggestedCoverUrl: aiData.suggestedCoverUrl || it.analysis.suggestedCoverUrl,
                confidenceScore: aiData.confidenceScore || 95,
                confidenceLevel: aiData.confidenceLevel || 'high',
              },
            };
          }
          return it;
        })
      );
    } catch (error: any) {
      console.warn('Gemini enhancement notice:', error);
    } finally {
      setIsAiProcessing(null);
    }
  };

  // Batch enhance items with Gemini AI
  const handleEnhanceBatchWithGemini = async (items: SyncedItem[]) => {
    for (const item of items) {
      await handleEnhanceWithGemini(item);
    }
  };

  // Perform Synchronization with Bunny Storage Zone / Stream
  const handleSyncVideos = async (testMode = false, singleFileTest = false) => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMessage(null);
    setImportFeedback(null);

    try {
      const response = await fetch('/api/bunny/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storageZoneName: bunnyConfig.storageZoneName || '',
          apiKey: bunnyConfig.apiKey || '',
          pullZoneUrl: bunnyConfig.pullZoneUrl || '',
          storageRegion,
          streamLibraryId,
          folderPath,
          testMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao consultar Bunny.net');
      }

      let files = data.files || [];
      if (singleFileTest && files.length > 0) {
        files = [files[0]];
      }

      if (files.length === 0) {
        setSyncSuccessMessage('Nenhum arquivo de vídeo novo encontrado na pasta informada.');
        setSyncedItems([]);
        setIsSyncing(false);
        return;
      }

      // Run Local Heuristic Identification for each file
      const prepared: SyncedItem[] = files.map((file: any) => {
        const analysis = analyzeVideoFileName(file.objectName, seriesList, file.publicUrl);
        return {
          id: `sync_${file.guid || Math.random().toString(36).substring(7)}`,
          guid: file.guid,
          objectName: file.objectName,
          length: file.length,
          publicUrl: file.publicUrl,
          format: file.format,
          isHls: file.isHls,
          isSimulated: file.isSimulated,
          analysis,
          title: analysis.cleanTitle,
          seasonNumber: analysis.seasonNumber,
          episodeNumber: analysis.episodeNumber,
          genre: analysis.detectedGenre,
          language: analysis.detectedLanguage,
          synopsis: analysis.synopsisSuggestion,
          tagline: analysis.taglineSuggestion,
          coverUrl: file.thumbnailUrl || analysis.suggestedCoverUrl,
          status: 'published',
          targetSeriesId: analysis.matchingSeriesId ? analysis.matchingSeriesId : 'new',
          selected: !analysis.isDuplicate,
        };
      });

      setSyncedItems(prepared);
      const newCount = prepared.filter((p) => !p.analysis.isDuplicate).length;
      const dupCount = prepared.filter((p) => p.analysis.isDuplicate).length;

      setSyncSuccessMessage(
        `Sincronização concluída! ${newCount} novo(s) arquivo(s) prontos.${
          useGeminiAi ? ' Buscando capas e dados no Google com IA automaticamente...' : ''
        }${dupCount > 0 ? ` (${dupCount} já cadastrado(s))` : ''}`
      );

      // Auto-enhance with Gemini + Google Search if enabled
      if (useGeminiAi) {
        const toEnhance = prepared.filter((p) => !p.analysis.isDuplicate);
        if (toEnhance.length > 0) {
          handleEnhanceBatchWithGemini(toEnhance);
        }
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Erro de comunicação ao sincronizar vídeos.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Import individual or batch items into the active catalog
  const handleExecuteImport = (itemsToImport: SyncedItem[]) => {
    if (itemsToImport.length === 0) return;

    let addedSeriesCount = 0;
    let addedEpisodesCount = 0;

    itemsToImport.forEach((item) => {
      // Case A: Add as Episode to an Existing Series
      if (item.targetSeriesId !== 'new') {
        const existing = seriesList.find((s) => s.id === item.targetSeriesId);
        if (existing) {
          const newEpisode: Episode = {
            id: `ep-${Date.now()}-${item.episodeNumber}`,
            episodeNumber: item.episodeNumber,
            seasonNumber: item.seasonNumber,
            title: item.title,
            videoUrl: item.publicUrl,
            durationMinutes: item.length ? Math.max(1, Math.round(item.length / 1024 / 1024 / 2)) : 3,
            synopsis: item.synopsis,
            aspectRatio: '9:16',
          };

          const existingEpisodes = existing.episodes || [];
          const updatedEpisodes = [...existingEpisodes, newEpisode].sort((a, b) => {
            const seasonDiff = (a.seasonNumber || 1) - (b.seasonNumber || 1);
            if (seasonDiff !== 0) return seasonDiff;
            return a.episodeNumber - b.episodeNumber;
          });

          onUpdateSeries({
            ...existing,
            episodes: updatedEpisodes,
          });
          addedEpisodesCount++;
          return;
        }
      }

      // Case B: Create as a brand-new Series with 1st episode
      const newSeriesId = `series-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newEpisode: Episode = {
        id: `ep-${Date.now()}-1`,
        episodeNumber: item.episodeNumber,
        seasonNumber: item.seasonNumber,
        title: item.title,
        videoUrl: item.publicUrl,
        durationMinutes: 4,
        synopsis: item.synopsis,
        aspectRatio: '9:16',
      };

      const newSeries: Series = {
        id: newSeriesId,
        title: item.title,
        tagline: item.tagline,
        synopsis: item.synopsis,
        hook: item.tagline,
        upsellPitch: 'Desbloqueie todos os episódios completos da série sem travas pelo Pix!',
        category: item.genre,
        year: new Date().getFullYear(),
        durationMinutes: 45,
        rating: '12+',
        coverUrl: item.coverUrl,
        videoUrl: item.publicUrl,
        previewLimitSeconds: 120,
        price: 5,
        promoPrice: 5,
        checkoutUrl: 'https://pay.hotmart.com/example-novela',
        isUnlockedDefault: false,
        badges: [
          item.isHls ? 'HLS STREAM' : 'BUNNY CDN',
          item.genre.toUpperCase(),
          'MINI NOVELA',
        ],
        aspectRatio: '9:16',
        status: item.status,
        seasonsCount: item.seasonNumber,
        fakeViewers: 2400 + Math.floor(Math.random() * 800),
        episodes: [newEpisode],
        chapters: [
          { id: 'ch1', title: '01. Início', timestamp: '00:00', seconds: 0 },
        ],
      };

      onAddSeries(newSeries);
      addedSeriesCount++;
    });

    // Mark as imported in local view
    const importedIds = new Set(itemsToImport.map((i) => i.id));
    setSyncedItems((prev) =>
      prev.map((i) => (importedIds.has(i.id) ? { ...i, isImported: true, selected: false } : i))
    );

    setImportFeedback(
      `Sucesso! ${addedSeriesCount} série(s) nova(s) e ${addedEpisodesCount} episódio(s) adicionados ao catálogo com links seguros da Bunny!`
    );
  };

  const selectedItems = syncedItems.filter((i) => i.selected && !i.isImported);

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner / Objective */}
      <div className="bg-gradient-to-r from-orange-950/40 via-red-950/30 to-[#0b0f17] border border-orange-500/30 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Importação Inteligente Bunny.net</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-mono uppercase">
                  Sem Custos Extras
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Envie vídeos para o Bunny e sincronize com 1 clique para gerar títulos limpos, sinopses, capas e episódios automáticos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
              <span>Como Configurar</span>
            </button>
          </div>
        </div>

        {/* Expandable Setup Instructions */}
        {showConfigHelp && (
          <div className="mt-3 p-4 rounded-xl bg-black/60 border border-white/10 text-xs text-slate-300 space-y-2 animate-in fade-in">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-orange-400" />
              <span>Instruções Passo a Passo para Sincronização Segura</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>
                <strong>Acesse o Painel do Bunny:</strong> Vá em <span className="text-orange-400">Storage</span> no menu esquerdo do bunny.net.
              </li>
              <li>
                <strong>Nome da Storage Zone:</strong> Digite o nome da sua Storage Zone exatamente como criado no Bunny.
              </li>
              <li>
                <strong>Chave de Acesso (AccessKey):</strong> Clique na sua Storage Zone &gt; <em>FTP &amp; API Access</em> e copie a <em>Password / API Key</em>. Suas credenciais ficam 100% protegidas no backend.
              </li>
              <li>
                <strong>Pull Zone CDN:</strong> Endereço do seu domínio CDN (ex: <code className="text-orange-300">https://meu-canal.b-cdn.net</code>). Seus links continuarão funcionando normalmente.
              </li>
              <li>
                <strong>HLS (.m3u8) &amp; MP4:</strong> O sistema detecta automaticamente se o arquivo é MP4 ou HLS e preserva os links sem tentar converter .m3u8 para MP4.
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Bunny Credentials Configuration Card */}
      <div className="bg-[#10141e] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-400" />
            <h4 className="text-sm font-bold text-white">Configuração da Storage Zone &amp; CDN</h4>
          </div>
          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-95"
          >
            {isConfigSaved ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isConfigSaved ? 'Salvo!' : 'Salvar Dados'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Nome da Storage Zone
            </label>
            <input
              type="text"
              value={bunnyConfig.storageZoneName || ''}
              onChange={(e) => setBunnyConfig({ ...bunnyConfig, storageZoneName: e.target.value })}
              placeholder="ex: mini-novelas-storage"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Chave de Acesso (AccessKey / Password)
            </label>
            <input
              type="password"
              value={bunnyConfig.apiKey || ''}
              onChange={(e) => setBunnyConfig({ ...bunnyConfig, apiKey: e.target.value })}
              placeholder="Chave secreta da Storage Zone"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:border-orange-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Pull Zone CDN (URL Pública)
            </label>
            <input
              type="url"
              value={bunnyConfig.pullZoneUrl || ''}
              onChange={(e) => setBunnyConfig({ ...bunnyConfig, pullZoneUrl: e.target.value })}
              placeholder="https://seu-pullzone.b-cdn.net"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:border-orange-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Região de Armazenamento
            </label>
            <select
              value={storageRegion}
              onChange={(e) => setStorageRegion(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="default">Principal (Falkenstein / Europa)</option>
              <option value="br">São Paulo, Brasil (br.storage.bunnycdn.com)</option>
              <option value="ny">Nova York, EUA (ny.storage.bunnycdn.com)</option>
              <option value="la">Los Angeles, EUA (la.storage.bunnycdn.com)</option>
              <option value="sg">Singapura, Ásia (sg.storage.bunnycdn.com)</option>
              <option value="syd">Sydney, Oceania (syd.storage.bunnycdn.com)</option>
              <option value="uk">Londres, Reino Unido (uk.storage.bunnycdn.com)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Pasta Opcional (Subdiretório)
            </label>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="ex: series ou videos"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              ID de Biblioteca Bunny Stream (Opcional)
            </label>
            <input
              type="text"
              value={streamLibraryId}
              onChange={(e) => setStreamLibraryId(e.target.value)}
              placeholder="Se usar Bunny Stream Library"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:border-orange-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* AI & Local Rules Option */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/5">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={useGeminiAi}
              onChange={(e) => setUseGeminiAi(e.target.checked)}
              className="w-4 h-4 accent-red-600 rounded bg-black/40 border-white/20"
            />
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Ativar refino inteligente com Gemini (Plano Gratuito)</span>
            </span>
          </label>

          <span className="text-[11px] text-slate-400">
            Prioriza análise local de nomes e metadados para máxima economia.
          </span>
        </div>
      </div>

      {/* Sync Execution Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Sync Button */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleSyncVideos(false, false)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando Arquivos...' : 'Sincronizar vídeos'}</span>
          </button>

          {/* Test with 1 Single Video */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleSyncVideos(false, true)}
            className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white border border-white/10 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            title="Sincronizar e testar apenas 1 vídeo antes de importar vários arquivos"
          >
            <FileVideo className="w-3.5 h-3.5 text-orange-400" />
            <span>Testar com 1 Vídeo</span>
          </button>

          {/* Test Demonstration Mode (without credentials) */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleSyncVideos(true, false)}
            className="px-3 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            title="Demonstrar o fluxo completo de sincronização e importação com dados de exemplo"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Demonstração de Teste</span>
          </button>
        </div>

        {selectedItems.length > 0 && (
          <button
            type="button"
            onClick={() => handleExecuteImport(selectedItems)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Importar e Publicar Selecionados ({selectedItems.length})</span>
          </button>
        )}
      </div>

      {/* Sync Error Banner */}
      {syncError && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl flex items-start gap-3 text-xs text-red-200 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-red-300">Falha ao sincronizar com o Bunny</h5>
            <p>{syncError}</p>
            <p className="text-slate-400">
              Dica: Você pode clicar em &quot;Demonstração de Teste&quot; para validar o fluxo de importação automática imediatamente.
            </p>
          </div>
        </div>
      )}

      {/* Sync Success Banner */}
      {syncSuccessMessage && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-xs text-emerald-200 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* Import Feedback */}
      {importFeedback && (
        <div className="p-3.5 bg-blue-950/40 border border-blue-500/40 rounded-2xl flex items-center gap-3 text-xs text-blue-200 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{importFeedback}</span>
        </div>
      )}

      {/* Review Screen (Tela de Revisão antes da Publicação) */}
      {syncedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-red-500" />
              <h4 className="text-sm font-bold text-white">
                Revisão de Arquivos Sincronizados ({syncedItems.length})
              </h4>
            </div>
            <span className="text-xs text-slate-400">
              Revise e edite qualquer campo antes de cadastrar no catálogo
            </span>
          </div>

          <div className="space-y-4">
            {syncedItems.map((item, idx) => {
              const isHighConf = item.analysis.confidenceLevel === 'high';
              const isMedConf = item.analysis.confidenceLevel === 'medium';

              return (
                <div
                  key={item.id}
                  className={`bg-[#0d121c] border rounded-2xl p-4 sm:p-5 transition-all space-y-4 ${
                    item.isImported
                      ? 'border-emerald-500/30 opacity-70 bg-emerald-950/10'
                      : item.analysis.isDuplicate
                      ? 'border-amber-500/20 bg-amber-950/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={item.isImported}
                        checked={item.selected}
                        onChange={(e) =>
                          setSyncedItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, selected: e.target.checked } : it))
                          )
                        }
                        className="w-4 h-4 accent-red-600 rounded bg-black/40 border-white/20 cursor-pointer"
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {idx + 1}. {item.objectName}
                          </span>
                          {item.isHls ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-600/20 text-amber-400 border border-amber-500/30">
                              HLS (.m3u8)
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                              MP4
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {item.length ? `${(item.length / 1024 / 1024).toFixed(1)} MB` : 'Stream Bunny'}{' '}
                          • {item.analysis.resolutionGuess || '1080p'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Confidence Score Pill */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                          isHighConf
                            ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                            : isMedConf
                            ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                            : 'bg-red-600/20 border-red-500/40 text-red-400'
                        }`}
                        title="Indicador de confiança na identificação automática do nome do arquivo"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isHighConf ? 'bg-emerald-400' : isMedConf ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <span>Confiança {item.analysis.confidenceScore}%</span>
                      </span>

                      {/* AI Enhancement Button */}
                      <button
                        type="button"
                        disabled={Boolean(isAiProcessing)}
                        onClick={() => handleEnhanceWithGemini(item)}
                        className="px-2.5 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Usar Gemini gratuito para enriquecer título e sinopse"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isAiProcessing === item.id ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">IA Gemini</span>
                      </button>

                      {/* Duplicate or Imported Badge */}
                      {item.isImported ? (
                        <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Importado</span>
                        </span>
                      ) : item.analysis.isDuplicate ? (
                        <span className="text-xs px-2.5 py-1 rounded-xl bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold">
                          Já no Catálogo
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Card Content & Editable Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Cover Preview & Customizer */}
                    <div className="md:col-span-1 space-y-2">
                      <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black/60 border border-white/10 group shadow-md max-w-[140px] mx-auto md:max-w-none">
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            // Fallback if image fails
                            (e.target as any).src = 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?q=80&w=1000&auto=format&fit=crop';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                          <span className="text-[10px] font-bold text-white font-mono uppercase bg-black/60 px-1.5 py-0.5 rounded">
                            {item.analysis.hasEpisodeInfo ? `T${item.seasonNumber} : E${item.episodeNumber}` : 'Episódio Único'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 font-semibold mb-0.5">
                          URL da Capa (Comercial / Original)
                        </label>
                        <input
                          type="url"
                          value={item.coverUrl}
                          onChange={(e) =>
                            setSyncedItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, coverUrl: e.target.value } : it))
                            )
                          }
                          className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    {/* Metadata Form Fields */}
                    <div className="md:col-span-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                            Título da Série / Episódio
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              setSyncedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, title: e.target.value } : it))
                              )
                            }
                            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-semibold focus:border-red-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                            Gênero / Categoria
                          </label>
                          <select
                            value={item.genre}
                            onChange={(e) =>
                              setSyncedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, genre: e.target.value } : it))
                              )
                            }
                            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-pink-500 focus:outline-none"
                          >
                            <option value="Mini Novelas & Drama">Mini Novelas & Drama</option>
                            <option value="Finanças & Negócios">Finanças & Negócios</option>
                            <option value="Neurociência & Foco">Neurociência & Foco</option>
                            <option value="Cinema & Direção">Cinema & Direção</option>
                            <option value="Suspense & Mistério">Suspense & Mistério</option>
                            <option value="Romance & Emoção">Romance & Emoção</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                            Temporada
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.seasonNumber}
                            onChange={(e) =>
                              setSyncedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, seasonNumber: parseInt(e.target.value, 10) || 1 } : it))
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono focus:border-pink-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                            Episódio
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.episodeNumber}
                            onChange={(e) =>
                              setSyncedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, episodeNumber: parseInt(e.target.value, 10) || 1 } : it))
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono focus:border-pink-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                            Destino do Cadastro
                          </label>
                          <select
                            value={item.targetSeriesId}
                            onChange={(e) =>
                              setSyncedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, targetSeriesId: e.target.value } : it))
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-pink-500 focus:outline-none"
                          >
                            <option value="new">Nova Série no Catálogo</option>
                            {seriesList.map((s) => (
                              <option key={s.id} value={s.id}>
                                Episódio de: {s.title.slice(0, 22)}...
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                            Status
                          </label>
                          <select
                            value={item.status}
                            onChange={(e) =>
                              setSyncedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, status: e.target.value as any } : it))
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-pink-500 focus:outline-none"
                          >
                            <option value="published">Publicado</option>
                            <option value="draft">Rascunho</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                          Sinopse Verificada
                        </label>
                        <textarea
                          rows={2}
                          value={item.synopsis}
                          onChange={(e) =>
                            setSyncedItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, synopsis: e.target.value } : it))
                            )
                          }
                          className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:border-pink-500 focus:outline-none resize-none"
                        />
                      </div>

                      {/* Video Link & Test Action */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono overflow-hidden text-ellipsis max-w-sm">
                          <span className="text-orange-400 font-bold shrink-0">Link:</span>
                          <span className="truncate">{item.publicUrl}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActivePreviewUrl(activePreviewUrl === item.publicUrl ? null : item.publicUrl)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-white flex items-center gap-1 transition-colors"
                          >
                            <Play className="w-3 h-3 text-pink-500" />
                            <span>{activePreviewUrl === item.publicUrl ? 'Fechar Vídeo' : 'Testar Vídeo'}</span>
                          </button>

                          {!item.isImported && (
                            <button
                              type="button"
                              onClick={() => handleExecuteImport([item])}
                              className="px-3 py-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-pink-600/30 active:scale-95 flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Importar Este Vídeo</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* In-place Video Test Player */}
                      {activePreviewUrl === item.publicUrl && (
                        <div className="mt-2 p-3 bg-black rounded-xl border border-pink-500/30 space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Play className="w-3.5 h-3.5 text-pink-500" />
                              <span>Teste de Reprodução Bunny Stream</span>
                            </span>
                            <span className="text-[11px] font-mono text-orange-400">
                              {item.isHls ? 'Stream HLS .m3u8' : 'Arquivo Direto MP4'}
                            </span>
                          </div>

                          <video
                            src={item.publicUrl}
                            controls
                            playsInline
                            className="w-full max-h-48 rounded-lg bg-black object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
