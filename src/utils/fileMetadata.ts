/**
 * Utilities for analyzing dropped files, extracting real metadata,
 * generating thumbnails, and converting subtitles.
 */

export interface InspectedFile {
  file: File;
  id: string;
  name: string;
  sizeFormatted: string;
  fileType: 'image' | 'video' | 'subtitle' | 'other';
  format: string; // e.g. "mp4", "mkv", "mov", "webm", "png", "jpg", "srt", "vtt"
  isBrowserCompatible: boolean;
  compatibilityWarning?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  durationFormatted?: string;
  aspectRatioLabel?: '9:16' | '16:9' | '1:1' | '4:3' | 'Outro';
  thumbnailUrl?: string; // Data URL or object URL
  convertedSubtitleUrl?: string; // WebVTT blob URL if SRT was converted
  previewBlobUrl?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

/**
 * Converts SRT subtitle text to standard WebVTT format
 */
export function srtToWebVtt(srtText: string): string {
  // Normalize line breaks
  let vtt = 'WEBVTT\n\n' + srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Replace comma decimal separators in timestamps: 00:01:20,500 --> 00:01:20.500
  vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  return vtt;
}

/**
 * Inspects a File object, detects type, extracts dimensions, duration, thumbnail and compatibility
 */
export async function inspectFile(file: File): Promise<InspectedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const sizeFormatted = formatFileSize(file.size);
  const id = `f-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;

  // 1. Detect Category
  let fileType: InspectedFile['fileType'] = 'other';
  if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic'].includes(ext)) {
    fileType = 'image';
  } else if (file.type.startsWith('video/') || ['mp4', 'mov', 'mkv', 'webm', 'm4v', 'avi'].includes(ext)) {
    fileType = 'video';
  } else if (['srt', 'vtt'].includes(ext) || file.type.includes('subrip') || file.type.includes('vtt')) {
    fileType = 'subtitle';
  }

  // 2. Subtitle Processing
  if (fileType === 'subtitle') {
    let convertedSubtitleUrl: string | undefined;
    try {
      const text = await file.text();
      let vttContent = text;
      if (ext === 'srt' || !text.startsWith('WEBVTT')) {
        vttContent = srtToWebVtt(text);
      }
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      convertedSubtitleUrl = URL.createObjectURL(blob);
    } catch (e) {
      console.warn('Subtitle parse error:', e);
    }

    return {
      file,
      id,
      name: file.name,
      sizeFormatted,
      fileType: 'subtitle',
      format: ext,
      isBrowserCompatible: true,
      convertedSubtitleUrl,
    };
  }

  // 3. Image Processing
  if (fileType === 'image') {
    const isStandardWeb = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    let width = 0;
    let height = 0;
    let thumbnailUrl: string | undefined;
    const blobUrl = URL.createObjectURL(file);

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          width = img.naturalWidth;
          height = img.naturalHeight;
          resolve();
        };
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
        img.src = blobUrl;
      });

      thumbnailUrl = blobUrl;
    } catch {
      // Could be HEIC or unsupported format
    }

    let aspectRatioLabel: InspectedFile['aspectRatioLabel'] = 'Outro';
    if (width > 0 && height > 0) {
      const ratio = width / height;
      if (Math.abs(ratio - 16 / 9) < 0.15) aspectRatioLabel = '16:9';
      else if (Math.abs(ratio - 9 / 16) < 0.15) aspectRatioLabel = '9:16';
      else if (Math.abs(ratio - 1) < 0.1) aspectRatioLabel = '1:1';
      else if (Math.abs(ratio - 4 / 3) < 0.15) aspectRatioLabel = '4:3';
    }

    return {
      file,
      id,
      name: file.name,
      sizeFormatted,
      fileType: 'image',
      format: ext,
      isBrowserCompatible: isStandardWeb,
      compatibilityWarning: !isStandardWeb ? 'Formato pode requerer conversão para PNG/WebP em navegadores antigos' : undefined,
      width: width || undefined,
      height: height || undefined,
      aspectRatioLabel,
      thumbnailUrl,
      previewBlobUrl: blobUrl,
    };
  }

  // 4. Video Processing
  if (fileType === 'video') {
    const isBrowserDirectPlayable = ['mp4', 'webm'].includes(ext);
    const blobUrl = URL.createObjectURL(file);
    let width: number | undefined;
    let height: number | undefined;
    let durationSeconds: number | undefined;
    let thumbnailUrl: string | undefined;
    let warning: string | undefined;

    if (!isBrowserDirectPlayable) {
      warning = `Arquivo em formato .${ext.toUpperCase()}. Navegadores não executam este formato diretamente. Faça upload no Bunny Stream para transcodificar para HLS (.m3u8) ou converta para MP4 (H.264/AAC).`;
    }

    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(); // Resolve on timeout to not hang UI
        }, 4000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          width = video.videoWidth;
          height = video.videoHeight;
          durationSeconds = Math.round(video.duration);
          resolve();
        };

        video.onerror = () => {
          clearTimeout(timeout);
          warning = `Arquivo .${ext.toUpperCase()} com codec não suportado diretamente para decodificação nativa. Para produção, hospede no Bunny Stream (.m3u8).`;
          resolve();
        };

        video.src = blobUrl;
      });

      // Try generating a frame thumbnail
      if (width && height && durationSeconds) {
        try {
          const seekTime = Math.min(2, durationSeconds * 0.2);
          video.currentTime = seekTime;
          await new Promise<void>((res) => {
            const t = setTimeout(res, 1500);
            video.onseeked = () => {
              clearTimeout(t);
              res();
            };
          });

          const canvas = document.createElement('canvas');
          canvas.width = Math.min(width, 480);
          canvas.height = Math.round((canvas.width / width) * height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {
          // Thumbnail extraction failed silently
        }
      }
    } catch {
      // Ignored
    }

    let aspectRatioLabel: InspectedFile['aspectRatioLabel'] = 'Outro';
    if (width && height) {
      const ratio = width / height;
      if (Math.abs(ratio - 16 / 9) < 0.15) aspectRatioLabel = '16:9';
      else if (Math.abs(ratio - 9 / 16) < 0.15) aspectRatioLabel = '9:16';
      else if (Math.abs(ratio - 4 / 3) < 0.15) aspectRatioLabel = '4:3';
    }

    return {
      file,
      id,
      name: file.name,
      sizeFormatted,
      fileType: 'video',
      format: ext,
      isBrowserCompatible: isBrowserDirectPlayable && !warning,
      compatibilityWarning: warning,
      width,
      height,
      durationSeconds,
      durationFormatted: durationSeconds ? formatDuration(durationSeconds) : undefined,
      aspectRatioLabel,
      thumbnailUrl,
      previewBlobUrl: blobUrl,
    };
  }

  return {
    file,
    id,
    name: file.name,
    sizeFormatted,
    fileType: 'other',
    format: ext,
    isBrowserCompatible: false,
    compatibilityWarning: `Formato .${ext} não suportado para streaming.`,
  };
}
