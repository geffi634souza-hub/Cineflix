import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(apiKey) });
});

// Transcribe audio using gemini-3.5-transcribe
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API is not configured. Please add GEMINI_API_KEY to secrets.',
      });
    }

    const cleanBase64 = audioBase64.includes('base64,')
      ? audioBase64.split('base64,')[1]
      : audioBase64;

    const audioPart = {
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        audioPart,
        {
          text: 'Transcreva com fidelidade o que foi falado neste áudio em português. Retorne apenas o texto transcrito, sem introduções.',
        },
      ],
    });

    const transcribedText = response.text?.trim() || '';
    return res.json({ text: transcribedText });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao transcrever áudio com Gemini',
    });
  }
});

// AI Intelligence: Generate Synopsis, Hooks and Upsell Copy
app.post('/api/gemini/generate-synopsis', async (req, res) => {
  try {
    const { title, genre, topic, targetAudience } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API is not configured. Please add GEMINI_API_KEY to secrets.',
      });
    }

    const prompt = `Você é um especialista em roteirização e marketing de streaming para infoprodutos e séries de vídeo único.
Crie uma sinopse cativante e elementos de persuasão para a seguinte série:
- Título: ${title || 'Sem título'}
- Gênero / Categoria: ${genre || 'Documentário / Negócios'}
- Tema central: ${topic || 'Transformação e maestria'}
- Público-alvo: ${targetAudience || 'Profissionais e entusiastas'}

Retorne uma resposta em formato JSON estrito com os campos:
{
  "synopsis": "Sinopse cinematográfica e envolvente de 2 a 3 parágrafos curtos",
  "hook": "Uma frase de gancho irresistível para os primeiros 30 segundos de teaser",
  "upsellPitch": "Texto persuasivo de 1 parágrafo para a tela de bloqueio convidando a desbloquear a série completa",
  "keyTakeaways": ["3 a 5 pontos-chave que o aluno/espectador vai aprender"],
  "suggestedChapters": [
    { "title": "Nome do bloco/capítulo dentro do vídeo único", "timestamp": "00:00" },
    { "title": "Nome do bloco 2", "timestamp": "12:30" },
    { "title": "Nome do bloco 3", "timestamp": "28:45" },
    { "title": "Conclusão e Próximos Passos", "timestamp": "45:10" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text?.trim() || '{}';
    const parsed = JSON.parse(jsonText);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Gemini synopsis error:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao gerar inteligência com Gemini',
    });
  }
});

// AI Episode Insights & Q&A
app.post('/api/gemini/ask-series', async (req, res) => {
  try {
    const { seriesTitle, question, synopsis } = req.body;
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API is not configured.',
      });
    }

    const prompt = `Você é o tutor especialista da série "${seriesTitle}".
Contexto da série: ${synopsis || 'Conteúdo exclusivo de alta performance em vídeo único.'}
Pergunta do aluno/espectador: "${question}"

Responda de forma clara, motivadora e prática em português.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({ answer: response.text?.trim() || '' });
  } catch (error: any) {
    console.error('Gemini Q&A error:', error);
    return res.status(500).json({
      error: error.message || 'Falha na resposta do assistente inteligente',
    });
  }
});

// AI Title Modifier & Creative Generator for Mini Novelas
app.post('/api/gemini/improve-title', async (req, res) => {
  try {
    const { currentTitle = '', category = 'Mini Novelas & Drama', currentSynopsis = '', customApiKey = '' } = req.body;

    const activeAi = customApiKey
      ? new GoogleGenAI({
          apiKey: customApiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        })
      : ai;

    if (!activeAi) {
      return res.status(503).json({
        error: 'Gemini API não está configurada no servidor. Insira sua chave nos ajustes.',
      });
    }

    const prompt = `Você é um diretor criativo especialista em títulos virais para o aplicativo "Mini Novelas" (séries verticais dramáticas de alta retenção no estilo ReelShort, DramaBox e novelas brasileiras).
Dados da série atual:
- Título atual: "${currentTitle || 'Sem título'}"
- Gênero: "${category}"
- Sinopse atual: "${currentSynopsis || 'Mini novela dramática'}"

Gere em formato JSON estrito:
{
  "improvedTitles": [
    "Título 1: Forte, dramático e impactante",
    "Título 2: Misterioso com gancho emocional",
    "Título 3: Curto e direto para redes sociais"
  ],
  "suggestedHook": "Frase de gancho magnética para os primeiros 30 segundos",
  "suggestedSynopsis": "Sinopse em 2 parágrafos curtos envolventes com reviravoltas",
  "suggestedTagline": "Frase de impacto curta",
  "suggestedBadges": ["MINI NOVELA", "VIRAL", "SUSPENSE"]
}`;

    const response = await activeAi.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Gemini improve title error:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao melhorar título com Gemini',
    });
  }
});

