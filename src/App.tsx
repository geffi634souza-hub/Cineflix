/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { VideoPlayer } from './components/VideoPlayer';
import { SeriesCard } from './components/SeriesCard';
import { PixPaymentModal } from './components/PixPaymentModal';
import { LoginModal } from './components/LoginModal';
import { CreatorPanel } from './components/CreatorPanel';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AppInstallModal } from './components/AppInstallModal';
import { SeriesCompletedModal } from './components/SeriesCompletedModal';
import { NotificationToast } from './components/NotificationToast';
import { VipReferralModal } from './components/VipReferralModal';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { INITIAL_SERIES } from './data/initialSeries';
import { Series } from './types/series';
import { Film, Crown, MessageCircle, Zap } from 'lucide-react';
import {
  VipClientRecord,
  calcVipDaysRemaining,
  isVipRecordActive,
  findVipClient,
  normalizeClientName,
} from './types/vip';

export default function App() {
  // Stored series catalog - guarantee R$ 2 pricing
  const [seriesList, setSeriesList] = useState<Series[]>(() => {
    try {
      const stored = localStorage.getItem('cineflix_series_catalog');
      if (stored) {
        const parsed: Series[] = JSON.parse(stored);
        return parsed.map((s) => ({ ...s, price: 2, promoPrice: 2 }));
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_SERIES;
  });

  // Set of unlocked series IDs
  const [unlockedSet, setUnlockedSet] = useState<Set<string>>(() => {
    const set = new Set<string>();
    INITIAL_SERIES.forEach((s) => {
      if (s.isUnlockedDefault) set.add(s.id);
    });
    try {
      const stored = localStorage.getItem('cineflix_unlocked_set');
      if (stored) {
        const arr = JSON.parse(stored);
        arr.forEach((id: string) => set.add(id));
      }
    } catch (e) {
      console.warn(e);
    }
    return set;
  });

  const [activeSeriesId, setActiveSeriesId] = useState<string>(() => {
    return INITIAL_SERIES[0]?.id || '';
  });

  // Configurable creator settings with exact user defaults
  const [whatsappNumber, setWhatsappNumber] = useState<string>(() => {
    return localStorage.getItem('cineflix_whatsapp_number') || '5548992041577';
  });

  const [pixKey, setPixKey] = useState<string>(() => {
    return localStorage.getItem('cineflix_pix_key') || '48988487037';
  });

  const [pixKeyType, setPixKeyType] = useState<string>(() => {
    return localStorage.getItem('cineflix_pix_key_type') || 'phone';
  });

  const [universalPassword, setUniversalPassword] = useState<string>(() => {
    return localStorage.getItem('cineflix_universal_password') || '123456';
  });

  // Universal login state
  const [loggedUser, setLoggedUser] = useState<string | null>(() => {
    return localStorage.getItem('cineflix_logged_user') || null;
  });

  // VIP Clients List (central source of truth for clients and their VIP subscriptions)
  const [vipClients, setVipClients] = useState<VipClientRecord[]>(() => {
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

  const handleUpdateVipClients = (newClients: VipClientRecord[]) => {
    setVipClients(newClients);
    try {
      localStorage.setItem('cineflix_vip_clients', JSON.stringify(newClients));
    } catch (e) {
      console.warn(e);
    }
  };

  // Customer link context parameters
  const [customerName, setCustomerName] = useState<string | undefined>(undefined);

  // Fallback direct URL all access flag
  const [isUrlAllAccess, setIsUrlAllAccess] = useState<boolean>(() => {
    return localStorage.getItem('cineflix_all_access') === 'true';
  });

  // Effective username of the current session
  const effectiveUserName = loggedUser || customerName || '';

  // Look up current user in registered VIP clients
  const userVipRecord = useMemo(() => {
    if (!effectiveUserName) return null;
    return findVipClient(vipClients, effectiveUserName);
  }, [vipClients, effectiveUserName]);

  // VIP is active ONLY when:
  // 1) The user has a registered record in vipClients and isVipRecordActive(record.expiresAt)
  // OR 2) isUrlAllAccess is true and user is NOT an un-activated/expired logged-in user
  const hasActiveVip = useMemo(() => {
    if (userVipRecord) {
      return isVipRecordActive(userVipRecord.expiresAt);
    }
    // If user is logged in with a name (like "Jefferson") but is NOT active in vipClients:
    // They do NOT have active VIP!
    if (loggedUser) {
      return false;
    }
    return isUrlAllAccess;
  }, [userVipRecord, loggedUser, isUrlAllAccess]);

  const effectiveVipExpiresAt = useMemo(() => {
    if (userVipRecord) return userVipRecord.expiresAt;
    const stored = localStorage.getItem('cineflix_vip_expires_at');
    return stored || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }, [userVipRecord]);

  const effectiveVipActivatedAt = useMemo(() => {
    if (userVipRecord) return userVipRecord.activatedAt;
    const stored = localStorage.getItem('cineflix_vip_activated_at');
    return stored || new Date().toISOString();
  }, [userVipRecord]);

  const vipDaysRemaining = useMemo(() => {
    if (!hasActiveVip) return 0;
    return calcVipDaysRemaining(effectiveVipExpiresAt);
  }, [hasActiveVip, effectiveVipExpiresAt]);

  // Modals state
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isMonthlyPix, setIsMonthlyPix] = useState(false);
  const [pixTargetSeries, setPixTargetSeries] = useState<Series | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCreatorPanelOpen, setIsCreatorPanelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Series Completion & Retention Notifications
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [completedSeries, setCompletedSeries] = useState<Series | null>(null);
  const [nextRecommendedSeries, setNextRecommendedSeries] = useState<Series | null>(null);
  const [showUnfinishedToast, setShowUnfinishedToast] = useState(false);
  const [unfinishedSeries, setUnfinishedSeries] = useState<Series | null>(null);

  // Request browser notification permission politely
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const t = setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 5000);
      return () => clearTimeout(t);
    }
  }, []);

  // Parse URL search parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unlockedParam = params.get('unlocked');
    const unlockedPackageParam = params.get('unlockedPackage');
    const clientParam = params.get('client');
    const previewParam = params.get('preview');
    const allAccessParam = params.get('allAccess');
    const adminParam = params.get('admin');
    const refParam = params.get('ref');

    if (refParam) {
      localStorage.setItem('cineflix_referred_by', refParam);
    }

    if (adminParam === 'true') {
      setIsCreatorPanelOpen(true);
    }

    if (clientParam) {
      setCustomerName(clientParam);
      setLoggedUser(clientParam);
      localStorage.setItem('cineflix_logged_user', clientParam);
    }

    // ALL ACCESS MONTHLY PASS from URL
    if (allAccessParam === 'true') {
      setIsUrlAllAccess(true);
      localStorage.setItem('cineflix_all_access', 'true');
      const now = new Date().toISOString();
      const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('cineflix_vip_activated_at', now);
      localStorage.setItem('cineflix_vip_expires_at', exp);

      if (clientParam) {
        setVipClients((prev) => {
          const existing = findVipClient(prev, clientParam);
          if (existing && isVipRecordActive(existing.expiresAt)) {
            return prev;
          }
          let updated: VipClientRecord[];
          if (existing) {
            updated = prev.map((c) => (c.id === existing.id ? { ...c, expiresAt: exp } : c));
          } else {
            const nextNum = prev.length + 1;
            const newRecord: VipClientRecord = {
              id: `vip-${Date.now()}`,
              name: clientParam.trim(),
              accessNumber: `Cliente ${nextNum}`,
              password: Math.floor(100000 + Math.random() * 900000).toString(),
              referralCode: normalizeClientName(clientParam).replace(/\s+/g, '-'),
              activatedAt: now,
              expiresAt: exp,
              referrals: [],
            };
            updated = [newRecord, ...prev];
          }
          try {
            localStorage.setItem('cineflix_vip_clients', JSON.stringify(updated));
          } catch (e) {
            console.warn(e);
          }
          return updated;
        });
      }

      setUnlockedSet(() => {
        const fullSet = new Set<string>();
        seriesList.forEach((s) => fullSet.add(s.id));
        return fullSet;
      });
    } else if (unlockedPackageParam) {
      const pkgIds = unlockedPackageParam.split(',').filter(Boolean);
      setUnlockedSet((prev) => {
        const next = new Set(prev);
        pkgIds.forEach((id) => next.add(id));
        return next;
      });
      if (pkgIds[0]) {
        setActiveSeriesId(pkgIds[0]);
      }
    } else if (unlockedParam) {
      setUnlockedSet((prev) => {
        const next = new Set(prev);
        next.add(unlockedParam);
        return next;
      });
      setActiveSeriesId(unlockedParam);
    }

    if (previewParam) {
      const pSecs = parseInt(previewParam, 10);
      if (!isNaN(pSecs) && pSecs > 0) {
        setSeriesList((prev) =>
          prev.map((s) => (s.id !== unlockedParam ? { ...s, previewLimitSeconds: pSecs } : s))
        );
      }
    }
  }, [seriesList]);

  // If user has active VIP, guarantee ALL series in catalog are unlocked
  useEffect(() => {
    if (hasActiveVip) {
      setUnlockedSet(new Set(seriesList.map((s) => s.id)));
    }
  }, [hasActiveVip, seriesList]);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cineflix_series_catalog', JSON.stringify(seriesList));
    } catch (e) {
      console.warn(e);
    }
  }, [seriesList]);

  useEffect(() => {
    try {
      localStorage.setItem('cineflix_unlocked_set', JSON.stringify(Array.from(unlockedSet)));
    } catch (e) {
      console.warn(e);
    }
  }, [unlockedSet]);

  const handleUpdateWhatsApp = (phone: string) => {
    setWhatsappNumber(phone);
    localStorage.setItem('cineflix_whatsapp_number', phone);
  };

  const handleUpdatePixKey = (key: string, type?: string) => {
    setPixKey(key);
    localStorage.setItem('cineflix_pix_key', key);
    if (type) {
      setPixKeyType(type);
      localStorage.setItem('cineflix_pix_key_type', type);
    }
  };

  const handleUpdateUniversalPassword = (pass: string) => {
    setUniversalPassword(pass);
    localStorage.setItem('cineflix_universal_password', pass);
  };

  const handleLoginSuccess = (name: string) => {
    setLoggedUser(name);
    localStorage.setItem('cineflix_logged_user', name);
  };

  const handleLogout = () => {
    setLoggedUser(null);
    localStorage.removeItem('cineflix_logged_user');
  };

  const activeSeries = useMemo(() => {
    return seriesList.find((s) => s.id === activeSeriesId) || seriesList[0];
  }, [seriesList, activeSeriesId]);

  // When user has active VIP or series is unlocked, isCurrentActiveUnlocked is strictly TRUE
  const isCurrentActiveUnlocked = hasActiveVip || unlockedSet.has(activeSeries?.id);

  // Categories list for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    seriesList.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [seriesList]);

  const filteredSeries = useMemo(() => {
    // Show published series or current active series or all if admin panel is open
    const base = seriesList.filter((s) => s.status !== 'draft' || s.id === activeSeriesId || isCreatorPanelOpen);
    if (categoryFilter === 'all') return base;
    return base.filter((s) => s.category === categoryFilter);
  }, [seriesList, categoryFilter, activeSeriesId, isCreatorPanelOpen]);

  // User Referral Code
  const userReferralCode = useMemo(() => {
    if (effectiveUserName) {
      return effectiveUserName
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-');
    }
    return 'vip-membro';
  }, [effectiveUserName]);

  // Look up user's referrals count from vipClients
  const referralsCount = useMemo(() => {
    if (userVipRecord) {
      return userVipRecord.referrals ? userVipRecord.referrals.length : 0;
    }
    return 0;
  }, [userVipRecord]);

  // Handlers
  const handleSelectSeries = (series: Series) => {
    setActiveSeriesId(series.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPixModal = (target?: Series) => {
    setIsMonthlyPix(false);
    setPixTargetSeries(target || activeSeries);
    setIsPixModalOpen(true);
  };

  const handleOpenMonthlyPixModal = () => {
    setIsMonthlyPix(true);
    setPixTargetSeries(null);
    setIsPixModalOpen(true);
  };

  const handlePixUnlockSuccess = (seriesIds?: string[] | string, isMonthly?: boolean) => {
    if (isMonthly) {
      setIsUrlAllAccess(true);
      localStorage.setItem('cineflix_all_access', 'true');
      const now = new Date().toISOString();
      const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('cineflix_vip_activated_at', now);
      localStorage.setItem('cineflix_vip_expires_at', exp);

      // Register or extend VIP in vipClients for current user
      const clientNameToRegister = effectiveUserName.trim() || 'Cliente VIP';
      const existing = findVipClient(vipClients, clientNameToRegister);
      let updatedClients: VipClientRecord[];
      if (existing) {
        const curExp = new Date(existing.expiresAt).getTime();
        const base = curExp > Date.now() ? curExp : Date.now();
        const newExp = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString();
        updatedClients = vipClients.map((c) => (c.id === existing.id ? { ...c, expiresAt: newExp } : c));
      } else {
        const nextNum = vipClients.length + 1;
        const newRecord: VipClientRecord = {
          id: `vip-${Date.now()}`,
          name: clientNameToRegister,
          accessNumber: `Cliente ${nextNum}`,
          password: Math.floor(100000 + Math.random() * 900000).toString(),
          referralCode: normalizeClientName(clientNameToRegister).replace(/\s+/g, '-'),
          activatedAt: now,
          expiresAt: exp,
          referrals: [],
        };
        updatedClients = [newRecord, ...vipClients];
      }
      handleUpdateVipClients(updatedClients);

      // Unlock 100% of all series immediately
      setUnlockedSet(new Set(seriesList.map((s) => s.id)));
    } else if (seriesIds) {
      const ids = Array.isArray(seriesIds) ? seriesIds : [seriesIds];
      setUnlockedSet((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // Called when series video completes
  const handleSeriesEnded = (endedSeries: Series) => {
    setCompletedSeries(endedSeries);

    // Pick next series
    const currentIndex = seriesList.findIndex((s) => s.id === endedSeries.id);
    const nextIdx = (currentIndex + 1) % seriesList.length;
    const next = seriesList[nextIdx];
    setNextRecommendedSeries(next);

    setIsCompletedModalOpen(true);

    // Trigger system notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🏆 Parabéns! Você concluiu a série no Mini Novelas!', {
          body: `Que tal começar "${next?.title}" agora por apenas R$ 5,00 no Pix?`,
          icon: '/icon.svg',
        });
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // Tab switch detection to notify unfinished view
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (activeSeries) {
          setUnfinishedSeries(activeSeries);
        }
      } else if (document.visibilityState === 'visible' && unfinishedSeries) {
        setShowUnfinishedToast(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeSeries, unfinishedSeries]);

  const handleAddSeries = (newSeries: Series) => {
    setSeriesList((prev) => [newSeries, ...prev]);
    setActiveSeriesId(newSeries.id);
  };

  const handleUpdateSeries = (updatedSeries: Series) => {
    setSeriesList((prev) =>
      prev.map((s) => (s.id === updatedSeries.id ? updatedSeries : s))
    );
    if (activeSeriesId === updatedSeries.id) {
      setActiveSeriesId(updatedSeries.id);
    }
  };

  const handleSelectSeriesForPreview = (series: Series) => {
    setActiveSeriesId(series.id);
    setIsCreatorPanelOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSeries = (id: string) => {
    setSeriesList((prev) => prev.filter((s) => s.id !== id));
    if (activeSeriesId === id) {
      const remaining = seriesList.filter((s) => s.id !== id);
      if (remaining.length > 0) setActiveSeriesId(remaining[0].id);
    }
  };

  const handleToggleSeriesLock = (id: string) => {
    setUnlockedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleWhatsAppAllAccess = () => {
    const cleanPhone = whatsappNumber.replace(/\D/g, '') || '5548992041577';
    const message = encodeURIComponent(
      'Olá! Gostaria de assinar a mensalidade VIP de R$ 29,90 no Pix para ter acesso ilimitado a todas as séries!'
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 flex flex-col selection:bg-pink-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        customerName={effectiveUserName}
        isLoggedIn={Boolean(loggedUser)}
        hasActiveVip={hasActiveVip}
        vipDaysRemaining={vipDaysRemaining}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenActivateVip={handleOpenMonthlyPixModal}
        onLogout={handleLogout}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCreatorPanel={() => setIsCreatorPanelOpen(true)}
        onOpenVipModal={() => setIsVipModalOpen(true)}
        whatsappNumber={whatsappNumber}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Active Player - completely unblocked if isCurrentActiveUnlocked */}
        <section aria-label="Reprodutor">
          <VideoPlayer
            series={activeSeries}
            isUnlocked={isCurrentActiveUnlocked}
            onUnlockRequested={() => handleOpenPixModal(activeSeries)}
            onSimulateUnlock={handlePixUnlockSuccess}
            onSeriesEnded={handleSeriesEnded}
            whatsappNumber={whatsappNumber}
          />
        </section>

        {/* All-Access VIP Subscription Banner - Hidden once VIP is active */}
        {!hasActiveVip && (
          <div className="w-full bg-[#0b0f17] border border-pink-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-pink-600/15 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-white text-base">
                    Mensalidade VIP Mini Novelas
                  </h3>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-pink-600/20 text-pink-400 border border-pink-500/30">
                    Acesso Total
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Liberte 100% de todas as séries do catálogo sem limites por apenas{' '}
                  <strong className="text-white font-mono">R$ 29,90 / mês</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenMonthlyPixModal}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
              >
                <Zap className="w-4 h-4" />
                <span>Assinar no Pix (R$ 29,90)</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppAllAccess}
                className="px-3.5 py-2.5 bg-[#0b0f17] hover:bg-black text-white font-bold text-xs rounded-xl border border-pink-500/40 hover:border-pink-500 shadow-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                title="Tirar dúvidas no WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-pink-500" />
                <span>Falar no WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Catalog */}
        <section className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-pink-500" />
                <span>Catálogo de Séries</span>
              </h2>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  categoryFilter === 'all'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Todas ({seriesList.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Series Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredSeries.map((s) => {
              const isUnlocked = hasActiveVip || unlockedSet.has(s.id);
              const isActive = s.id === activeSeriesId;
              return (
                <SeriesCard
                  key={s.id}
                  series={s}
                  isUnlocked={isUnlocked}
                  isActive={isActive}
                  onSelect={handleSelectSeries}
                  onUnlockRequested={handleOpenPixModal}
                  whatsappNumber={whatsappNumber}
                />
              );
            })}
          </div>
        </section>
      </main>

      {/* Clean, Minimal Footer */}
      <footer className="w-full border-t border-white/10 py-5 mt-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-white font-display font-bold">
            <span>MINI</span>
            <span className="text-pink-500">NOVELAS</span>
            <span className="text-slate-500 font-sans font-normal ml-2">© Todos os direitos reservados</span>
          </div>

          <div className="text-[11px] text-slate-400">
            Episódios completos compilados · Liberação instantânea no Pix
          </div>
        </div>
      </footer>

      {/* VIP Expiration, Countdown & Referral Modal */}
      <VipReferralModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
        customerName={effectiveUserName}
        hasActiveVip={hasActiveVip}
        vipDaysRemaining={vipDaysRemaining}
        vipActivatedAt={effectiveVipActivatedAt}
        vipExpiresAt={effectiveVipExpiresAt}
        referralCode={userReferralCode}
        referralsCount={referralsCount}
        whatsappNumber={whatsappNumber}
        onOpenPixMonthly={handleOpenMonthlyPixModal}
      />

      {/* Pix Instant Payment Modal (R$ 2,00 ou R$ 19,90) */}
      <PixPaymentModal
        series={pixTargetSeries}
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        onUnlockSuccess={handlePixUnlockSuccess}
        pixKey={pixKey}
        pixKeyType={pixKeyType}
        whatsappNumber={whatsappNumber}
        isMonthlyPlan={isMonthlyPix}
      />

      {/* Universal Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        universalPassword={universalPassword}
        vipClients={vipClients}
        whatsappNumber={whatsappNumber}
      />

      {/* Series Finished Modal */}
      <SeriesCompletedModal
        completedSeries={completedSeries}
        nextSeries={nextRecommendedSeries}
        isOpen={isCompletedModalOpen}
        onClose={() => setIsCompletedModalOpen(false)}
        onUnlockNext={(next) => handleOpenPixModal(next)}
        onPlayNextDirect={(next) => handleSelectSeries(next)}
        isNextUnlocked={Boolean(nextRecommendedSeries && (hasActiveVip || unlockedSet.has(nextRecommendedSeries.id)))}
        whatsappNumber={whatsappNumber}
      />

      {/* Unfinished session reminder */}
      <NotificationToast
        series={unfinishedSeries}
        isOpen={showUnfinishedToast}
        onClose={() => setShowUnfinishedToast(false)}
        onResume={() => {
          if (unfinishedSeries) {
            handleSelectSeries(unfinishedSeries);
          }
        }}
      />

      {/* App Install Mobile Modal (Android / iOS Detection) */}
      <AppInstallModal />

      {/* Creator Panel (Hidden from public visitors, secret access) */}
      <CreatorPanel
        isOpen={isCreatorPanelOpen}
        onClose={() => setIsCreatorPanelOpen(false)}
        seriesList={seriesList}
        unlockedSeriesId={activeSeriesId}
        onAddSeries={handleAddSeries}
        onUpdateSeries={handleUpdateSeries}
        onDeleteSeries={handleDeleteSeries}
        onToggleSeriesLock={handleToggleSeriesLock}
        onSelectSeriesForPreview={handleSelectSeriesForPreview}
        unlockedSet={unlockedSet}
        whatsappNumber={whatsappNumber}
        onUpdateWhatsAppNumber={handleUpdateWhatsApp}
        pixKey={pixKey}
        pixKeyType={pixKeyType}
        onUpdatePixKey={handleUpdatePixKey}
        universalPassword={universalPassword}
        onUpdateUniversalPassword={handleUpdateUniversalPassword}
        vipClients={vipClients}
        onUpdateVipClients={handleUpdateVipClients}
      />

      {/* Global Series Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        seriesList={seriesList}
        onSelectLocalSeries={handleSelectSeries}
        whatsappNumber={whatsappNumber}
      />

      {/* Floating Discreet Contextual WhatsApp Button */}
      <FloatingWhatsApp
        whatsappNumber={whatsappNumber}
        activeSeries={activeSeries}
      />
    </div>
  );
}
