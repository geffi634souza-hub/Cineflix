import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileVideo,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Play,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { inspectFile, InspectedFile } from '../utils/fileMetadata';
import { Episode, Series } from '../types/series';

interface DropzoneUploadAreaProps {
  onSeriesGeneratedFromFiles: (seriesData: Partial<Series>) => void;
  onEpisodeGeneratedFromFile: (episode: Episode) => void;
}

export const DropzoneUploadArea: React.FC<DropzoneUploadAreaProps> = ({
  onSeriesGeneratedFromFiles,
  onEpisodeGeneratedFromFile,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [inspectedFiles, setInspectedFiles] = useState<InspectedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setUploadProgress(15);

    const newInspected: InspectedFile[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const inspected = await inspectFile(fileArray[i]);
      newInspected.push(inspected);
      setUploadProgress(Math.round(15 + ((i + 1) / fileArray.length) * 75));
    }

    setInspectedFiles((prev) => [...prev, ...newInspected]);
    setTimeout(() => {
      setUploadProgress(null);
      setIsProcessing(false);
    }, 400);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    setInspectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Build Series draft proposal from analyzed files
  const handleAutoBuildSeries = () => {
    if (inspectedFiles.length === 0) return;

    // Detect primary cover image (prefer vertical or first image)
    const images = inspectedFiles.filter((f) => f.fileType === 'image');
    const videos = inspectedFiles.filter((f) => f.fileType === 'video');
    const subtitles = inspectedFiles.filter((f) => f.fileType === 'subtitle');

    const primaryCover = images[0]?.thumbnailUrl || images[0]?.previewBlobUrl || videos[0]?.thumbnailUrl || '';
    const bannerCover = images.find((i) => i.aspectRatioLabel === '16:9')?.thumbnailUrl || primaryCover;
    const defaultSubtitle = subtitles[0]?.convertedSubtitleUrl;

    // Generate episodes list from analyzed videos
    const generatedEpisodes: Episode[] = videos.map((v, idx) => {
      const cleanTitle = v.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      return {
        id: `ep-gen-${Date.now()}-${idx}`,
        episodeNumber: idx + 1,
        seasonNumber: 1,
        title: cleanTitle,
        videoUrl: v.previewBlobUrl || '',
        subtitleUrl: defaultSubtitle,
        durationMinutes: v.durationSeconds ? Math.ceil(v.durationSeconds / 60) : 5,
        resolution: v.width && v.height ? `${v.width}x${v.height}` : undefined,
        aspectRatio: v.aspectRatioLabel === '9:16' ? '9:16' : '16:9',
      };
    });

    const isVerticalNovel = videos.some((v) => v.aspectRatioLabel === '9:16');
    const firstTitle = videos[0] ? videos[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Nova Série';

    const seriesData: Partial<Series> = {
      title: firstTitle,
      category: isVerticalNovel ? 'Mini Novelas & Drama' : 'Séries Exclusivas',
      coverUrl: primaryCover,
      bannerUrl: bannerCover,
      aspectRatio: isVerticalNovel ? '9:16' : '16:9',
      videoUrl: videos[0]?.previewBlobUrl || '',
      subtitleUrl: defaultSubtitle,
      durationMinutes: generatedEpisodes.reduce((acc, ep) => acc + (ep.durationMinutes || 0), 0) || 45,
      episodes: generatedEpisodes,
      status: 'draft',
      seasonsCount: 1,
      language: 'Português (BR)',
    };

    onSeriesGeneratedFromFiles(seriesData);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Visual Target */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 select-none ${
          isDragging
            ? 'border-red-500 bg-red-600/10 scale-[1.01]'
            : 'border-white/15 hover:border-red-500/50 bg-[#07090e]/60 hover:bg-[#07090e]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.srt,.vtt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center shadow-lg">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="font-display font-bold text-white text-base">
              Arraste capas, banners, vídeos e legendas aqui
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Ou clique para selecionar múltiplos arquivos simultaneamente. Leitura de resolução, proporção e duração automática.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Vídeos: MP4, MOV, MKV, WebM</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Imagens: JPG, PNG, WebP</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Legendas: SRT, VTT</span>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="absolute bottom-2 inset-x-6">
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              Inspecionando arquivos... {uploadProgress}%
            </span>
          </div>
        )}
      </div>

      {/* Inspected Files List */}
      {inspectedFiles.length > 0 && (
        <div className="bg-[#0b0f17] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-500" />
                <span>Arquivos Inspecionados ({inspectedFiles.length})</span>
              </h4>
              <p className="text-xs text-slate-400">
                Confira os metadados identificados antes de preencher o formulário.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoBuildSeries}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Preencher Cadastro com estes Arquivos</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectedFiles([])}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Limpar todos"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cards of Inspected Files */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {inspectedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-black/50 border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail or Icon */}
                  <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : file.fileType === 'video' ? (
                      <FileVideo className="w-6 h-6 text-red-500" />
                    ) : file.fileType === 'image' ? (
                      <ImageIcon className="w-6 h-6 text-blue-400" />
                    ) : (
                      <FileText className="w-6 h-6 text-emerald-400" />
                    )}

                    {file.aspectRatioLabel && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] text-center font-mono font-bold text-white">
                        {file.aspectRatioLabel}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex flex-wrap gap-1 text-[11px] text-slate-400 mt-1 font-mono">
                      <span>{file.sizeFormatted}</span>
                      <span>·</span>
                      <span className="uppercase">{file.format}</span>
                      {file.durationFormatted && (
                        <>
                          <span>·</span>
                          <span className="text-amber-400">{file.durationFormatted}</span>
                        </>
                      )}
                    </div>

                    {file.width && file.height && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {file.width}x{file.height}px
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Compatibility Warning if any */}
                {file.compatibilityWarning && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-1.5 leading-snug">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{file.compatibilityWarning}</span>
                  </div>
                )}

                {/* Action button if video: Add directly as episode */}
                {file.fileType === 'video' && (
                  <button
                    type="button"
                    onClick={() => {
                      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                      onEpisodeGeneratedFromFile({
                        id: `ep-${Date.now()}`,
                        episodeNumber: 1,
                        seasonNumber: 1,
                        title: cleanTitle,
                        videoUrl: file.previewBlobUrl || '',
                        durationMinutes: file.durationSeconds ? Math.ceil(file.durationSeconds / 60) : 5,
                        aspectRatio: file.aspectRatioLabel === '9:16' ? '9:16' : '16:9',
                        resolution: file.width && file.height ? `${file.width}x${file.height}` : undefined,
                      });
                    }}
                    className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Adicionar aos Episódios</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