// Cache for Gemini identification to preserve free quotas
const identificationCache = new Map<string, any>();

// Bunny.net Secure Storage Zone / Stream Library File Synchronization
app.post('/api/bunny/sync', async (req, res) => {
  try {
    const {
      storageZoneName,
      apiKey,
      pullZoneUrl = '',
      storageRegion = '',
      streamLibraryId = '',
      folderPath = '',
      testMode = false,
    } = req.body;

    // Test mode fallback: provide verified Bunny test files so admin can test the entire pipeline immediately
    if (testMode || (!apiKey && !storageZoneName)) {
      const mockFiles = [
        {
          guid: 'sample-bunny-1',
          objectName: 'Segredos_da_Herdeira_S01E01_VIP_DUBLADO_1080p.mp4',
          cleanName: 'Segredos da Herdeira',
          season: 1,
          episode: 1,
          length: 54200000,
          lastChanged: new Date().toISOString(),
          contentType: 'video/mp4',
          publicUrl: pullZoneUrl
            ? `${pullZoneUrl.replace(/\/$/, '')}/Segredos_da_Herdeira_S01E01_VIP_DUBLADO_1080p.mp4`
            : 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          format: 'mp4',
          isHls: false,
          isSimulated: true,
        },
        {
          guid: 'sample-bunny-2',
          objectName: 'Segredos_da_Herdeira_S01E02_VIP_DUBLADO_1080p.mp4',
          cleanName: 'Segredos da Herdeira',
          season: 1,
          episode: 2,
          length: 61500000,
          lastChanged: new Date().toISOString(),
          contentType: 'video/mp4',
          publicUrl: pullZoneUrl
            ? `${pullZoneUrl.replace(/\/$/, '')}/Segredos_da_Herdeira_S01E02_VIP_DUBLADO_1080p.mp4`
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          format: 'mp4',
          isHls: false,
          isSimulated: true,
        },
        {
          guid: 'sample-bunny-3',
          objectName: 'Imperio_do_Capital_Episodio_3_4K_WEBRip.m3u8',
          cleanName: 'Império do Capital',
          season: 1,
          episode: 3,
          length: 125000000,
          lastChanged: new Date().toISOString(),
          contentType: 'application/x-mpegURL',
          publicUrl: pullZoneUrl
            ? `${pullZoneUrl.replace(/\/$/, '')}/Imperio_do_Capital_Episodio_3_4K_WEBRip.m3u8`
            : 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          format: 'hls',
          isHls: true,
          isSimulated: true,
        },
      ];

      return res.json({
        success: true,
        isSimulated: true,
        message: 'Modo demonstração seguro ativado. Configure sua Storage API Key no painel Bunny para sincronizar arquivos reais.',
        files: mockFiles,
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'Chave de API do Bunny (AccessKey) é obrigatória para sincronização segura.',
      });
    }

    // Bunny Stream Library mode
    if (streamLibraryId) {
      const streamEndpoint = `https://video.bunnycdn.com/library/${streamLibraryId}/videos`;
      const streamRes = await fetch(streamEndpoint, {
        method: 'GET',
        headers: {
          AccessKey: apiKey,
          accept: 'application/json',
        },
      });

      if (!streamRes.ok) {
        const errorText = await streamRes.text().catch(() => '');
        return res.status(streamRes.status).json({
          error: `Falha ao consultar Bunny Stream (Status ${streamRes.status}): ${errorText || 'Verifique o ID da Library e a API Key'}`,
        });
      }

      const streamData = (await streamRes.json()) as any;
      const items = Array.isArray(streamData.items) ? streamData.items : [];

      const parsedFiles = items.map((item: any) => {
        const hlsUrl = pullZoneUrl
          ? `${pullZoneUrl.replace(/\/$/, '')}/${item.guid}/playlist.m3u8`
          : `https://iframe.mediadelivery.net/play/${streamLibraryId}/${item.guid}`;

        return {
          guid: item.guid,
          objectName: item.title || `video_${item.guid}`,
          length: item.length || 0,
          durationSeconds: item.length || 0,
          lastChanged: item.dateUploaded || new Date().toISOString(),
          contentType: 'application/x-mpegURL',
          publicUrl: hlsUrl,
          format: 'hls',
          isHls: true,
          thumbnailUrl: `https://vz-${streamLibraryId}.b-cdn.net/${item.guid}/thumbnail.jpg`,
        };
      });

      return res.json({
        success: true,
        count: parsedFiles.length,
        files: parsedFiles,
      });
    }

    // Bunny Storage Zone mode
    const cleanZone = storageZoneName.trim();
    const regionHost = storageRegion && storageRegion !== 'default'
      ? `${storageRegion.toLowerCase()}.storage.bunnycdn.com`
      : 'storage.bunnycdn.com';

    const cleanPath = folderPath ? (folderPath.startsWith('/') ? folderPath.slice(1) : folderPath) : '';
    const storageEndpoint = `https://${regionHost}/${encodeURIComponent(cleanZone)}/${cleanPath ? cleanPath + '/' : ''}`;

    const storageRes = await fetch(storageEndpoint, {
      method: 'GET',
      headers: {
        AccessKey: apiKey.trim(),
        accept: 'application/json',
      },
    });

    if (!storageRes.ok) {
      const errText = await storageRes.text().catch(() => '');
      return res.status(storageRes.status).json({
        error: `Falha na Storage Zone do Bunny (Status ${storageRes.status}): ${errText || 'Verifique o nome da Storage Zone e a AccessKey'}`,
      });
    }

    const fileList = (await storageRes.json()) as any[];
    if (!Array.isArray(fileList)) {
      return res.json({ success: true, count: 0, files: [] });
    }

    // Filter only video and playlist files
    const videoExtensions = ['.mp4', '.m3u8', '.mkv', '.webm', '.mov', '.ts'];
    const filtered = fileList
      .filter((item) => !item.IsDirectory)
      .filter((item) => {
        const name = (item.ObjectName || '').toLowerCase();
        return videoExtensions.some((ext) => name.endsWith(ext));
      })
      .map((item) => {
        const name = item.ObjectName || '';
        const isHls = name.toLowerCase().endsWith('.m3u8');
        const encodedPath = [cleanPath, name].filter(Boolean).map(encodeURIComponent).join('/');

        const cdnDomain = pullZoneUrl.trim()
          ? pullZoneUrl.trim().replace(/\/$/, '')
          : `https://${cleanZone}.b-cdn.net`;

        const publicUrl = `${cdnDomain}/${encodedPath}`;

        return {
          guid: item.Guid || item.Id || name,
          objectName: name,
          length: item.Length || 0,
          lastChanged: item.LastChanged || new Date().toISOString(),
          contentType: item.ContentType || (isHls ? 'application/x-mpegURL' : 'video/mp4'),
          publicUrl,
          format: isHls ? 'hls' : 'mp4',
          isHls,
        };
      });

    return res.json({
      success: true,
      count: filtered.length,
      files: filtered,
    });
  } catch (error: any) {
    console.error('Bunny sync error:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao sincronizar arquivos com Bunny Storage Zone',
    });
  }
});

