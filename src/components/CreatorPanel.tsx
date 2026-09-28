import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Plus,
  Trash2,
  Video,
  Send,
  MessageCircle,
  QrCode,
  Crown,
  Gift,
  Sparkles,
  Eye,
  Edit3,
  Save,
  ArrowUp,
  ArrowDown,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Users,
  Shield,
  RotateCcw,
  Radio,
  FileCheck,
  Database,
  KeyRound,
  Lock,
  RefreshCw,
  Mail,
  Phone,
} from 'lucide-react';
import { Series, Episode } from '../types/series';
import { parseVideoSource } from '../utils/videoUtils';
import { formatPixKey } from '../utils/pixUtils';
import { DropzoneUploadArea } from './DropzoneUploadArea';
import { BunnyConfigTab } from './BunnyConfigTab';
import { BunnySyncTab } from './BunnySyncTab';
import {
  VipClientRecord,
  VipReferralItem,
  calcVipDaysRemaining,
  isVipRecordActive,
  normalizeClientName,
  findVipClient,
} from '../types/vip';
import {
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  removeFirebaseConfig,
  testFirebaseConnection,
  persistVipClients,
  deleteClientFromStorage,
  fetchVipClientsFromStorage,
  fetchReferralsFromStorage,
  persistReferrals,
  FirebaseClientConfig,
} from '../services/firebaseClient';

interface CreatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  seriesList: Series[];
  unlockedSeriesId: string;
  onAddSeries: (newSeries: Series) => void;
  onUpdateSeries: (updatedSeries: Series) => void;
  onDeleteSeries: (id: string) => void;
  onToggleSeriesLock: (id: string) => void;
  onSelectSeriesForPreview: (series: Series) => void;
  unlockedSet: Set<string>;
  whatsappNumber: string;
  onUpdateWhatsAppNumber: (phone: string) => void;
  pixKey: string;
  pixKeyType?: string;
  onUpdatePixKey: (key: string, keyType?: string) => void;
  universalPassword?: string;
  onUpdateUniversalPassword?: (pass: string) => void;
  vipClients?: VipClientRecord[];
  onUpdateVipClients?: (clients: VipClientRecord[]) => void;
}

