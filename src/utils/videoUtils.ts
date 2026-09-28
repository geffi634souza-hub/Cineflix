/**
 * Utility to detect and convert video URLs
 * Supports Google Drive shareable links, Bunny Stream (Embed & HLS .m3u8), YouTube, Vimeo, and direct MP4.
 */

export interface ParsedVideo {
  url: string;
  isEmbed: boolean;
  provider: 'gdrive' | 'bunny' | 'youtube' | 'vimeo' | 'direct' | 'embed';
  originalUrl: string;
  message?: string;
  isHls?: boolean;
}

export function parseVideoSource(rawUrl: string): ParsedVideo {
  if (!rawUrl || !rawUrl.trim()) {
    return {
      url: '',
      isEmbed: false,
      provider: 'direct',
      originalUrl: '',
      isHls: false,
    };
  }

  const trimmed = rawUrl.trim();

  // 1. Google Drive Detection & Conversion
  // Formats:
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  // https://docs.google.com/file/d/FILE_ID
  const gdriveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/i;
  const gdriveMatch = trimmed.match(gdriveRegex);
  if (gdriveMatch && gdriveMatch[1]) {
    const fileId = gdriveMatch[1];
    return {
      url: `https://drive.google.com/file/d/${fileId}/preview`,
      isEmbed: true,
      provider: 'gdrive',
      originalUrl: trimmed,
      message: 'Google Drive detectado! Modo incorporação seguro ativado.',
    };
  }

  // 2. Bunny Stream Player (Embed / Play URLs)
  // Formats:
  // https://iframe.mediadelivery.net/embed/LIB_ID/VIDEO_ID
  // https://iframe.mediadelivery.net/play/LIB_ID/VIDEO_ID
  // https://video.bunnycdn.com/play/LIB_ID/VIDEO_ID
  // https://video.bunnycdn.com/embed/LIB_ID/VIDEO_ID
  const bunnyEmbedRegex = /(?:iframe\.mediadelivery\.net\/(?:embed|play)|video\.bunnycdn\.com\/(?:embed|play))\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/i;
  const bunnyEmbedMatch = trimmed.match(bunnyEmbedRegex);
  if (bunnyEmbedMatch && bunnyEmbedMatch[1] && bunnyEmbedMatch[2]) {
    const libraryId = bunnyEmbedMatch[1];
    const videoId = bunnyEmbedMatch[2];
    return {
      url: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&preload=true`,
      isEmbed: true,
      provider: 'bunny',
      originalUrl: trimmed,
      message: 'Player Bunny Stream incorporado detectado.',
    };
  }

  // 3. YouTube Detection & Conversion
  const ytRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const ytMatch = trimmed.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return {
      url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&modestbranding=1&rel=0`,
      isEmbed: true,
      provider: 'youtube',
      originalUrl: trimmed,
      message: 'Vídeo do YouTube detectado! Incorporação ativada.',
    };
  }

  // 4. Vimeo Detection & Conversion
  const vimeoRegex = /vimeo\.com\/(?:video\/)?([0-9]+)/i;
  const vimeoMatch = trimmed.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      url: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      isEmbed: true,
      provider: 'vimeo',
      originalUrl: trimmed,
      message: 'Vídeo do Vimeo detectado! Incorporação ativada.',
    };
  }

  // 5. Generic Iframe / Embed URL
  if (
    trimmed.includes('/embed/') ||
    trimmed.includes('/preview') ||
    trimmed.includes('player.') ||
    trimmed.includes('iframe.mediadelivery.net')
  ) {
    return {
      url: trimmed,
      isEmbed: true,
      provider: 'embed',
      originalUrl: trimmed,
      message: 'Provedor incorporado detectado.',
    };
  }

  // 6. Direct Video File (Bunny Stream HLS .m3u8, direct MP4, WebM)
  const isHls = trimmed.toLowerCase().includes('.m3u8');
  return {
    url: trimmed,
    isEmbed: false,
    provider: 'direct',
    originalUrl: trimmed,
    isHls,
    message: isHls ? 'Stream HLS Bunny (.m3u8) pronto para reprodução.' : 'Vídeo direto (MP4/WebM) pronto.',
  };
}