// Gemini AI Smart Identification for Series & Episodes with Google Search Grounding
app.post('/api/bunny/smart-identify', async (req, res) => {
  try {
    const { filename, metadata = {} } = req.body;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
    }

    // Check in-memory cache first to avoid repeating API calls
    const cacheKey = filename.trim().toLowerCase();
    if (identificationCache.has(cacheKey)) {
      return res.json(identificationCache.get(cacheKey));
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API is not configured.',
      });
    }

    // First: Run search grounding with Gemini 3.8 Flash to find real web information and official poster
    let searchGroundingInfo = '';
    let suggestedCoverFromSearch = '';
    try {
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Pesquise no Google sobre o título, filme, série ou mini novela referenciado neste arquivo: "${filename}".
Encontre:
1. O título oficial real da obra ou série
2. Uma breve sinopse oficial real
3. O ano de lançamento e gênero
4. URLs públicas de pôsteres ou capas oficiais (se disponíveis em sites como IMDb, TMDB, FilmAffinity, AdoroCinema, etc.)`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      searchGroundingInfo = searchResponse.text || '';

      // Extract image URL from response text if present
      const imgMatch = searchGroundingInfo.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/i);
      if (imgMatch) {
        suggestedCoverFromSearch = imgMatch[0];
      }
    } catch (searchErr) {
      console.warn('Google Search grounding fallback:', searchErr);
    }

    const prompt = `Você é um analista de metadados cinematográficos para o aplicativo "Mini Novelas" (plataforma de streaming de séries verticais e produções dramáticas).
Analise com precisão o seguinte nome de arquivo e informações encontradas:
Arquivo: "${filename}"
Metadados do arquivo: ${JSON.stringify(metadata)}
Pesquisa no Google: "${searchGroundingInfo.slice(0, 1500)}"

INSTRUÇÕES RIGOROSAS:
1. Remova ruídos técnicos (ex: VIP, DUBLADO, 1080p, 720p, 4K, MP4, M3U8, WEBRip, nomes de plataformas).
2. Extraia o Título limpo e formatado em português.
3. Detecte o número da Temporada e do Episódio (se existirem, caso contrário use temporada 1 e episódio 1).
4. Sugira o gênero mais apropriado (ex: "Mini Novelas & Drama", "Romance & Paixão", "Finanças & Negócios", "Suspense & Mistério", "Cinema & Direção").
5. Crie uma sinopse cativante e concisa de 2 parágrafos.
6. Crie um gancho ("hook") de 1 frase para os primeiros 30 segundos.
7. Crie uma tagline impactante.
8. Sugira uma URL direta de capa/pôster em alta qualidade no formato vertical 9:16. Se uma capa foi encontrada na pesquisa ("${suggestedCoverFromSearch}"), use-a. Caso contrário, forneça uma URL de pôster de alta resolução temática cinematográfica do Unsplash (ex: imagem de drama, romance ou suspense vertical com qualidade 1080x1920).
9. Atribua uma pontuação de confiança de 0 a 100 com base na clareza do nome do arquivo.

Retorne em formato JSON estrito:
{
  "cleanTitle": "Título Limpo",
  "seasonNumber": 1,
  "episodeNumber": 1,
  "hasEpisodeInfo": true,
  "genre": "Mini Novelas & Drama",
  "language": "Português (BR)",
  "tagline": "Frase de impacto curta",
  "synopsis": "Sinopse em 2 parágrafos curtos",
  "hook": "Gancho magnético de 1 frase",
  "suggestedCoverUrl": "https://...",
  "confidenceScore": 95,
  "confidenceLevel": "high"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsedResult = JSON.parse(response.text?.trim() || '{}');

    // Ensure suggestedCoverUrl is a valid URL or fallback to vertical cinema poster
    if (!parsedResult.suggestedCoverUrl || !parsedResult.suggestedCoverUrl.startsWith('http')) {
      const fallbackCovers = [
        'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
      ];
      parsedResult.suggestedCoverUrl = suggestedCoverFromSearch || fallbackCovers[Math.floor(Math.random() * fallbackCovers.length)];
    }

    // Store in cache
    identificationCache.set(cacheKey, parsedResult);

    return res.json(parsedResult);
  } catch (error: any) {
    console.error('Smart identification error:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao identificar arquivo com IA',
    });
  }
});

// Setup Vite in Dev or Serve Static in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
