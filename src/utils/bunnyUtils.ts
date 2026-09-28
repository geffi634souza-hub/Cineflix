/**
 * Bunny.net Stream & CDN diagnostic utilities
 */

export interface BunnyConfig {
  pullZoneUrl?: string; // e.g. "https://seu-pullzone.b-cdn.net"
  storageZoneName?: string;
  apiKey?: string;
  tokenKey?: string; // For signed URLs
}

export interface BunnyUrlDiagnostic {
  isValidUrl: boolean;
  isHttps: boolean;
  isHls: boolean;
  isMp4: boolean;
  isBunnyCdn: boolean;
  statusText: string;
  isReachable?: boolean;
  supportsRange?: boolean;
  corsEnabled?: boolean;
  warning?: string;
  recommendations: string[];
}

export function getStoredBunnyConfig(): BunnyConfig {
  try {
    const raw = localStorage.getItem('cineflix_bunny_config');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return {
    pullZoneUrl: '',
    storageZoneName: '',
    apiKey: '',
  };
}

export function saveStoredBunnyConfig(config: BunnyConfig): void {
  try {
    localStorage.setItem('cineflix_bunny_config', JSON.stringify(config));
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Diagnostic analysis for Bunny.net / HLS URLs
 */
export async function diagnoseVideoUrl(url: string): Promise<BunnyUrlDiagnostic> {
  const result: BunnyUrlDiagnostic = {
    isValidUrl: false,
    isHttps: false,
    isHls: false,
    isMp4: false,
    isBunnyCdn: false,
    statusText: 'URL inválida',
    recommendations: [],
  };

  if (!url || !url.trim()) {
    result.statusText = 'URL vazia';
    return result;
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
    result.isValidUrl = true;
  } catch {
    result.statusText = 'Estrutura de URL inválida. Deve iniciar com https://';
    result.recommendations.push('Certifique-se de incluir "https://" no início da URL.');
    return result;
  }

  result.isHttps = parsed.protocol === 'https:';
  if (!result.isHttps) {
    result.recommendations.push(
      'URLs de streaming e Google Cast para Smart TV exigem estritamente HTTPS.'
    );
  }

  const pathnameLower = parsed.pathname.toLowerCase();
  result.isHls = pathnameLower.endsWith('.m3u8') || url.includes('.m3u8');
  result.isMp4 = pathnameLower.endsWith('.mp4');
  result.isBunnyCdn = parsed.hostname.includes('b-cdn.net') || parsed.hostname.includes('bunnycdn.com');

  if (result.isHls) {
    result.statusText = 'Stream HLS (.m3u8) identificado';
    result.recommendations.push(
      'HLS permite taxa de bits adaptativa (ABR) para reprodução fluida em conexões móveis e TVs 4K.'
    );
  } else if (result.isMp4) {
    result.statusText = 'Vídeo MP4 identificado';
  } else {
    result.statusText = 'Link de mídia genérico';
    result.recommendations.push(
      'Para melhor compatibilidade com o player e Google Cast, utilize HLS (.m3u8) gerado pelo Bunny Stream.'
    );
  }

  // Connectivity and CORS verification
  try {
    const headRes = await fetch(url, {
      method: 'HEAD',
      headers: {
        Range: 'bytes=0-1',
      },
    });

    result.isReachable = headRes.ok || headRes.status === 206 || headRes.status === 304;
    result.supportsRange = headRes.status === 206 || headRes.headers.get('accept-ranges') === 'bytes';
    result.corsEnabled = true;

    if (headRes.status === 403) {
      result.warning = 'HTTP 403 Forbidden: Verifique se o Token de Autenticação da Bunny está ativo ou expirou.';
      result.recommendations.push(
        'Se o Bunny Stream estiver com Token Authentication habilitado, gere uma URL assinada com validade de pelo menos 24 horas para evitar cortes na Smart TV.'
      );
    } else if (headRes.status === 404) {
      result.warning = 'HTTP 404 Not Found: Arquivo não encontrado no storage Bunny.';
    }
  } catch (err: any) {
    // If fetch failed due to CORS or Network
    result.corsEnabled = false;
    result.warning = 'Possível bloqueio de CORS no Bunny CDN ou servidor de mídia.';
    result.recommendations.push(
      'No painel do Bunny.net, acesse seu Pull Zone > Edge Rules ou Headers e ative "Access-Control-Allow-Origin: *" para que navegadores e o Google Cast na TV possam ler os manifestos HLS.'
    );
  }

  return result;
}