export const CreatorPanel: React.FC<CreatorPanelProps> = ({
  isOpen,
  onClose,
  seriesList,
  unlockedSeriesId,
  onAddSeries,
  onUpdateSeries,
  onDeleteSeries,
  onToggleSeriesLock,
  onSelectSeriesForPreview,
  unlockedSet,
  whatsappNumber,
  onUpdateWhatsAppNumber,
  pixKey,
  pixKeyType = 'phone',
  onUpdatePixKey,
  universalPassword = '123456',
  onUpdateUniversalPassword,
  vipClients: externalVipClients,
  onUpdateVipClients: externalOnUpdateVipClients,
}) => {
  // Admin password gate
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('cineflix_admin_auth') === 'true';
  });
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState(false);

  // Primary tabs: "manage", "sync", "bunny", "clients", "link", "payment"
  const [activeTab, setActiveTab] = useState<'manage' | 'sync' | 'bunny' | 'clients' | 'link' | 'payment'>('manage');

  // Series Editor Mode: list vs editing/new
  const [editorMode, setEditorMode] = useState<'list' | 'edit'>('list');
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);

  // Extended Series Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formCategory, setFormCategory] = useState('Geral');
  const [formLanguage, setFormLanguage] = useState('Português (BR)');
  const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published');
  const [formAspectRatio, setFormAspectRatio] = useState<'auto' | '9:16' | '16:9'>('auto');
  const [formSubtitleUrl, setFormSubtitleUrl] = useState('');
  const [formPreviewLimitSeconds, setFormPreviewLimitSeconds] = useState(120);
  const [formEpisodes, setFormEpisodes] = useState<Episode[]>([]);

  // Add Episode Inline Form State
  const [isAddingEpisode, setIsAddingEpisode] = useState(false);
  const [epNumber, setEpNumber] = useState<number>(1);
  const [epSeasonNumber, setEpSeasonNumber] = useState<number>(1);
  const [epTitle, setEpTitle] = useState('');
  const [epVideoUrl, setEpVideoUrl] = useState('');
  const [epSubtitleUrl, setEpSubtitleUrl] = useState('');

  // Link Generator State
  const [accessType, setAccessType] = useState<'single' | 'package3' | 'all'>('single');
  const [selectedSeriesId, setSelectedSeriesId] = useState(unlockedSeriesId || seriesList[0]?.id || '');
  const [selectedPackageSeriesIds, setSelectedPackageSeriesIds] = useState<string[]>(() => {
    return seriesList.slice(0, 3).map((s) => s.id);
  });
  const [clientName, setClientName] = useState('');
  const [previewSeconds, setPreviewSeconds] = useState(120);
  const [copied, setCopied] = useState(false);

  // Settings State
  const [phoneInput, setPhoneInput] = useState(whatsappNumber || '5548992041577');
  const [pixInput, setPixInput] = useState(pixKey || '48988487037');
  const [pixTypeInput, setPixTypeInput] = useState<string>(pixKeyType || 'phone');
  const [passwordInput, setPasswordInput] = useState(universalPassword || '123456');
  const [savedSettings, setSavedSettings] = useState(false);

  // VIP Clients fallback local state if not provided via props
  const [internalVipClients, setInternalVipClients] = useState<VipClientRecord[]>(() => {
    try {
      const stored = localStorage.getItem('cineflix_vip_clients');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn(e);
    }
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return [
      {
        id: 'vip-1',
        name: 'Carlos Silva',
        referralCode: 'carlos-silva',
        activatedAt: now.toISOString(),
        expiresAt: thirtyDaysAhead.toISOString(),
        referrals: [
          { name: 'Lucas Mendes', date: 'Hoje às 14:20', status: 'pago' },
          { name: 'Fernanda Lima', date: 'Hoje às 15:45', status: 'pago' },
        ],
      },
    ];
  });

  const vipClients = externalVipClients || internalVipClients;
  const updateVipClients = (newClients: VipClientRecord[]) => {
    if (externalOnUpdateVipClients) {
      externalOnUpdateVipClients(newClients);
    } else {
      setInternalVipClients(newClients);
    }
    try {
      localStorage.setItem('cineflix_vip_clients', JSON.stringify(newClients));
    } catch (e) {
      console.warn(e);
    }
    // Automatically persist to Firebase Firestore
    persistVipClients(newClients);
  };

  // Client VIP Management state
  const [targetClientName, setTargetClientName] = useState('');
  const [targetClientNumber, setTargetClientNumber] = useState('');
  const [targetClientPassword, setTargetClientPassword] = useState('');
  const [targetClientEmail, setTargetClientEmail] = useState('');
  const [targetClientPhone, setTargetClientPhone] = useState('');
  const [selectedDaysToAdd, setSelectedDaysToAdd] = useState<number>(30);
  const [customDaysInput, setCustomDaysInput] = useState<string>('30');
  const [clientSearchFilter, setClientSearchFilter] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [clientActionFeedback, setClientActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingDaysValue, setEditingDaysValue] = useState<string>('30');
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);

  // Inline credentials editing state
  const [editingCredentialsId, setEditingCredentialsId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAccessNumber, setEditAccessNumber] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Firebase state & config
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseClientConfig>(() => {
    return (
      getSavedFirebaseConfig() || {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      }
    );
  });
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(() => {
    const cfg = getSavedFirebaseConfig();
    return Boolean(cfg && cfg.apiKey && cfg.projectId);
  });
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(false);

  // Referrals database
  const [allReferrals, setAllReferrals] = useState<VipReferralItem[]>([]);
  const [activeClientsSubTab, setActiveClientsSubTab] = useState<'clients' | 'referrals' | 'firebase'>('clients');

  // Load referrals and firebase sync on open
  useEffect(() => {
    fetchReferralsFromStorage().then((data) => {
      if (data && data.length > 0) {
        setAllReferrals(data);
      }
    });
  }, []);

  // Referrals friend registration
  const [newFriendName, setNewFriendName] = useState('');
  const [targetClientIdForFriend, setTargetClientIdForFriend] = useState('');

  if (!isOpen) return null;

  // Real-time video format detection for the episode video URL input
  const videoDetection = parseVideoSource(epVideoUrl);

  // Open Editor for New Series
  const handleStartNewSeries = () => {
    setEditingSeriesId(null);
    setFormTitle('');
    setFormDescription('');
    setFormCoverUrl('');
    setFormCategory('Geral');
    setFormEpisodes([]);
    setIsAddingEpisode(false);
    setEpNumber(1);
    setEpTitle('');
    setEpVideoUrl('');
    setEditorMode('edit');
  };

  // Open Editor for Existing Series
  const handleEditSeries = (series: Series) => {
    setEditingSeriesId(series.id);
    setFormTitle(series.title);
    setFormDescription(series.synopsis || series.tagline || '');
    setFormCoverUrl(series.coverUrl);
    setFormBannerUrl(series.bannerUrl || '');
    setFormCategory(series.category || 'Geral');
    setFormLanguage(series.language || 'Português (BR)');
    setFormStatus(series.status || 'published');
    setFormAspectRatio(series.aspectRatio || 'auto');
    setFormSubtitleUrl(series.subtitleUrl || '');
    setFormPreviewLimitSeconds(Math.max(120, series.previewLimitSeconds || 120));
    
    // If series has episodes, load them. If not, create episode 1 from existing videoUrl
    if (series.episodes && series.episodes.length > 0) {
      setFormEpisodes([...series.episodes]);
      setEpNumber(series.episodes.length + 1);
    } else if (series.videoUrl) {
      const initialEp: Episode = {
        id: `ep-${Date.now()}`,
        episodeNumber: 1,
        seasonNumber: 1,
        title: 'Episódio 1',
        videoUrl: series.videoUrl,
        subtitleUrl: series.subtitleUrl,
      };
      setFormEpisodes([initialEp]);
      setEpNumber(2);
    } else {
      setFormEpisodes([]);
      setEpNumber(1);
    }

    setIsAddingEpisode(false);
    setEpTitle('');
    setEpVideoUrl('');
    setEpSubtitleUrl('');
    setEditorMode('edit');
  };

  // Add Episode to current form
  const handleAddEpisodeToForm = () => {
    if (!epTitle.trim() || !epVideoUrl.trim()) {
      alert('Por favor, preencha o Título e a URL do vídeo do episódio.');
      return;
    }

    const newEp: Episode = {
      id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      episodeNumber: Number(epNumber) || formEpisodes.length + 1,
      title: epTitle.trim(),
      videoUrl: epVideoUrl.trim(),
    };

    setFormEpisodes((prev) => [...prev, newEp]);
    setEpNumber((prev) => prev + 1);
    setEpTitle('');
    setEpVideoUrl('');
    setEpSubtitleUrl('');
    setIsAddingEpisode(false);
  };

  // Automated form pre-fill from inspected files
  const handleSeriesGeneratedFromFiles = (seriesData: Partial<Series>) => {
    setEditingSeriesId(null);
    if (seriesData.title) setFormTitle(seriesData.title);
    if (seriesData.coverUrl) setFormCoverUrl(seriesData.coverUrl);
    if (seriesData.bannerUrl) setFormBannerUrl(seriesData.bannerUrl);
    if (seriesData.category) setFormCategory(seriesData.category);
    if (seriesData.aspectRatio) setFormAspectRatio(seriesData.aspectRatio);
    if (seriesData.subtitleUrl) setFormSubtitleUrl(seriesData.subtitleUrl);
    if (seriesData.language) setFormLanguage(seriesData.language);
    if (seriesData.episodes) setFormEpisodes(seriesData.episodes);
    setFormStatus('draft');
    setEditorMode('edit');
  };

  const handleEpisodeGeneratedFromFile = (episode: Episode) => {
    setFormEpisodes((prev) => [
      ...prev,
      { ...episode, episodeNumber: prev.length + 1 },
    ]);
    if (editorMode !== 'edit') {
      setEditorMode('edit');
    }
  };

  // Delete Episode
  const handleDeleteEpisode = (id: string) => {
    setFormEpisodes((prev) => {
      const filtered = prev.filter((ep) => ep.id !== id);
      // Renumber
      return filtered.map((ep, idx) => ({ ...ep, episodeNumber: idx + 1 }));
    });
  };

  // Reorder Episodes (Move Up / Move Down)
  const handleMoveEpisode = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formEpisodes.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...formEpisodes];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Renumber sequentially
    const renumbered = updated.map((ep, idx) => ({
      ...ep,
      episodeNumber: idx + 1,
    }));

    setFormEpisodes(renumbered);
  };

  // Save Series (SALVAR)
  const handleSaveSeries = (e?: React.FormEvent, forceStatus?: 'published' | 'draft') => {
    if (e) e.preventDefault();
    if (!formTitle.trim()) {
      alert('Por favor, insira o Nome da Série.');
      return;
    }

    const defaultCover =
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';
    const mainVideoUrl = formEpisodes.length > 0 ? formEpisodes[0].videoUrl : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
    const effectiveStatus = forceStatus || formStatus;

    if (editingSeriesId) {
      // Update existing
      const existing = seriesList.find((s) => s.id === editingSeriesId);
      if (!existing) return;

      const updated: Series = {
        ...existing,
        title: formTitle.trim(),
        synopsis: formDescription.trim() || 'Episódio compilado completo exclusivo Cineflix.',
        tagline: formDescription.trim() || 'Episódio compilado completo exclusivo Cineflix.',
        coverUrl: formCoverUrl.trim() || existing.coverUrl || defaultCover,
        bannerUrl: formBannerUrl.trim() || existing.bannerUrl,
        category: formCategory.trim() || existing.category || 'Geral',
        language: formLanguage,
        status: effectiveStatus,
        aspectRatio: formAspectRatio,
        subtitleUrl: formSubtitleUrl.trim() || undefined,
        previewLimitSeconds: Math.max(120, Number(formPreviewLimitSeconds) || 120),
        videoUrl: mainVideoUrl,
        episodes: formEpisodes,
      };

      onUpdateSeries(updated);
    } else {
      // Create new
      const created: Series = {
        id: `series-${Date.now()}`,
        title: formTitle.trim(),
        tagline: formDescription.trim() || 'Episódio compilado completo exclusivo Cineflix.',
        synopsis: formDescription.trim() || 'Episódio compilado completo exclusivo Cineflix.',
        category: formCategory.trim() || 'Geral',
        language: formLanguage,
        status: effectiveStatus,
        aspectRatio: formAspectRatio,
        subtitleUrl: formSubtitleUrl.trim() || undefined,
        year: new Date().getFullYear(),
        rating: '14+',
        durationMinutes: 45,
        previewLimitSeconds: Number(formPreviewLimitSeconds) || 120,
        price: 5,
        promoPrice: 5,
        checkoutUrl: '',
        isUnlockedDefault: false,
        chapters: [],
        coverUrl: formCoverUrl.trim() || defaultCover,
        bannerUrl: formBannerUrl.trim() || undefined,
        videoUrl: mainVideoUrl,
        episodes: formEpisodes,
        fakeViewers: 2450,
      };

      onAddSeries(created);
    }

    setEditorMode('list');
  };

  // Preview Series (VISUALIZAR - exactly as the customer sees it)
  const handlePreviewCurrentSeries = (targetSeries?: Series) => {
    let toView = targetSeries;
    if (!toView) {
      if (editingSeriesId) {
        toView = seriesList.find((s) => s.id === editingSeriesId);
      } else if (formTitle.trim()) {
        handleSaveSeries();
        toView = seriesList[0];
      }
    }

    if (toView) {
      onSelectSeriesForPreview(toView);
      onClose();
    }
  };

  // Delete Series (EXCLUIR)
  const handleDeleteCurrentSeries = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta série?')) {
      onDeleteSeries(id);
      if (editingSeriesId === id) {
        setEditorMode('list');
      }
    }
  };

  // Link Generator helper
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();

  if (accessType === 'all') {
    params.set('allAccess', 'true');
  } else if (accessType === 'package3') {
    params.set('unlockedPackage', selectedPackageSeriesIds.join(','));
    params.set('price', '10');
    params.set('preview', previewSeconds.toString());
  } else {
    params.set('unlocked', selectedSeriesId);
    params.set('preview', previewSeconds.toString());
  }

  if (clientName.trim()) {
    params.set('client', clientName.trim());
  }

  const customerLink = `${baseUrl}?${params.toString()}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(customerLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSendLinkWhatsApp = () => {
    let planDesc = 'à sua série';
    if (accessType === 'all') planDesc = 'ao Passe VIP Mensal (R$ 29,90)';
    else if (accessType === 'package3') planDesc = 'ao Pacote de 3 Séries (R$ 10,00)';
    else planDesc = 'à série liberada (R$ 5,00)';

    const message = encodeURIComponent(
      `Olá ${clientName.trim() || 'amigo(a)'}! Aqui está o seu acesso exclusivo ${planDesc} no Mini Novelas:\n\n${customerLink}\n\nAproveite os episódios completos em alta definição!`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWhatsAppNumber(phoneInput);
    onUpdatePixKey(pixInput, pixTypeInput);
    if (onUpdateUniversalPassword) {
      onUpdateUniversalPassword(passwordInput);
    }
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 2500);
  };

  // VIP Clients & Time Management Handlers
  const handleAddOrExtendVip = (name: string, days: number) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setClientActionFeedback({ text: 'Digite o nome do cliente (mínimo 2 letras).', type: 'error' });
      setTimeout(() => setClientActionFeedback(null), 3500);
      return;
    }
    if (!days || days <= 0) {
      setClientActionFeedback({ text: 'A quantidade de dias deve ser maior que zero.', type: 'error' });
      setTimeout(() => setClientActionFeedback(null), 3500);
      return;
    }

    const cleanName = trimmed;
    const existing = findVipClient(vipClients, cleanName);
    let updated: VipClientRecord[];
    let resultingDays = 0;

    if (existing) {
      const curExp = new Date(existing.expiresAt).getTime();
      const base = curExp > Date.now() ? curExp : Date.now();
      const newExp = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
      resultingDays = calcVipDaysRemaining(newExp);
      updated = vipClients.map((c) =>
        c.id === existing.id
          ? {
              ...c,
              expiresAt: newExp,
              accessNumber: targetClientNumber.trim() || c.accessNumber || `Cliente ${vipClients.length}`,
              password: targetClientPassword.trim() || c.password || '123456',
              email: targetClientEmail.trim() || c.email,
              phone: targetClientPhone.trim() || c.phone,
              activatedAt: existing.activatedAt || new Date().toISOString(),
            }
          : c
      );
      setClientActionFeedback({
        text: `VIP de "${existing.name}" renovado! +${days} dias adicionados. Total ativo: ${resultingDays} dias.`,
        type: 'success',
      });
    } else {
      const newExp = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      resultingDays = days;
      const nextNum = vipClients.length + 1;
      const newClient: VipClientRecord = {
        id: `vip-${Date.now()}`,
        name: cleanName,
        accessNumber: targetClientNumber.trim() || `Cliente ${nextNum}`,
        password: targetClientPassword.trim() || Math.floor(100000 + Math.random() * 900000).toString(),
        email: targetClientEmail.trim() || undefined,
        phone: targetClientPhone.trim() || undefined,
        referralCode: normalizeClientName(cleanName).replace(/\s+/g, '-'),
        activatedAt: new Date().toISOString(),
        expiresAt: newExp,
        referrals: [],
      };
      updated = [newClient, ...vipClients];
      setClientActionFeedback({
        text: `Cliente "${cleanName}" cadastrado com sucesso! Nº: ${newClient.accessNumber} | Senha: ${newClient.password}`,
        type: 'success',
      });
    }

    updateVipClients(updated);
    setTargetClientName('');
    setTargetClientNumber(`Cliente ${updated.length + 1}`);
    setTargetClientPassword(Math.floor(100000 + Math.random() * 900000).toString());
    setTargetClientEmail('');
    setTargetClientPhone('');
    setTimeout(() => setClientActionFeedback(null), 4500);
  };

  const handleDirectAddDays = (clientId: string, daysToAdd: number) => {
    const updated = vipClients.map((c) => {
      if (c.id === clientId) {
        const curExp = new Date(c.expiresAt).getTime();
        const base = curExp > Date.now() ? curExp : Date.now();
        const newExp = new Date(base + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
        return { ...c, expiresAt: newExp };
      }
      return c;
    });
    updateVipClients(updated);
    const client = vipClients.find((c) => c.id === clientId);
    setClientActionFeedback({
      text: `+${daysToAdd} dias adicionados para ${client?.name || 'o cliente'}!`,
      type: 'success',
    });
    setTimeout(() => setClientActionFeedback(null), 3500);
  };

  const handleSetExactDays = (clientId: string, days: number) => {
    const newExp = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const updated = vipClients.map((c) => (c.id === clientId ? { ...c, expiresAt: newExp } : c));
    updateVipClients(updated);
    setEditingClientId(null);
    setClientActionFeedback({
      text: `Tempo VIP ajustado para ${days} dias!`,
      type: 'success',
    });
    setTimeout(() => setClientActionFeedback(null), 3500);
  };

  // Fixed Zerar VIP: Works directly in iframe without blocking window.confirm
  const handleResetVip = (clientId: string) => {
    const client = vipClients.find((c) => c.id === clientId);
    if (!client) return;
    const pastExp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const updated = vipClients.map((c) => (c.id === clientId ? { ...c, expiresAt: pastExp } : c));
    updateVipClients(updated);
    setClientActionFeedback({
      text: `VIP de "${client.name}" foi zerado com sucesso! Acesso VIP suspenso.`,
      type: 'success',
    });
    setTimeout(() => setClientActionFeedback(null), 3500);
  };

  // Fixed Excluir Cliente: Works directly without window.confirm and deletes from Firebase
  const handleDeleteClient = (clientId: string) => {
    const client = vipClients.find((c) => c.id === clientId);
    if (!client) return;
    const updated = vipClients.filter((c) => c.id !== clientId);
    updateVipClients(updated);
    deleteClientFromStorage(clientId);
    setClientActionFeedback({
      text: `Cliente "${client.name}" removido com sucesso do sistema e do banco de dados!`,
      type: 'success',
    });
    setTimeout(() => setClientActionFeedback(null), 3500);
  };

  // Inline credentials editor for a client
  const handleStartEditCredentials = (client: VipClientRecord) => {
    setEditingCredentialsId(client.id);
    setEditName(client.name);
    setEditAccessNumber(client.accessNumber || '');
    setEditPassword(client.password || '123456');
    setEditEmail(client.email || '');
  };

  const handleSaveEditedCredentials = (clientId: string) => {
    const updated = vipClients.map((c) => {
      if (c.id === clientId) {
        return {
          ...c,
          name: editName.trim() || c.name,
          accessNumber: editAccessNumber.trim() || c.accessNumber,
          password: editPassword.trim() || c.password,
          email: editEmail.trim() || c.email,
        };
      }
      return c;
    });
    updateVipClients(updated);
    setEditingCredentialsId(null);
    setClientActionFeedback({
      text: 'Número, senha e dados do cliente atualizados com sucesso!',
      type: 'success',
    });
    setTimeout(() => setClientActionFeedback(null), 3500);
  };

  // Firebase Handlers
  const handleSaveAndConnectFirebase = async () => {
    if (!firebaseConfig.apiKey.trim() || !firebaseConfig.projectId.trim()) {
      setClientActionFeedback({
        text: 'Preencha ao menos a apiKey e o projectId do Firebase.',
        type: 'error',
      });
      setTimeout(() => setClientActionFeedback(null), 3500);
      return;
    }
    setIsFirebaseSyncing(true);
    const saved = saveFirebaseConfig(firebaseConfig);
    if (!saved) {
      setIsFirebaseSyncing(false);
      setClientActionFeedback({ text: 'Falha ao salvar configuração.', type: 'error' });
      return;
    }
    const testResult = await testFirebaseConnection(firebaseConfig);
    setIsFirebaseSyncing(false);
    if (testResult.success) {
      setIsFirebaseConnected(true);
      // Immediately push existing clients to Firebase
      persistVipClients(vipClients);
      setClientActionFeedback({
        text: 'Firebase Firestore conectado! Dados de clientes sincronizados na nuvem.',
        type: 'success',
      });
    } else {
      setIsFirebaseConnected(false);
      setClientActionFeedback({
        text: `Aviso Firebase: ${testResult.message}`,
        type: 'error',
      });
    }
    setTimeout(() => setClientActionFeedback(null), 4500);
  };

  const handleSyncWithFirebaseNow = async () => {
    setIsFirebaseSyncing(true);
    try {
      // 1. Fetch remote clients
      const remote = await fetchVipClientsFromStorage();
      if (remote && remote.length > 0) {
        const mergedMap = new Map<string, VipClientRecord>();
        vipClients.forEach((c) => mergedMap.set(c.id, c));
        remote.forEach((c) => mergedMap.set(c.id, c));
        const merged = Array.from(mergedMap.values());
        updateVipClients(merged);
      } else {
        // Push local to remote
        await persistVipClients(vipClients);
      }

      // 2. Fetch referrals
      const refs = await fetchReferralsFromStorage();
      if (refs && refs.length > 0) {
        setAllReferrals(refs);
      }
      setClientActionFeedback({
        text: 'Sincronização com o Firebase Firestore realizada com sucesso!',
        type: 'success',
      });
    } catch (err: any) {
      setClientActionFeedback({
        text: `Erro ao sincronizar: ${err.message || 'Falha de rede'}`,
        type: 'error',
      });
    } finally {
      setIsFirebaseSyncing(false);
      setTimeout(() => setClientActionFeedback(null), 3500);
    }
  };

  const handleDisconnectFirebase = () => {
    removeFirebaseConfig();
    setIsFirebaseConnected(false);
    setClientActionFeedback({
      text: 'Firebase desconectado. O sistema usará armazenamento local temporário.',
      type: 'success',
    });
    setTimeout(() => setClientActionFeedback(null), 3500);
  };

  const handleCopyClientVipLink = async (client: VipClientRecord) => {
    const link = `${window.location.origin}${window.location.pathname}?client=${encodeURIComponent(
      client.name
    )}&allAccess=true`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedClientId(client.id);
      setTimeout(() => setCopiedClientId(null), 2500);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSendVipLinkWhatsApp = (client: VipClientRecord) => {
    const link = `${window.location.origin}${window.location.pathname}?client=${encodeURIComponent(
      client.name
    )}&allAccess=true`;
    const days = calcVipDaysRemaining(client.expiresAt);
    const msg = encodeURIComponent(
      `Olá ${client.name}! Seu Passe VIP Cineflix está liberado por ${days} dias!\n\nAcesse diretamente por este link exclusivo:\n${link}\n\nBom entretenimento!`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const handleAddReferralToClient = (clientId: string, friendName: string) => {
    if (!friendName.trim()) return;
    const nowStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const updated = vipClients.map((c) => {
      if (c.id === clientId) {
        return {
          ...c,
          referrals: [...c.referrals, { name: friendName.trim(), date: nowStr, status: 'pago' as const }],
        };
      }
      return c;
    });
    updateVipClients(updated);
    setNewFriendName('');
    setTargetClientIdForFriend('');
    setClientActionFeedback({ text: `Indicação adicionada com sucesso!`, type: 'success' });
    setTimeout(() => setClientActionFeedback(null), 3000);
  };

  // Protection gate: require admin password if not authenticated
  if (!isAdminUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
        <div className="relative w-full max-w-md bg-[#0b0f17] border border-white/10 rounded-2xl shadow-2xl p-6 text-center space-y-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-pink-600/15 border border-pink-500/30 text-pink-500 mx-auto flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>

          <div>
            <h3 className="font-display font-bold text-white text-lg">
              Painel Administrativo Restrito
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Digite a senha mestra para acessar o gerenciamento de séries, clientes VIP e arquivos.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (adminPassInput === universalPassword) {
                setIsAdminUnlocked(true);
                sessionStorage.setItem('cineflix_admin_auth', 'true');
                setAdminAuthError(false);
              } else {
                setAdminAuthError(true);
              }
            }}
            className="space-y-3 pt-1"
          >
            <input
              type="password"
              autoFocus
              value={adminPassInput}
              onChange={(e) => {
                setAdminPassInput(e.target.value);
                setAdminAuthError(false);
              }}
              placeholder="Senha de Administrador..."
              className="w-full px-4 py-2.5 bg-black/60 border border-white/15 focus:border-pink-500 rounded-xl text-white text-xs font-mono text-center tracking-widest focus:outline-none"
            />

            {adminAuthError && (
              <p className="text-xs text-rose-400 font-semibold">
                Senha incorreta. Tente novamente.
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all active:scale-95"
            >
              Acessar Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl bg-[#0b0d14] border border-pink-500/30 rounded-2xl shadow-2xl shadow-pink-950/40 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-lg sm:text-xl text-white">
                MINI <span className="text-pink-500">NOVELAS</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-pink-600/20 text-pink-400 border border-pink-500/30 font-bold">
                Painel do Administrador
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 hidden xs:block">
              Controle de séries, sincronização Bunny, banco de clientes VIP e links exclusivos.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Painel"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Shifted safely downwards, separated from header, large font, 100% visible on mobile and desktop */}
        <div className="pt-3.5 pb-3.5 px-3 sm:px-5 bg-[#07090f] border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-pink-400">
              Funcionalidades do Painel de Controle:
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Toque em qualquer funcionalidade abaixo para navegar
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* TAB 1: GERENCIAR SÉRIES */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('manage');
                setEditorMode('list');
              }}
              className={`py-3 px-2 sm:px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 text-center min-h-[52px] ${
                activeTab === 'manage'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xl shadow-pink-600/40 border border-pink-400/60 ring-2 ring-pink-500/30'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 hover:text-white border border-white/15'
              }`}
            >
              <Video className="w-4 h-4 shrink-0 text-pink-300" />
              <span>Gerenciar Séries</span>
            </button>

            {/* TAB: SINCRONIZAR BUNNY */}
            <button
              type="button"
              onClick={() => setActiveTab('sync')}
              className={`py-3 px-2 sm:px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 text-center min-h-[52px] ${
                activeTab === 'sync'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xl shadow-pink-600/40 border border-pink-400/60 ring-2 ring-pink-500/30'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 hover:text-white border border-white/15'
              }`}
            >
              <RotateCcw className="w-4 h-4 shrink-0 text-pink-300" />
              <span>Sincronizar Bunny</span>
            </button>

            {/* TAB: BUNNY.NET */}
            <button
              type="button"
              onClick={() => setActiveTab('bunny')}
              className={`py-3 px-2 sm:px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 text-center min-h-[52px] ${
                activeTab === 'bunny'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xl shadow-pink-600/40 border border-pink-400/60 ring-2 ring-pink-500/30'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 hover:text-white border border-white/15'
              }`}
            >
              <Radio className="w-4 h-4 shrink-0 text-pink-300" />
              <span>Configurar Bunny</span>
            </button>

            {/* TAB 2: GERENCIAR CLIENTES & TEMPO VIP */}
            <button
              type="button"
              onClick={() => setActiveTab('clients')}
              className={`py-3 px-2 sm:px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 text-center min-h-[52px] ${
                activeTab === 'clients'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xl shadow-pink-600/40 border border-pink-400/60 ring-2 ring-pink-500/30'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 hover:text-white border border-white/15'
              }`}
            >
              <Crown className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Clientes Tempo VIP</span>
            </button>

            {/* TAB 3: GERAR LINK */}
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`py-3 px-2 sm:px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 text-center min-h-[52px] ${
                activeTab === 'link'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xl shadow-pink-600/40 border border-pink-400/60 ring-2 ring-pink-500/30'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 hover:text-white border border-white/15'
              }`}
            >
              <Send className="w-4 h-4 shrink-0 text-pink-300" />
              <span>Gerar Link Cliente</span>
            </button>

            {/* TAB 4: PIX & AJUSTES */}
            <button
              type="button"
              onClick={() => setActiveTab('payment')}
              className={`py-3 px-2 sm:px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 text-center min-h-[52px] ${
                activeTab === 'payment'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xl shadow-pink-600/40 border border-pink-400/60 ring-2 ring-pink-500/30'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 hover:text-white border border-white/15'
              }`}
            >
              <QrCode className="w-4 h-4 shrink-0 text-pink-300" />
              <span>PIX & WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-left">
          {/* ========================================================================= */}
          {/* SECTION: GERENCIAR SÉRIES */}
          {/* ========================================================================= */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* LIST MODE: Display all series with action buttons and "+ Nova Série" */}
              {editorMode === 'list' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <h3 className="font-display font-bold text-white text-sm">
                        Catálogo de Séries Cadastradas ({seriesList.length})
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Adicione novas séries, vincule vídeos do Google Drive ou MP4 e visualize como o cliente verá.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('sync')}
                        className="px-3.5 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 shadow-sm"
                        title="Sincronizar arquivos da Bunny Storage Zone ou Stream"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                        <span>Sincronizar vídeos</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleStartNewSeries}
                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Nova Série</span>
                      </button>
                    </div>
                  </div>

                  {/* Drag and Drop multi-file area for automatic inspection & registration */}
                  <DropzoneUploadArea
                    onSeriesGeneratedFromFiles={handleSeriesGeneratedFromFiles}
                    onEpisodeGeneratedFromFile={handleEpisodeGeneratedFromFile}
                  />

                  {/* Series Cards */}
                  <div className="space-y-3">
                    {seriesList.map((series) => {
                      const isUnlocked = unlockedSet.has(series.id);
                      const epCount = series.episodes ? series.episodes.length : 1;

                      return (
                        <div
                          key={series.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 gap-3 hover:border-pink-500/30 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={series.coverUrl}
                              alt={series.title}
                              className="w-14 h-16 object-cover rounded-lg shrink-0 border border-white/10"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-white text-sm truncate">
                                {series.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {series.synopsis || series.tagline}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                                <span className="text-pink-400 font-semibold">{series.category}</span>
                                <span>·</span>
                                <span className="text-slate-300 font-mono flex items-center gap-1">
                                  <FileVideo className="w-3 h-3 text-pink-500" />
                                  {epCount} {epCount === 1 ? 'Episódio' : 'Episódios'}
                                </span>
                                {series.aspectRatio === '9:16' && (
                                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono border border-amber-500/20">
                                    9:16 Vertical
                                  </span>
                                )}
                                {series.status === 'draft' ? (
                                  <span className="text-[10px] text-slate-400 bg-white/10 px-1.5 py-0.5 rounded uppercase font-bold">
                                    Rascunho
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase font-bold">
                                    Publicado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: VISUALIZAR, EDITAR, EXCLUIR */}
                          <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                            {/* VISUALIZAR */}
                            <button
                              type="button"
                              onClick={() => handlePreviewCurrentSeries(series)}
                              className="px-3 py-1.5 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-lg border border-pink-500/40 hover:border-pink-500 transition-colors flex items-center gap-1 shadow-sm"
                              title="Visualizar exatamente como o cliente verá"
                            >
                              <Eye className="w-3.5 h-3.5 text-pink-500" />
                              <span>VISUALIZAR</span>
                            </button>

                            {/* EDITAR */}
                            <button
                              type="button"
                              onClick={() => handleEditSeries(series)}
                              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-lg border border-white/10 transition-colors flex items-center gap-1"
                              title="Editar série e episódios"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-300" />
                              <span>EDITAR</span>
                            </button>

                            {/* EXCLUIR */}
                            {seriesList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCurrentSeries(series.id)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Excluir série"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EDIT / NEW MODE: Form for Series + Episodes Management */}
              {editorMode === 'edit' && (
                <div className="space-y-4">
                  {/* Top Bar with Back and Main Actions */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <h3 className="font-display font-bold text-white text-base">
                        {editingSeriesId ? 'Editar Série & Episódios' : 'Nova Série'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Preencha as informações da série e adicione seus episódios.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditorMode('list')}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs rounded-lg border border-white/10 transition-colors"
                      >
                        Voltar à Lista
                      </button>
                    </div>
                  </div>

                  {/* 1. Series Metadata Form */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-pink-400 block">
                      Informações da Série:
                    </span>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nome da série:
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Ex: O Código da Mente"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Descrição:
                      </label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={2}
                        placeholder="Descreva a história e os principais temas da série..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-pink-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          URL da Capa (Vertical ou Padrão):
                        </label>
                        <input
                          type="url"
                          value={formCoverUrl}
                          onChange={(e) => setFormCoverUrl(e.target.value)}
                          placeholder="https://exemplo.com/capa.jpg"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none font-mono text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          URL do Banner (Widescreen / TV):
                        </label>
                        <input
                          type="url"
                          value={formBannerUrl}
                          onChange={(e) => setFormBannerUrl(e.target.value)}
                          placeholder="https://exemplo.com/banner.jpg"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Categoria:
                        </label>
                        <input
                          type="text"
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          placeholder="Ex: Mini Novelas / Drama"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Proporção do Player:
                        </label>
                        <select
                          value={formAspectRatio}
                          onChange={(e: any) => setFormAspectRatio(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                        >
                          <option value="auto">Automático</option>
                          <option value="9:16">9:16 Vertical (Mini Novelas)</option>
                          <option value="16:9">16:9 Horizontal (Cinema/TV)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Status da Série:
                        </label>
                        <select
                          value={formStatus}
                          onChange={(e: any) => setFormStatus(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                        >
                          <option value="published">Publicado no Catálogo</option>
                          <option value="draft">Rascunho (Privado)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Prévia Grátis (Segundos):
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="600"
                          value={formPreviewLimitSeconds}
                          onChange={(e) => setFormPreviewLimitSeconds(Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          URL da Legenda (.vtt ou .srt convertido):
                        </label>
                        <input
                          type="url"
                          value={formSubtitleUrl}
                          onChange={(e) => setFormSubtitleUrl(e.target.value)}
                          placeholder="https://exemplo.com/legendas.vtt"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none font-mono text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Idioma:
                        </label>
                        <input
                          type="text"
                          value={formLanguage}
                          onChange={(e) => setFormLanguage(e.target.value)}
                          placeholder="Português (BR)"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Episodes Section */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-pink-400 block">
                          Episódios da Série ({formEpisodes.length}):
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Aceita links do Google Drive (convertidos automaticamente), MP4 direto, HLS (.m3u8) e streaming.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingEpisode(true);
                          setEpNumber(formEpisodes.length + 1);
                          setEpTitle(`Episódio ${formEpisodes.length + 1}`);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-md shadow-pink-600/30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Adicionar Episódio</span>
                      </button>
                    </div>

                    {/* Inline Form to Add New Episode */}
                    {isAddingEpisode && (
                      <div className="p-3.5 rounded-xl bg-black/60 border border-pink-500/40 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span>Novo Episódio</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingEpisode(false)}
                            className="text-slate-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] text-slate-300 mb-1">
                              Temporada:
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={epSeasonNumber}
                              onChange={(e) => setEpSeasonNumber(Number(e.target.value))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="block text-[11px] text-slate-300 mb-1">
                              Nº Ep:
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={epNumber}
                              onChange={(e) => setEpNumber(Number(e.target.value))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] text-slate-300 mb-1">
                              Título do episódio:
                            </label>
                            <input
                              type="text"
                              value={epTitle}
                              onChange={(e) => setEpTitle(e.target.value)}
                              placeholder="Ex: Episódio 1 - A Revelação"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            URL do vídeo (Bunny HLS .m3u8, MP4 ou Embed):
                          </label>
                          <input
                            type="text"
                            value={epVideoUrl}
                            onChange={(e) => setEpVideoUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/d/... ou https://...mp4"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-[11px] focus:outline-none focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            URL da Legenda do Episódio (Opcional - .vtt ou .srt):
                          </label>
                          <input
                            type="text"
                            value={epSubtitleUrl}
                            onChange={(e) => setEpSubtitleUrl(e.target.value)}
                            placeholder="https://exemplo.com/ep-legenda.vtt"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-[11px] focus:outline-none"
                          />

                          {/* Live Video Detection Feedback Badge */}
                          {epVideoUrl.trim() && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                              {videoDetection.provider === 'gdrive' ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{videoDetection.message}</span>
                                </span>
                              ) : videoDetection.provider === 'direct' ? (
                                <span className="text-blue-400 font-semibold flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{videoDetection.message}</span>
                                </span>
                              ) : (
                                <span className="text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{videoDetection.message}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingEpisode(false)}
                            className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddEpisodeToForm}
                            className="px-4 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-lg transition-colors"
                          >
                            Confirmar Episódio
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Episodes List & Reorganizing */}
                    {formEpisodes.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        {formEpisodes.map((ep, idx) => {
                          const parsed = parseVideoSource(ep.videoUrl);
                          return (
                            <div
                              key={ep.id || idx}
                              className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-pink-600/20 border border-pink-500/30 text-pink-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                  {ep.episodeNumber || idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">
                                    {ep.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="font-mono text-slate-500 truncate max-w-[150px] sm:max-w-xs">
                                      {ep.videoUrl}
                                    </span>
                                    <span>·</span>
                                    <span className="uppercase text-pink-400 font-bold font-mono">
                                      {parsed.provider}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Reorganize (Move Up / Move Down) and Delete */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveEpisode(idx, 'up')}
                                  title="Mover para cima"
                                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 rounded"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === formEpisodes.length - 1}
                                  onClick={() => handleMoveEpisode(idx, 'down')}
                                  title="Mover para baixo"
                                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 rounded"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEpisode(ep.id)}
                                  title="Excluir episódio"
                                  className="p-1 text-slate-400 hover:text-rose-400 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        Nenhum episódio adicionado ainda. Clique em "+ Adicionar Episódio" acima para cadastrar vídeos do Google Drive ou MP4.
                      </p>
                    )}
                  </div>

                  {/* 3. Action Buttons: SALVAR, EDITAR, EXCLUIR, VISUALIZAR */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      {/* SALVAR E PUBLICAR */}
                      <button
                        type="button"
                        onClick={(e) => handleSaveSeries(e, 'published')}
                        className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        <span>Publicar Série</span>
                      </button>

                      {/* SALVAR COMO RASCUNHO */}
                      <button
                        type="button"
                        onClick={(e) => handleSaveSeries(e, 'draft')}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4 text-amber-400" />
                        <span>Salvar Rascunho</span>
                      </button>

                      {/* VISUALIZAR */}
                      <button
                        type="button"
                        onClick={() => handlePreviewCurrentSeries()}
                        className="px-4 py-2.5 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-xl border border-pink-500/40 hover:border-pink-500 transition-colors flex items-center gap-1.5 shadow-md"
                        title="Visualizar a série exatamente como o cliente verá"
                      >
                        <Eye className="w-4 h-4 text-pink-500" />
                        <span>Visualizar no Player</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* EXCLUIR */}
                      {editingSeriesId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCurrentSeries(editingSeriesId)}
                          className="px-3 py-2 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>EXCLUIR</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: SINCRONIZAR BUNNY AUTOMÁTICO */}
          {/* ========================================================================= */}
          {activeTab === 'sync' && (
            <BunnySyncTab
              seriesList={seriesList}
              onAddSeries={onAddSeries}
              onUpdateSeries={onUpdateSeries}
              onPreviewSeries={onSelectSeriesForPreview}
            />
          )}

          {/* ========================================================================= */}
          {/* SECTION: HOSPEDAGEM & BUNNY.NET */}
          {/* ========================================================================= */}
          {activeTab === 'bunny' && (
            <BunnyConfigTab />
          )}

          {/* ========================================================================= */}
          {/* SECTION: GERAR LINK DO CLIENTE */}
          {/* ========================================================================= */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <label className="block text-xs font-bold text-white">
                  Qual plano o cliente comprou com você?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* PLANO 1: SÉRIE ÚNICA */}
                  <button
                    type="button"
                    onClick={() => setAccessType('single')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      accessType === 'single'
                        ? 'bg-pink-600/25 border-pink-500 text-white shadow-lg shadow-pink-600/20'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-white">
                      <Video className="w-3.5 h-3.5 text-pink-400" />
                      <span>Série Única (R$ 5)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Libera 1 série e as outras continuam com prévia de 2 min.
                    </p>
                  </button>

                  {/* PLANO 2: PACOTE 3 SÉRIES (NOVO) */}
                  <button
                    type="button"
                    onClick={() => setAccessType('package3')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      accessType === 'package3'
                        ? 'bg-pink-600/25 border-pink-500 text-white shadow-lg shadow-pink-600/20'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-white">
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      <span>3 Séries (R$ 10)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Combo especial: o cliente escolhe 3 séries completas por R$ 10.
                    </p>
                  </button>

                  {/* PLANO 3: MENSALIDADE VIP */}
                  <button
                    type="button"
                    onClick={() => setAccessType('all')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      accessType === 'all'
                        ? 'bg-pink-600/25 border-pink-500 text-white shadow-lg shadow-pink-600/20'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-white">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>VIP Total (R$ 29,90)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Acesso ilimitado a 100% de todas as séries do Mini Novelas.
                    </p>
                  </button>
                </div>
              </div>

              {/* Package 3 Series Selector */}
              {accessType === 'package3' && (
                <div className="p-3 bg-white/5 border border-pink-500/30 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-pink-300">
                    Selecione as 3 séries incluídas no pacote de R$ 10:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {seriesList.map((s) => {
                      const isSelected = selectedPackageSeriesIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (selectedPackageSeriesIds.length > 1) {
                                setSelectedPackageSeriesIds((prev) => prev.filter((id) => id !== s.id));
                              }
                            } else {
                              if (selectedPackageSeriesIds.length < 3) {
                                setSelectedPackageSeriesIds((prev) => [...prev, s.id]);
                              } else {
                                setSelectedPackageSeriesIds((prev) => [...prev.slice(1), s.id]);
                              }
                            }
                          }}
                          className={`p-2 rounded-lg text-xs font-bold text-left border flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-pink-600/30 border-pink-500 text-white'
                              : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="truncate pr-1">{s.title}</span>
                          {isSelected ? <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {selectedPackageSeriesIds.length} de 3 séries selecionadas
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accessType === 'single' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Série liberada para este cliente:
                    </label>
                    <select
                      value={selectedSeriesId}
                      onChange={(e) => setSelectedSeriesId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                    >
                      {seriesList.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0b0f17] text-white">
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={accessType === 'all' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Cliente:
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              {accessType !== 'all' && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span>Tempo de prévia das outras séries (R$ 5 no Pix):</span>
                    <span className="font-mono text-pink-400 font-bold">{previewSeconds}s ({Math.floor(previewSeconds / 60)} min)</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="300"
                    step="15"
                    value={previewSeconds}
                    onChange={(e) => setPreviewSeconds(Number(e.target.value))}
                    className="w-full accent-pink-600"
                  />
                </div>
              )}

              {/* Generated link */}
              <div className="bg-black/60 border border-white/10 rounded-xl p-3.5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400">
                  Link Exclusivo para Enviar ao Cliente:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={customerLink}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                {/* Direct WhatsApp Send */}
                <button
                  type="button"
                  onClick={handleSendLinkWhatsApp}
                  className="w-full py-2 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-xl border border-pink-500/40 hover:border-pink-500 shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-pink-500" />
                  <span>Enviar Link no WhatsApp para o Cliente</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: GERENCIAR CLIENTES & TEMPO VIP */}
          {/* ========================================================================= */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              {/* Feedback toast banner */}
              {clientActionFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                    clientActionFeedback.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {clientActionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{clientActionFeedback.text}</span>
                </div>
              )}

              {/* Sub-Tabs: Clientes VIP | Amigos Indicados | Conectar Firebase */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveClientsSubTab('clients')}
                  className={`py-2 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                    activeClientsSubTab === 'clients'
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 border border-pink-400/50'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Clientes Cadastrados ({vipClients.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientsSubTab('referrals')}
                  className={`py-2 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                    activeClientsSubTab === 'referrals'
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 border border-pink-400/50'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5 text-amber-400" />
                  <span>Amigos Indicados (Registros)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientsSubTab('firebase')}
                  className={`py-2 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                    activeClientsSubTab === 'firebase'
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 border border-pink-400/50'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>Banco de Dados Firebase</span>
                  {isFirebaseConnected ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 ml-0.5" />
                  )}
                </button>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SUBTAB 1: CLIENTES VIP & TEMPO */}
              {/* ------------------------------------------------------------- */}
              {activeClientsSubTab === 'clients' && (
                <div className="space-y-4">
                  {/* Cloud status bar */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}
                      />
                      <span className="text-xs text-slate-200">
                        Status do Banco de Dados:{' '}
                        <strong>
                          {isFirebaseConnected
                            ? 'Firebase Firestore Conectado (Nuvem Ativa)'
                            : 'Armazenamento Local (Conecte o Firebase na aba ao lado)'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSyncWithFirebaseNow}
                        disabled={isFirebaseSyncing}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isFirebaseSyncing ? 'animate-spin' : ''}`} />
                        <span>{isFirebaseSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem'}</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 1: CADASTRAR NOVO CLIENTE COM NÚMERO E SENHA */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                        <Plus className="w-4 h-4 text-pink-400" />
                        <span>Cadastrar Novo Cliente VIP (Número & Senha)</span>
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        Cada cliente tem número e senha exclusivos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Nome */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Nome do Cliente: <span className="text-pink-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Carlos Silva ou Jefferson"
                          value={targetClientName}
                          onChange={(e) => setTargetClientName(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none"
                        />
                      </div>

                      {/* Número do Cliente */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Número do Cliente: <span className="text-pink-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={`Ex: Cliente ${vipClients.length + 1}`}
                            value={targetClientNumber}
                            onChange={(e) => setTargetClientNumber(e.target.value)}
                            className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none font-mono"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Ex: Cliente 1, 001, 1 ou ID
                        </span>
                      </div>

                      {/* Senha do Cliente */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Senha de Acesso: <span className="text-pink-400">*</span>
                        </label>
                        <div className="relative">
                          <KeyRound className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                          <input
                            type="text"
                            placeholder="Ex: 123456 ou senha"
                            value={targetClientPassword}
                            onChange={(e) => setTargetClientPassword(e.target.value)}
                            className="w-full bg-black/60 border border-white/15 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none font-mono"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Senha que o cliente digita para entrar
                        </span>
                      </div>

                      {/* Email ou Celular Opcional */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          E-mail ou WhatsApp (opcional):
                        </label>
                        <input
                          type="text"
                          placeholder="cliente@email.com"
                          value={targetClientEmail}
                          onChange={(e) => setTargetClientEmail(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Tempo de VIP a Adicionar */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                        Tempo de VIP Inicial do Cliente:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDaysToAdd(30);
                            setCustomDaysInput('30');
                          }}
                          className={`py-2 px-2.5 rounded-lg border font-bold transition-all text-center ${
                            selectedDaysToAdd === 30
                              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-md shadow-pink-600/30'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          +30 Dias (1 Mês)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDaysToAdd(60);
                            setCustomDaysInput('60');
                          }}
                          className={`py-2 px-2.5 rounded-lg border font-bold transition-all text-center ${
                            selectedDaysToAdd === 60
                              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-md shadow-pink-600/30'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          +60 Dias (2 Meses)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDaysToAdd(15);
                            setCustomDaysInput('15');
                          }}
                          className={`py-2 px-2.5 rounded-lg border font-bold transition-all text-center ${
                            selectedDaysToAdd === 15
                              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-md shadow-pink-600/30'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          +15 Dias
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDaysToAdd(7);
                            setCustomDaysInput('7');
                          }}
                          className={`py-2 px-2.5 rounded-lg border font-bold transition-all text-center ${
                            selectedDaysToAdd === 7
                              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-md shadow-pink-600/30'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          +7 Dias
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] text-slate-400">Ou digite quantidade personalizada:</span>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={customDaysInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomDaysInput(val);
                            const num = parseInt(val, 10);
                            if (!isNaN(num) && num > 0) {
                              setSelectedDaysToAdd(num);
                            }
                          }}
                          className="w-20 bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white text-center font-mono focus:border-pink-500 focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-400">dias</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddOrExtendVip(targetClientName, selectedDaysToAdd)}
                        className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg shadow-pink-600/30 border border-pink-400/40 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Crown className="w-4 h-4 fill-white" />
                        <span>Cadastrar Cliente VIP & Salvar</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: LISTA DE CLIENTES CADASTRADOS & CONTROLE COMPLETO */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-pink-400" />
                          <span>Clientes Cadastrados ({vipClients.length})</span>
                        </h3>
                      </div>

                      {/* Search Bar */}
                      <div className="relative min-w-[200px] sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar por nome ou número..."
                          value={clientSearchFilter}
                          onChange={(e) => setClientSearchFilter(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Filter pills */}
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <button
                        type="button"
                        onClick={() => setClientStatusFilter('all')}
                        className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                          clientStatusFilter === 'all'
                            ? 'bg-pink-600 text-white'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Todos ({vipClients.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientStatusFilter('active')}
                        className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                          clientStatusFilter === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        VIP Ativo ({vipClients.filter((c) => isVipRecordActive(c.expiresAt)).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientStatusFilter('expired')}
                        className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                          clientStatusFilter === 'expired'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Expirados / Inativos ({vipClients.filter((c) => !isVipRecordActive(c.expiresAt)).length})
                      </button>
                    </div>

                    {/* Clients List */}
                    <div className="space-y-3">
                      {vipClients
                        .filter((c) => {
                          if (clientSearchFilter.trim()) {
                            const q = normalizeClientName(clientSearchFilter);
                            const nameMatch = normalizeClientName(c.name).includes(q);
                            const numMatch = normalizeClientName(c.accessNumber || '').includes(q);
                            if (!nameMatch && !numMatch) return false;
                          }
                          if (clientStatusFilter === 'active') return isVipRecordActive(c.expiresAt);
                          if (clientStatusFilter === 'expired') return !isVipRecordActive(c.expiresAt);
                          return true;
                        })
                        .map((client, idx) => {
                          const isActive = isVipRecordActive(client.expiresAt);
                          const daysLeft = calcVipDaysRemaining(client.expiresAt);
                          const expDate = new Date(client.expiresAt);
                          const count = client.referrals ? client.referrals.length : 0;
                          const isEditingThis = editingClientId === client.id;
                          const isEditingCredentials = editingCredentialsId === client.id;
                          const clientNumberDisplay = client.accessNumber || `Cliente ${idx + 1}`;
                          const clientPasswordDisplay = client.password || '123456';

                          return (
                            <div
                              key={client.id}
                              className={`p-4 rounded-xl border transition-all ${
                                isActive
                                  ? 'bg-white/[0.04] border-white/10 hover:border-pink-500/40'
                                  : 'bg-white/[0.02] border-white/5 opacity-80'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-display font-black text-white text-base">
                                      {client.name}
                                    </span>

                                    {/* Number pill */}
                                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-pink-600/20 text-pink-300 border border-pink-500/40">
                                      🔢 {clientNumberDisplay}
                                    </span>

                                    {/* Password pill */}
                                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-white/10 text-amber-300 border border-white/15">
                                      🔑 Senha: {clientPasswordDisplay}
                                    </span>

                                    {isActive ? (
                                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>VIP ATIVO ({daysLeft} {daysLeft === 1 ? 'dia' : 'dias'})</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                        EXPIRADO / INATIVO
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1.5 flex-wrap">
                                    {client.email && <span>✉️ {client.email} ·</span>}
                                    <span>
                                      {isActive
                                        ? `Vence em: ${expDate.toLocaleDateString('pt-BR')} às ${expDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                        : `Expirou em: ${expDate.toLocaleDateString('pt-BR')}`}
                                    </span>
                                    <span>·</span>
                                    <span>{count} amigo(s) indicado(s)</span>
                                  </div>
                                </div>

                                {/* Direct Actions: +30d, +7d, Editar, Zerar, Excluir */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleDirectAddDays(client.id, 30)}
                                    title="Adicionar +30 dias de VIP a este cliente"
                                    className="px-2.5 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3 stroke-[3]" />
                                    <span>+30 Dias</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDirectAddDays(client.id, 7)}
                                    title="Adicionar +7 dias de VIP a este cliente"
                                    className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>+7d</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingClientId(isEditingThis ? null : client.id);
                                      setEditingDaysValue(daysLeft.toString());
                                    }}
                                    title="Ajustar quantidade exata de dias"
                                    className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-[11px] rounded-lg border border-white/10 transition-colors"
                                  >
                                    {isEditingThis ? 'Cancelar' : 'Definir Dias'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleStartEditCredentials(client)}
                                    title="Editar Nome, Número e Senha deste cliente"
                                    className="px-2 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 font-bold text-[11px] rounded-lg border border-pink-500/30 transition-colors flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Editar Senha / Nº</span>
                                  </button>

                                  {isActive && (
                                    <button
                                      type="button"
                                      onClick={() => handleResetVip(client.id)}
                                      title="Zerar tempo VIP imediatamente (pausar/revogar acesso)"
                                      className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white font-bold text-[11px] rounded-lg border border-amber-500/30 transition-colors"
                                    >
                                      Zerar VIP
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClient(client.id)}
                                    title="Excluir cliente permanentemente do sistema e do Firebase"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors border border-transparent hover:border-rose-500/30"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Inline Edit Credentials Drawer */}
                              {isEditingCredentials && (
                                <div className="mt-3 p-3.5 rounded-xl bg-black/80 border border-pink-500/40 space-y-3 animate-fade-in">
                                  <div className="flex items-center justify-between text-xs font-bold text-pink-300">
                                    <span>Editar Acesso de: {client.name}</span>
                                    <span className="text-[10px] text-slate-400">
                                      Será salvo localmente e no Firebase Firestore
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-1">Nome:</label>
                                      <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-pink-500 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-1">Número do Cliente:</label>
                                      <input
                                        type="text"
                                        value={editAccessNumber}
                                        onChange={(e) => setEditAccessNumber(e.target.value)}
                                        placeholder="Ex: Cliente 1"
                                        className="w-full bg-white/5 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:border-pink-500 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-1">Senha de Acesso:</label>
                                      <input
                                        type="text"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                        placeholder="Ex: 123456"
                                        className="w-full bg-white/5 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:border-pink-500 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-1">E-mail (opcional):</label>
                                      <input
                                        type="text"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        placeholder="cliente@email.com"
                                        className="w-full bg-white/5 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-pink-500 focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingCredentialsId(null)}
                                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-slate-300 text-xs rounded-lg transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditedCredentials(client.id)}
                                      className="px-4 py-1 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md"
                                    >
                                      Salvar Credenciais
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Inline Edit Days Drawer */}
                              {isEditingThis && (
                                <div className="mt-2.5 p-2.5 rounded-lg bg-black/60 border border-pink-500/30 flex items-center gap-2 animate-fade-in">
                                  <span className="text-[11px] text-slate-300">Definir tempo restante para:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={editingDaysValue}
                                    onChange={(e) => setEditingDaysValue(e.target.value)}
                                    className="w-20 bg-black border border-white/20 rounded px-2 py-0.5 text-xs text-center text-pink-300 font-mono focus:outline-none"
                                  />
                                  <span className="text-[11px] text-slate-300">dias</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const num = parseInt(editingDaysValue, 10);
                                      if (!isNaN(num) && num >= 0) {
                                        handleSetExactDays(client.id, num);
                                      }
                                    }}
                                    className="ml-auto px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded transition-colors"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              )}

                              {/* Quick Share Links */}
                              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyClientVipLink(client)}
                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors flex items-center gap-1 text-[11px]"
                                  >
                                    {copiedClientId === client.id ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>{copiedClientId === client.id ? 'Link VIP Copiado!' : 'Copiar Link VIP'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSendVipLinkWhatsApp(client)}
                                    className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-1 text-[11px]"
                                  >
                                    <MessageCircle className="w-3 h-3 text-emerald-400" />
                                    <span>Enviar no WhatsApp</span>
                                  </button>
                                </div>

                                {/* Add Referral Friend Shortcut */}
                                <div className="flex items-center gap-1.5">
                                  {targetClientIdForFriend === client.id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        placeholder="Nome do amigo indicado..."
                                        value={newFriendName}
                                        onChange={(e) => setNewFriendName(e.target.value)}
                                        className="bg-black border border-white/20 rounded px-2 py-0.5 text-[11px] text-white focus:outline-none w-36"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAddReferralToClient(client.id, newFriendName)}
                                        className="px-2 py-0.5 bg-pink-600 text-white font-bold text-[10px] rounded"
                                      >
                                        Confirmar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setTargetClientIdForFriend('')}
                                        className="px-1.5 py-0.5 text-slate-400 text-[10px]"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setTargetClientIdForFriend(client.id)}
                                      className="text-[10px] text-slate-400 hover:text-pink-300 transition-colors flex items-center gap-1"
                                    >
                                      <Gift className="w-3 h-3" />
                                      <span>+ Registrar Amigo Indicado</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                      {vipClients.length === 0 && (
                        <div className="p-8 text-center text-slate-500 bg-white/[0.02] border border-white/5 rounded-xl">
                          Nenhum cliente cadastrado ainda. Use o campo acima para cadastrar seu primeiro cliente VIP com número e senha!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SUBTAB 2: REGISTROS DE AMIGO INDICADO */}
              {/* ------------------------------------------------------------- */}
              {activeClientsSubTab === 'referrals' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>Registros de Amigo Indicado no Banco de Dados</span>
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Aqui aparecem todas as indicações feitas pelos clientes. Toda vez que um amigo indicado assina o Mini Novelas, o sistema registra aqui para você creditar os dias de bônus!
                    </p>
                  </div>

                  {/* List of all referrals */}
                  <div className="space-y-2.5">
                    {(() => {
                      // Gather referrals from vipClients + allReferrals
                      const clientReferrals: Array<{
                        clientName: string;
                        clientId: string;
                        friendName: string;
                        date: string;
                        status: 'pago' | 'pendente';
                      }> = [];

                      vipClients.forEach((c) => {
                        (c.referrals || []).forEach((r) => {
                          clientReferrals.push({
                            clientName: c.name,
                            clientId: c.id,
                            friendName: r.name,
                            date: r.date,
                            status: r.status,
                          });
                        });
                      });

                      if (clientReferrals.length === 0 && allReferrals.length === 0) {
                        return (
                          <div className="p-8 text-center text-slate-500 bg-white/[0.02] border border-white/5 rounded-xl">
                            Nenhum registro de amigo indicado encontrado ainda.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {clientReferrals.map((item, i) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-xs">
                                    Indicado por: <strong className="text-pink-400">{item.clientName}</strong>
                                  </span>
                                  <span className="text-slate-400">➔</span>
                                  <span className="font-bold text-amber-300 text-xs">
                                    Amigo: {item.friendName}
                                  </span>
                                  <span
                                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                      item.status === 'pago'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }`}
                                  >
                                    {item.status === 'pago' ? 'PAGO / CONFIRMADO' : 'PENDENTE'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-1">
                                  Data: {item.date}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDirectAddDays(item.clientId, 7)}
                                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs rounded-lg border border-amber-500/30 transition-all flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+7d Bônus p/ {item.clientName}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SUBTAB 3: CONECTAR FIREBASE FIRESTORE */}
              {/* ------------------------------------------------------------- */}
              {activeClientsSubTab === 'firebase' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-black border border-blue-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-400" />
                        <span>Conexão com Banco de Dados Firebase Firestore</span>
                      </h3>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                          isFirebaseConnected
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                          }`}
                        />
                        <span>{isFirebaseConnected ? 'CONECTADO' : 'DESCONECTADO'}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Conectando o Firebase Firestore, todos os clientes VIP cadastrados, suas senhas, números e tempos restantes ficam salvos permanentemente na nuvem, acessíveis de qualquer dispositivo sem risco de perda!
                    </p>
                  </div>

                  {/* Firebase Configuration Form */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-pink-400">
                      Configuração do Projeto Firebase:
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          API Key (apiKey): <span className="text-pink-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={firebaseConfig.apiKey}
                          onChange={(e) =>
                            setFirebaseConfig((prev) => ({ ...prev, apiKey: e.target.value.trim() }))
                          }
                          placeholder="AIzaSy..."
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:border-pink-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          Project ID (projectId): <span className="text-pink-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={firebaseConfig.projectId}
                          onChange={(e) =>
                            setFirebaseConfig((prev) => ({ ...prev, projectId: e.target.value.trim() }))
                          }
                          placeholder="mini-novelas-app"
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:border-pink-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          Auth Domain (authDomain):
                        </label>
                        <input
                          type="text"
                          value={firebaseConfig.authDomain}
                          onChange={(e) =>
                            setFirebaseConfig((prev) => ({ ...prev, authDomain: e.target.value.trim() }))
                          }
                          placeholder="mini-novelas-app.firebaseapp.com"
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:border-pink-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          App ID (appId):
                        </label>
                        <input
                          type="text"
                          value={firebaseConfig.appId || ''}
                          onChange={(e) =>
                            setFirebaseConfig((prev) => ({ ...prev, appId: e.target.value.trim() }))
                          }
                          placeholder="1:1234567890:web:abcdef"
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:border-pink-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveAndConnectFirebase}
                        disabled={isFirebaseSyncing}
                        className="py-2.5 px-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isFirebaseSyncing ? 'Conectando...' : 'Salvar e Conectar Firebase'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncWithFirebaseNow}
                        disabled={isFirebaseSyncing}
                        className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFirebaseSyncing ? 'animate-spin' : ''}`} />
                        <span>Sincronizar Dados Agora</span>
                      </button>

                      {isFirebaseConnected && (
                        <button
                          type="button"
                          onClick={handleDisconnectFirebase}
                          className="py-2.5 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs rounded-xl border border-rose-500/30 transition-colors ml-auto"
                        >
                          Desconectar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: PIX & WHATSAPP */}
          {/* ========================================================================= */}
          {activeTab === 'payment' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-slate-200 space-y-1">
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Pix Oficial com Padrão Banco Central (BR Code + CRC16)</span>
                </p>
                <p className="text-[11px] text-slate-300">
                  O QR Code e o código Pix Copia e Cola são gerados com validação criptográfica (CRC16-CCITT) aceita em 100% dos bancos brasileiros (Nubank, Itaú, Bradesco, Inter, Caixa, etc.).
                </p>
              </div>

              {/* Pix Key Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo da sua Chave Pix:
                </label>
                <select
                  value={pixTypeInput}
                  onChange={(e) => setPixTypeInput(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                >
                  <option value="phone" className="bg-[#0b0f17] text-white">
                    📱 Celular (obrigatório formato +55 DDD Número no Pix)
                  </option>
                  <option value="cpf" className="bg-[#0b0f17] text-white">
                    🪪 CPF (apenas os 11 números)
                  </option>
                  <option value="email" className="bg-[#0b0f17] text-white">
                    ✉️ E-mail (ex: seuemail@gmail.com)
                  </option>
                  <option value="random" className="bg-[#0b0f17] text-white">
                    🔑 Chave Aleatória (EVP)
                  </option>
                </select>
              </div>

              {/* Pix Key Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sua Chave Pix Cadastrada no Banco:
                </label>
                <input
                  type="text"
                  required
                  value={pixInput}
                  onChange={(e) => setPixInput(e.target.value)}
                  placeholder={pixTypeInput === 'phone' ? 'Ex: 48988487037' : 'Digite sua chave'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none font-mono"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>Chave enviada ao Banco Central:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {formatPixKey(pixInput || '48988487037', pixTypeInput as any)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPixInput(phoneInput || '5548992041577');
                      setPixTypeInput('phone');
                    }}
                    className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/10 transition-colors"
                  >
                    Usar meu WhatsApp como Chave Pix
                  </button>
                  <button
                    type="button"
                    onClick={() => setPixTypeInput('cpf')}
                    className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/10 transition-colors"
                  >
                    Mudar para CPF
                  </button>
                  <button
                    type="button"
                    onClick={() => setPixTypeInput('phone')}
                    className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/10 transition-colors"
                  >
                    Mudar para Celular (+55)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Seu WhatsApp (com DDD e 55):
                </label>
                <input
                  type="text"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Ex: 5548992041577"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha Universal de Login:
                </label>
                <input
                  type="text"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-colors flex items-center gap-1.5 active:scale-95"
              >
                {savedSettings ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{savedSettings ? 'Configurações Salvas com Sucesso!' : 'Salvar Alterações'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
