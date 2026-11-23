import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import UrlShortener from './components/UrlShortener';
import AnalyticsSummary from './components/AnalyticsSummary';
import AnalyticsCharts from './components/AnalyticsCharts';
import { ExternalLink, RefreshCw, Link as LinkIcon, Trash2, Copy, Check, MoreHorizontal } from 'lucide-react';
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
  const overflowRef = useRef<HTMLDivElement>(null);

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

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeCode) {
        await fetchAnalytics(activeCode, true);
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

  const fetchAnalytics = async (code: string, silent: boolean = false) => {
    if (!code) return;

    setActiveCode(code);
    if (!silent) setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/urls/${code}/analytics`);
      if (!res.ok) throw new Error('Short code not found');
      const data: AnalyticsResponse = await res.json();
      setAnalytics(data);

      setRecentCodes((prev) => {
        if (prev.includes(code)) return prev;
        const updated = [code, ...prev];
        localStorage.setItem('pulselink_recent_codes', JSON.stringify(updated));
        return updated;
      });
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

  useEffect(() => {
    try {
      const savedCodes: string[] = JSON.parse(localStorage.getItem('pulselink_recent_codes') || '[]');
      const lastCreated = localStorage.getItem('pulselink_last_created_code') || savedCodes[0];
      if (lastCreated) {
        fetchAnalytics(lastCreated);
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
    const iv = setInterval(() => fetchAnalytics(activeCode, true), 3000);
    return () => clearInterval(iv);
  }, [autoRefresh, activeCode]);

  // Simulate a redirect click to test the pipeline
  const handleSimulateClick = async () => {
    setIsSimulating(true);
    try {
      // Maintain persistent visitor identity across simulated clicks
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
      // Brief delay to allow background queue worker to write to Postgres
      setTimeout(() => {
        fetchAnalytics(activeCode, true);
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
        fetchAnalytics(updatedCodes[0]);
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

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col text-[var(--text-primary)] font-sans overflow-x-hidden transition-colors duration-150">
      <Navbar
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onSimulateClick={handleSimulateClick}
        isSimulating={isSimulating}
      />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 flex flex-col gap-6">
        <UrlShortener
          activeCode={activeCode}
          recentCodes={recentCodes}
          onSelectCode={(code: string) => fetchAnalytics(code)}
          onUrlCreated={(code: string) => {
            localStorage.setItem('pulselink_last_created_code', code);
            setRecentCodes((prev) => {
              const updated = [code, ...prev.filter((c) => c !== code)];
              localStorage.setItem('pulselink_recent_codes', JSON.stringify(updated));
              return updated;
            });
            fetchAnalytics(code);
          }}
          apiBase={API_BASE}
        />

        {/* Analytics Header */}
        {analytics && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-2 border-b border-[var(--border)] min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-lg sm:text-xl font-semibold tracking-tight text-[var(--text-primary)] truncate">
                  {displayShortSlug}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyShortUrl}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  title={copied ? "Copied to clipboard!" : "Copy link"}
                  aria-label="Copy short link"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[var(--accent)]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {analytics?.url?.originalUrl && (
                <a
                  href={analytics.url.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={analytics.url.originalUrl}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors max-w-md sm:max-w-xl truncate min-w-0 group"
                >
                  <span className="truncate">{analytics.url.originalUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
              {/* Ghost icon refresh button */}
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isLoading || isRefreshing || isDeleting}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                title="Reload latest analytics"
                aria-label="Refresh analytics"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isRefreshing || isLoading ? 'animate-spin text-[var(--accent)]' : ''
                  }`}
                />
              </button>

              {/* Overflow "⋯" Menu */}
              <div className="relative" ref={overflowRef}>
                <button
                  type="button"
                  onClick={() => setOverflowOpen((prev) => !prev)}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {overflowOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setOverflowOpen(false);
                        handleDeleteUrl(activeCode);
                      }}
                      disabled={isDeleting}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-50"
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
          <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3.5 py-2.5">
            {error}
          </p>
        )}

        {/* Skeleton placeholder while initial loading */}
        {isLoading && !analytics && (
          <div className="flex flex-col gap-6 animate-pulse" aria-hidden="true">
            {/* KPI Skeleton Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-24 flex divide-x divide-[var(--border)]">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1 px-4 first:pl-0 flex flex-col justify-between">
                  <div className="h-3 w-16 bg-[var(--surface-subtle)] rounded"></div>
                  <div className="h-7 w-24 bg-[var(--surface-subtle)] rounded"></div>
                </div>
              ))}
            </div>
            {/* Charts Skeleton Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 h-80 flex flex-col justify-between">
                <div className="h-4 w-32 bg-[var(--surface-subtle)] rounded"></div>
                <div className="h-56 bg-[var(--surface-subtle)] rounded"></div>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 h-80 flex flex-col justify-between">
                <div className="h-4 w-32 bg-[var(--surface-subtle)] rounded"></div>
                <div className="h-56 bg-[var(--surface-subtle)] rounded"></div>
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
            />
          </>
        )}

        {!analytics && !error && !isLoading && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-10 sm:p-16 text-center shadow-xs flex flex-col items-center justify-center my-4 transition-colors">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] mb-3.5 shadow-xs">
              <LinkIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              No link selected
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
              Paste a URL above to shorten it, or select an existing link from your chips to inspect real-time click telemetry.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)] transition-colors">
        PulseLink Enterprise Telemetry • Node.js • PostgreSQL • Redis • BullMQ • React
      </footer>
    </div>
  );
}
