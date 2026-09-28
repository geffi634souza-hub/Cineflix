export interface Chapter {
  id: string;
  title: string;
  timestamp: string; // e.g. "12:30"
  seconds: number;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber?: number; // default 1
  title: string;
  videoUrl: string; // Bunny Stream HLS (.m3u8), MP4, or embed URL
  subtitleUrl?: string; // WebVTT or SRT URL
  durationMinutes?: number;
  synopsis?: string;
  resolution?: string; // e.g. "1080x1920", "1920x1080"
  aspectRatio?: '16:9' | '9:16' | 'auto';
}

export interface Series {
  id: string;
  title: string;
  tagline: string;
  synopsis: string;
  hook?: string;
  upsellPitch?: string;
  category: string;
  year: number;
  durationMinutes: number;
  rating: string;
  coverUrl: string;
  bannerUrl?: string;
  videoUrl: string; // Default main video (Bunny HLS or MP4)
  subtitleUrl?: string; // Main video subtitle (.vtt or .srt)
  previewLimitSeconds: number; // Duration of preview before lock (e.g. 25s)
  price: number; // R$
  promoPrice?: number; // R$
  checkoutUrl: string;
  isUnlockedDefault?: boolean;
  chapters: Chapter[];
  episodes?: Episode[];
  seasonsCount?: number;
  language?: string; // e.g. "Português (BR)", "Original Legendado"
  status?: 'published' | 'draft';
  aspectRatio?: '16:9' | '9:16' | 'auto';
  keyTakeaways?: string[];
  badges?: string[];
  fakeViewers: number; // E.g. 2480 pessoas assistindo agora
}

export interface CustomerAccessConfig {
  seriesId: string;
  customerName?: string;
  token?: string;
  previewLimitSeconds?: number;
}
