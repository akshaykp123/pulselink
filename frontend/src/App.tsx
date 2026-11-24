import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import UrlShortener from './components/UrlShortener';
import AnalyticsSummary from './components/AnalyticsSummary';
import AnalyticsCharts from './components/AnalyticsCharts';
import { ExternalLink, RefreshCw, Trash2, Copy, Check, MoreHorizontal, AlertCircle, X, Link as LinkIcon, ChevronDown, Loader2 } from 'lucide-react';
import type { AnalyticsResponse } from './types/analytics';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function App() {
  const [activeCode, setActiveCode] = useState<string>(() => {
    try {
      const lastCreated = localStorage.getItem('pulselink_last_created_code');
      if (lastCreated) return lastCreated;
      const saved = localStorage.getItem('pulselink_recent_codes');
      const codes = saved ? JSON.parse(saved) : [];
      return codes[0] || '';
    } catch {
      return '';
    }
  });

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [overflowOpen, setOverflowOpen] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [linkClicksMap, setLinkClicksMap] = useState<Record<string, number>>({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Shared shorten form state & toast
  const [sharedOriginalUrl, setSharedOriginalUrl] = useState<string>('');
  const [sharedCustomAlias, setSharedCustomAlias] = useState<string>('');
  const [isSharedShortening, setIsSharedShortening] = useState<boolean>(false);
  const [sharedShortenError, setSharedShortenError] = useState<string>('');
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; shortUrl: string } | null>(null);
  const [toastCopied, setToastCopied] = useState<boolean>(false);

  const [recentCodes, setRecentCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pulselink_recent_codes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [error, setError] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Close overflow menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    if (overflowOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [overflowOpen]);

  // Shared Shorten submit handler (used by both desktop sidebar and mobile front card)
  const handleSharedShorten = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sharedOriginalUrl.trim()) return;

    const trimmedAlias = sharedCustomAlias.trim();
    if (trimmedAlias) {
      if (trimmedAlias.length < 3 || trimmedAlias.length > 16) {
        setSharedShortenError('Custom alias must be between 3 and 16 characters');
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedAlias)) {
        setSharedShortenError('Only letters, numbers, hyphens (-), and underscores (_) are allowed');
        return;
      }
      const RESERVED_ALIASES = ['api', 'health', 'admin', 'login', 'docs', 'favicon', 'robots', 'sitemap', 'static', 'assets', 'dashboard'];
      if (RESERVED_ALIASES.includes(trimmedAlias.toLowerCase())) {
        setSharedShortenError(`'${trimmedAlias}' is a reserved system keyword. Please choose another.`);
        return;
      }
    }

    setIsSharedShortening(true);
    setSharedShortenError('');

    try {
      const res = await fetch(`${API_BASE}/api/urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl: sharedOriginalUrl.trim(), customAlias: trimmedAlias || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error(`Rate limited — wait ${data.retryAfterSeconds || 60}s`);
        throw new Error(data.error || 'Failed to shorten');
      }

      setSharedOriginalUrl('');
      setSharedCustomAlias('');
      setMobileOptionsOpen(false);
      localStorage.setItem('pulselink_last_created_code', data.shortCode);
      setRecentCodes((prev) => {
        const updated = [data.shortCode, ...prev.filter((c) => c !== data.shortCode)];
        localStorage.setItem('pulselink_recent_codes', JSON.stringify(updated));
        return updated;
      });
      fetchAnalytics(data.shortCode, false, timeRange);
      fetchRecentUrls();
      setToast({ message: 'Link created', shortUrl: data.shortUrl });
      setTimeout(() => {
        setToast((curr) => (curr?.shortUrl === data.shortUrl ? null : curr));
      }, 5000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSharedShortenError(err.message);
      } else {
        setSharedShortenError('Failed to shorten URL');
      }
    } finally {
      setIsSharedShortening(false);
    }
  };

  // Fetch all recent shortened links from backend
  const fetchRecentUrls = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/urls`);
      if (!res.ok) return;
      const data: Array<{ short_code: string; clicks_count?: number | string }> = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const clicksMap: Record<string, number> = {};
        const serverCodes = data.map((item) => {
          clicksMap[item.short_code] = Number(item.clicks_count) || 0;
          return item.short_code;
        });

        setRecentCodes((prev) => {
          const merged = Array.from(new Set([...prev, ...serverCodes]));
          localStorage.setItem('pulselink_recent_codes', JSON.stringify(merged));
          return merged;
        });
        setLinkClicksMap((prev) => ({ ...prev, ...clicksMap }));
      }
    } catch {
      // Ignore background fetch error
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeCode) {
        await Promise.all([
          fetchAnalytics(activeCode, true, timeRange),
          fetchRecentUrls(),
        ]);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 450);
    }
  };

  const handleCopyShortUrl = () => {
    if (!activeCode) return;
    const shortUrl = analytics?.url?.shortUrl || `${API_BASE}/${activeCode}`;
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const fetchAnalytics = async (
    code: string,
    silent: boolean = false,
    range: '24h' | '7d' | '30d' = timeRange
  ) => {
    if (!code) return;

    setActiveCode(code);
    if (!silent) setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/urls/${code}/analytics?range=${range}`);
      if (!res.ok) throw new Error('Short code not found');
      const data: AnalyticsResponse = await res.json();
      setAnalytics(data);

      setRecentCodes((prev) => {
        if (prev.includes(code)) return prev;
        const updated = [code, ...prev];
        localStorage.setItem('pulselink_recent_codes', JSON.stringify(updated));
        return updated;
      });

      if (data.summary) {
        setLinkClicksMap((prev) => ({
          ...prev,
          [code]: data.summary.totalClicks,
        }));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch analytics');
      }
      setAnalytics(null);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleRangeChange = (range: '24h' | '7d' | '30d') => {
    setTimeRange(range);
    if (activeCode) {
      fetchAnalytics(activeCode, true, range);
    }
  };

  useEffect(() => {
    fetchRecentUrls();
    try {
      const savedCodes: string[] = JSON.parse(localStorage.getItem('pulselink_recent_codes') || '[]');
      const lastCreated = localStorage.getItem('pulselink_last_created_code') || savedCodes[0];
      if (lastCreated) {
        fetchAnalytics(lastCreated, false, '24h');
      } else {
        setActiveCode('');
        setAnalytics(null);
      }
    } catch {
      setActiveCode('');
      setAnalytics(null);
    }
  }, []);

  // Poll analytics every 3s when live mode is toggled on
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => fetchAnalytics(activeCode, true, timeRange), 3000);
    return () => clearInterval(iv);
  }, [autoRefresh, activeCode, timeRange]);

  // Simulate a redirect click to test the pipeline
  const handleSimulateClick = async () => {
    setIsSimulating(true);
    try {
      let vid = localStorage.getItem('pulselink_vid');
      if (!vid) {
        vid = 'sim_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('pulselink_vid', vid);
      }

      await fetch(`${API_BASE}/${activeCode}`, {
        method: 'GET',
        headers: {
          'x-visitor-id': vid,
        },
        redirect: 'manual',
      });
    } catch {
      // Ignore opaque redirect response
    } finally {
      setTimeout(() => {
        fetchAnalytics(activeCode, true, timeRange);
        fetchRecentUrls();
        setIsSimulating(false);
      }, 500);
    }
  };

  const handleDeleteUrl = async (code: string) => {
    if (!code) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete /${code}?\n\nThis will permanently remove the short link, invalidate its Redis cache, and purge all click analytics from the database.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/urls/${code}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete short URL');
      }

      const updatedCodes = recentCodes.filter((c) => c !== code);
      setRecentCodes(updatedCodes);
      localStorage.setItem('pulselink_recent_codes', JSON.stringify(updatedCodes));

      const lastCreated = localStorage.getItem('pulselink_last_created_code');
      if (lastCreated === code) {
        localStorage.removeItem('pulselink_last_created_code');
        if (updatedCodes.length > 0) {
          localStorage.setItem('pulselink_last_created_code', updatedCodes[0]);
        }
      }

      if (updatedCodes.length > 0) {
        fetchAnalytics(updatedCodes[0], false, timeRange);
      } else {
        setActiveCode('');
        setAnalytics(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete short URL');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const displayShortSlug = analytics?.url?.shortUrl
    ? analytics.url.shortUrl.replace(/^https?:\/\//, '')
    : `pulselink.app/${activeCode}`;

  const domainPrefix = displayShortSlug.includes('/')
    ? displayShortSlug.slice(0, displayShortSlug.lastIndexOf('/') + 1)
    : 'pulselink.app/';
  const slugPart = displayShortSlug.includes('/')
    ? displayShortSlug.slice(displayShortSlug.lastIndexOf('/') + 1)
    : activeCode;

  return (
    <div className="h-screen w-screen flex bg-[var(--bg)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-150">
      {/* ── Left Sidebar (Desktop: 310px flush to edge) ── */}
      <div className="hidden md:block h-full shrink-0">
        <UrlShortener
          activeCode={activeCode}
          recentCodes={recentCodes}
          linkClicksMap={linkClicksMap}
          onSelectCode={(code: string) => fetchAnalytics(code, false, timeRange)}
          sharedOriginalUrl={sharedOriginalUrl}
          setSharedOriginalUrl={setSharedOriginalUrl}
          sharedCustomAlias={sharedCustomAlias}
          setSharedCustomAlias={setSharedCustomAlias}
          sharedIsShortening={isSharedShortening}
          sharedError={sharedShortenError}
          setSharedError={setSharedShortenError}
          onSharedShorten={handleSharedShorten}
          apiBase={API_BASE}
        />
      </div>

      {/* ── Left Sidebar (Mobile Drawer < 900px) ── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 h-full">
            <UrlShortener
              activeCode={activeCode}
              recentCodes={recentCodes}
              linkClicksMap={linkClicksMap}
              onSelectCode={(code: string) => {
                fetchAnalytics(code, false, timeRange);
                setMobileDrawerOpen(false);
              }}
              sharedOriginalUrl={sharedOriginalUrl}
              setSharedOriginalUrl={setSharedOriginalUrl}
              sharedCustomAlias={sharedCustomAlias}
              setSharedCustomAlias={setSharedCustomAlias}
              sharedIsShortening={isSharedShortening}
              sharedError={sharedShortenError}
              setSharedError={setSharedShortenError}
              onSharedShorten={handleSharedShorten}
              apiBase={API_BASE}
              onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main Canvas (Right Area) ── */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        {/* 72px Top Bar with Breadcrumb and Controls */}
        <Navbar
          activeCode={activeCode}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          onSimulateClick={handleSimulateClick}
          isSimulating={isSimulating}
          onToggleSidebar={() => setMobileDrawerOpen((prev) => !prev)}
        />

        {/* Scrollable Main Area with Faint Dotted Grid */}
        <main className="flex-1 overflow-y-auto dotted-grid p-3.5 sm:p-8 flex flex-col custom-scrollbar min-w-0">
          <div className="max-w-[1200px] w-full mx-auto flex flex-col gap-5 sm:gap-6 min-w-0">
            {/* Mobile Compact Create-Link Card (<= 640px) */}
            <div className="md:hidden bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] p-4 shadow-xs space-y-3 min-w-0">
              <form onSubmit={handleSharedShorten} className="space-y-2.5">
                <div className="relative flex items-center">
                  <LinkIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 pointer-events-none" />
                  <input
                    type="url"
                    required
                    placeholder="Paste long URL to shorten…"
                    value={sharedOriginalUrl}
                    onChange={(e) => {
                      setSharedOriginalUrl(e.target.value);
                      if (sharedShortenError) setSharedShortenError('');
                    }}
                    className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-control)] pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus-ring transition-smooth shadow-2xs"
                  />
                </div>

                {/* Custom Slug Disclosure */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setMobileOptionsOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors cursor-pointer select-none py-0.5"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${mobileOptionsOpen ? 'rotate-180' : ''}`} />
                    <span>Options (custom slug)</span>
                  </button>

                  {mobileOptionsOpen && (
                    <div className="flex items-center rounded-[var(--radius-control)] bg-[var(--input-bg)] border border-[var(--input-border)] px-3 h-9 text-xs font-mono shadow-2xs animate-in fade-in duration-100">
                      <span className="text-[var(--text-tertiary)] select-none shrink-0 font-medium">
                        slug:
                      </span>
                      <input
                        type="text"
                        placeholder="alias (3-16 chars)"
                        maxLength={16}
                        value={sharedCustomAlias}
                        onChange={(e) => {
                          setSharedCustomAlias(e.target.value);
                          if (sharedShortenError) setSharedShortenError('');
                        }}
                        className="w-full bg-transparent pl-1.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Full-width 44px primary button */}
                <button
                  type="submit"
                  disabled={isSharedShortening}
                  className="w-full h-11 rounded-[var(--radius-control)] bg-[var(--accent-btn)] hover:bg-[var(--accent-btn-hover)] text-[var(--accent-btn-text)] text-xs font-semibold tracking-tight transition-smooth shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus-ring"
                >
                  {isSharedShortening ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Shorten Link</span>
                </button>
              </form>

              {/* Error Alert in mobile create card */}
              {sharedShortenError && (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-2.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-[var(--radius-control)] p-2.5 animate-in fade-in duration-150 shadow-2xs"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span className="leading-snug break-words font-medium">{sharedShortenError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSharedShortenError('')}
                    className="p-0.5 rounded text-rose-500/70 hover:text-rose-600 dark:hover:text-rose-300 cursor-pointer shrink-0 mt-0.5"
                    title="Dismiss error"
                    aria-label="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Analytics Header */}
            {analytics && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)] min-w-0">
                <div className="min-w-0 flex-1">
                  {/* Desktop Title: domain prefix + slug */}
                  <div className="hidden sm:flex items-center gap-2 min-w-0">
                    <h1 className="font-mono text-[20px] font-semibold tracking-tight truncate">
                      <span className="text-[var(--text-secondary)]">{domainPrefix}</span>
                      <span className="text-[var(--text-primary)]">{slugPart}</span>
                    </h1>
                    <button
                      type="button"
                      onClick={handleCopyShortUrl}
                      className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-smooth cursor-pointer focus-ring shrink-0"
                      title={copied ? "Copied to clipboard!" : "Copy link"}
                      aria-label="Copy short link"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-[var(--accent-text)]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Mobile Title: Large slug in mono + full short URL below with word-break */}
                  <div className="sm:hidden min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h1 className="font-mono text-xl font-bold tracking-tight text-[var(--text-primary)] break-all">
                        /{slugPart || activeCode}
                      </h1>
                      <button
                        type="button"
                        onClick={handleCopyShortUrl}
                        className="p-2 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-smooth cursor-pointer focus-ring shrink-0"
                        title={copied ? "Copied to clipboard!" : "Copy link"}
                        aria-label="Copy short link"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-[var(--accent-text)]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)] break-all font-mono leading-relaxed">
                      {analytics?.url?.shortUrl || `${API_BASE}/${activeCode}`}
                    </p>
                  </div>

                  {analytics?.url?.originalUrl && (
                    <a
                      href={analytics.url.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={analytics.url.originalUrl}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors max-w-full break-all min-w-0 group"
                    >
                      <span className="break-all">{analytics.url.originalUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  {/* Ghost icon refresh button */}
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isLoading || isRefreshing || isDeleting}
                    className="p-2 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-smooth cursor-pointer disabled:opacity-40 focus-ring"
                    title="Reload latest analytics"
                    aria-label="Refresh analytics"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isRefreshing || isLoading ? 'animate-spin text-[var(--accent-text)]' : ''
                      }`}
                    />
                  </button>

                  {/* Overflow "⋯" Menu */}
                  <div className="relative" ref={overflowRef}>
                    <button
                      type="button"
                      onClick={() => setOverflowOpen((prev) => !prev)}
                      className="p-2 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-smooth cursor-pointer focus-ring"
                      title="More actions"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {overflowOpen && (
                      <div className="absolute right-0 mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] shadow-xl z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setOverflowOpen(false);
                            handleDeleteUrl(activeCode);
                          }}
                          disabled={isDeleting}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 transition-smooth cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{isDeleting ? 'Deleting link…' : 'Delete short link'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start justify-between gap-2.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-[var(--radius-control)] p-3 animate-in fade-in duration-150 shadow-2xs"
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span className="leading-relaxed font-medium break-words">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="p-1 rounded text-rose-500/70 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                  title="Dismiss error"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Skeleton placeholder while initial loading */}
            {isLoading && !analytics && (
              <div className="flex flex-col gap-6 animate-pulse" aria-hidden="true">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] p-5 h-24 flex divide-x divide-[var(--border)]">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-1 px-4 first:pl-0 flex flex-col justify-between">
                      <div className="h-3 w-16 bg-[var(--surface-raised)] rounded-[var(--radius-control)]"></div>
                      <div className="h-7 w-24 bg-[var(--surface-raised)] rounded-[var(--radius-control)]"></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] p-6 h-80 flex flex-col justify-between">
                    <div className="h-4 w-32 bg-[var(--surface-raised)] rounded-[var(--radius-control)]"></div>
                    <div className="h-56 bg-[var(--surface-raised)] rounded-[var(--radius-control)]"></div>
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] p-6 h-80 flex flex-col justify-between">
                    <div className="h-4 w-32 bg-[var(--surface-raised)] rounded-[var(--radius-control)]"></div>
                    <div className="h-56 bg-[var(--surface-raised)] rounded-[var(--radius-control)]"></div>
                  </div>
                </div>
              </div>
            )}

            {analytics && (
              <>
                <AnalyticsSummary
                  summary={analytics.summary}
                  countries={analytics.countries}
                  devices={analytics.devices}
                />

                <AnalyticsCharts
                  timeline={analytics.timeline}
                  countries={analytics.countries}
                  devices={analytics.devices}
                  browsers={analytics.browsers}
                  referrers={analytics.referrers}
                  timeRange={timeRange}
                  onRangeChange={handleRangeChange}
                />
              </>
            )}

            {!analytics && !error && !isLoading && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] p-12 text-center shadow-xs flex flex-col items-center justify-center my-8 transition-smooth">
                <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] mb-3.5 shadow-xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Select a link from the sidebar
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
                  Choose a short link on the left to inspect real-time click telemetry, or shorten a new URL above.
                </p>
              </div>
            )}

            {/* Footer */}
            <footer className="mt-auto pt-6 pb-2 text-center text-[11px] text-[var(--text-secondary)]">
              PulseLink Telemetry • Node.js • PostgreSQL • Redis • BullMQ • React 19
            </footer>
          </div>
        </main>
      </div>

      {/* Toast "Link created" with Copy action */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center gap-3 bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] shadow-xl rounded-[var(--radius-panel)] px-3.5 py-2.5 sm:px-4 sm:py-3 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[90vw]"
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span>{toast.message}</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-[var(--border)] pl-2.5">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(toast.shortUrl);
                setToastCopied(true);
                setTimeout(() => setToastCopied(false), 2000);
              }}
              className="px-2.5 py-1 rounded-[var(--radius-control)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-smooth cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              {toastCopied ? <Check className="w-3.5 h-3.5 text-[var(--accent-text)]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{toastCopied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
