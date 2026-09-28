import React, { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Shield,
  Layers,
  HelpCircle,
  ExternalLink,
  Save,
  Radio,
} from 'lucide-react';
import {
  BunnyConfig,
  getStoredBunnyConfig,
  saveStoredBunnyConfig,
  diagnoseVideoUrl,
  BunnyUrlDiagnostic,
} from '../utils/bunnyUtils';

export const BunnyConfigTab: React.FC = () => {
  const [config, setConfig] = useState<BunnyConfig>(getStoredBunnyConfig);
  const [testUrl, setTestUrl] = useState('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  const [diagnostic, setDiagnostic] = useState<BunnyUrlDiagnostic | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    handleRunDiagnosis(testUrl);
  }, []);

  const handleSaveConfig = () => {
    saveStoredBunnyConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleRunDiagnosis = async (urlToTest: string) => {
    if (!urlToTest.trim()) return;
    setIsDiagnosing(true);
    const result = await diagnoseVideoUrl(urlToTest);
    setDiagnostic(result);
    setIsDiagnosing(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 text-slate-200 font-sans">
      {/* Overview Card */}
      <div className="bg-[#0b0f17] border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-500 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-base">
              Hospedagem & CDN Bunny.net (Bunny Stream)
            </h3>
            <p className="text-xs text-slate-400">
              Configure os pontos de extremidade da CDN e valide a compatibilidade de manifestos HLS (.m3u8) para Smart TVs e celulares.
            </p>
          </div>
        </div>
      </div>

      {/* URL Diagnostic & Tester */}
      <div className="bg-[#0b0f17] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-orange-400" />
            <span>Verificador de URL de Streaming Bunny</span>
          </h4>
          <span className="text-[11px] text-slate-400">Testa HTTPS, HLS, CORS e Range</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://seu-pullzone.b-cdn.net/.../playlist.m3u8"
            className="flex-1 px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-orange-500"
          />
          <button
            type="button"
            disabled={isDiagnosing}
            onClick={() => handleRunDiagnosis(testUrl)}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 shrink-0"
          >
            {isDiagnosing ? 'Testando...' : 'Diagnosticar URL'}
          </button>
        </div>

        {/* Diagnosis Results Box */}
        {diagnostic && (
          <div className="bg-black/50 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Status do Stream:</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                diagnostic.isValidUrl && diagnostic.isHttps
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {diagnostic.statusText}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-slate-400 text-[10px] block">Protocolo HTTPS</span>
                <span className={diagnostic.isHttps ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {diagnostic.isHttps ? 'Ativo ✓' : 'Inseguro (HTTP) ✕'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-slate-400 text-[10px] block">Formato de Mídia</span>
                <span className={diagnostic.isHls ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                  {diagnostic.isHls ? 'HLS (.m3u8)' : diagnostic.isMp4 ? 'Vídeo MP4' : 'Outro'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-slate-400 text-[10px] block">HTTP Range (206)</span>
                <span className={diagnostic.supportsRange ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {diagnostic.supportsRange ? 'Suportado ✓' : 'Padrão 200 OK'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-slate-400 text-[10px] block">Acesso CORS</span>
                <span className={diagnostic.corsEnabled !== false ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {diagnostic.corsEnabled !== false ? 'Habilitado ✓' : 'Bloqueado ⚠️'}
                </span>
              </div>
            </div>

            {/* Warning if any */}
            {diagnostic.warning && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{diagnostic.warning}</span>
              </div>
            )}

            {/* Recommendations */}
            {diagnostic.recommendations.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Boas Práticas de Entrega:
                </span>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {diagnostic.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Storage and CDN Settings Form */}
      <div className="bg-[#0b0f17] border border-white/10 rounded-2xl p-5 space-y-4">
        <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Configurações Privadas da sua Conta Bunny (Salvas Localmente)</span>
        </h4>
        <p className="text-xs text-slate-400">
          Essas credenciais são mantidas exclusivamente no armazenamento persistente do seu navegador de administrador e nunca são expostas publicamente para os visitantes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Pull Zone / Hostname da CDN
            </label>
            <input
              type="text"
              value={config.pullZoneUrl || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, pullZoneUrl: e.target.value }))}
              placeholder="https://sua-zona.b-cdn.net"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Nome da Storage Zone
            </label>
            <input
              type="text"
              value={config.storageZoneName || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, storageZoneName: e.target.value }))}
              placeholder="cineflix-videos"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-300">
              API Access Key / Storage Password (Opcional para upload direto)
            </label>
            <input
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Chave de API do Bunny Storage..."
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Você pode cadastrar diretamente links .m3u8 do Bunny Stream nos episódios a qualquer momento.
          </span>

          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-600/30 transition-all active:scale-95"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Configuração Salva!' : 'Salvar Configuração'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
