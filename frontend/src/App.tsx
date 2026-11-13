import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UrlShortener from './components/UrlShortener';
import AnalyticsSummary from './components/AnalyticsSummary';
import AnalyticsCharts from './components/AnalyticsCharts';
import { ExternalLink, RefreshCw, Link as LinkIcon, Trash2 } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans overflow-x-hidden">
      <Navbar
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onSimulateClick={handleSimulateClick}
        isSimulating={isSimulating}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 flex flex-col gap-5">
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

        {analytics && (
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 pt-1 gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">Analytics</span>
              <code className="text-xs font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md shrink-0">
                /{activeCode}
              </code>

              <button
                onClick={() => handleDeleteUrl(activeCode)}
                disabled={isDeleting}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 px-2.5 py-0.5 rounded-md transition cursor-pointer disabled:opacity-50 shrink-0"
                title={`Delete /${activeCode} and purge telemetry`}
              >
                <Trash2 className="w-3 h-3" />
                <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
              </button>

              {analytics?.url?.originalUrl && (
                <a
                  href={analytics.url.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={analytics.url.originalUrl}
                  className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition max-w-md lg:max-w-xl truncate min-w-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{analytics.url.originalUrl}</span>
                </a>
              )}
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={isLoading || isRefreshing || isDeleting}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 hover:border-slate-300 transition cursor-pointer disabled:opacity-50 shrink-0 font-medium"
              title="Reload latest analytics and recent links"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
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
          <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-14 text-center shadow-xs flex flex-col items-center justify-center my-3">
            <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3.5 shadow-xs">
              <LinkIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
              You haven't created any links yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm leading-relaxed">
              Paste a long URL above and click <span className="font-semibold text-blue-600">Shorten →</span> to generate your first link and view real-time click telemetry.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 bg-white">
        PulseLink Enterprise Telemetry • Node.js • PostgreSQL • Redis • BullMQ • React
      </footer>
    </div>
  );
}
