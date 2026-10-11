import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UrlShortener from './components/UrlShortener';
import AnalyticsSummary from './components/AnalyticsSummary';
import AnalyticsCharts from './components/AnalyticsCharts';
import { ExternalLink, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function App() {
  const [activeCode, setActiveCode] = useState('gh2026');
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. Initialize recentCodes from localStorage (survives page reloads)
  const [recentCodes, setRecentCodes] = useState(() => {
    try {
      const saved = localStorage.getItem('pulselink_recent_codes');
      return saved ? JSON.parse(saved) : ['gh2026'];
    } catch {
      return ['gh2026'];
    }
  });

  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual refresh with tactile visual feedback
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchAnalytics(activeCode, true),
        fetchRecentUrls()
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 450);
    }
  };

  // 2. Fetch all recent links from the PostgreSQL database on startup
  const fetchRecentUrls = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/urls`);
      if (!res.ok) return;
      const data = await res.json();
      const dbCodes = data.map((u) => u.short_code);
      if (dbCodes.length > 0) {
        setRecentCodes((prev) => {
          const merged = Array.from(new Set([...dbCodes, ...prev]));
          localStorage.setItem('pulselink_recent_codes', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.warn('Could not fetch links from backend:', err.message);
    }
  };

  // 3. Fetch telemetry analytics for a specific short code
  const fetchAnalytics = async (code, silent = false) => {
    if (!code) return;
    if (!silent) setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/urls/${code}/analytics`);
      if (!res.ok) throw new Error('Short code not found');
      const data = await res.json();
      setAnalytics(data);
      setActiveCode(code);

      // Persist to recent list and localStorage
      setRecentCodes((prev) => {
        const updated = prev.includes(code) ? prev : [code, ...prev];
        localStorage.setItem('pulselink_recent_codes', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      setError(err.message);
      setAnalytics(null);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRecentUrls();
    fetchAnalytics('gh2026');
  }, []);

  // Live Auto-Refresh polling (every 3 seconds when toggled on)
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => fetchAnalytics(activeCode, true), 3000);
    return () => clearInterval(iv);
  }, [autoRefresh, activeCode]);

  // Simulate a live click through Redis cache and BullMQ queue
  const handleSimulateClick = async () => {
    setIsSimulating(true);
    try {
      await fetch(`${API_BASE}/${activeCode}`, { method: 'GET', redirect: 'follow' });
      setTimeout(() => { fetchAnalytics(activeCode, true); setIsSimulating(false); }, 400);
    } catch {
      setIsSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Navbar
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onSimulateClick={handleSimulateClick}
        isSimulating={isSimulating}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-8 flex flex-col gap-4">
        {/* URL Shortener toolbar */}
        <UrlShortener
          activeCode={activeCode}
          recentCodes={recentCodes}
          onSelectCode={(code) => fetchAnalytics(code)}
          onUrlCreated={(code) => {
            fetchRecentUrls();
            fetchAnalytics(code);
          }}
          apiBase={API_BASE}
        />

        {/* Analytics section header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Analytics</span>
            <code className="text-xs font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              /{activeCode}
            </code>
            {analytics?.url?.originalUrl && (
              <a
                href={analytics.url.originalUrl}
                target="_blank"
                rel="noreferrer"
                title={analytics.url.originalUrl}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition max-w-[280px] truncate"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{analytics.url.originalUrl}</span>
              </a>
            )}
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 hover:border-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Reload latest analytics and recent links"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="font-medium">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        {analytics && (
          <>
            {/* KPI Cards */}
            <AnalyticsSummary
              summary={analytics.summary}
              countries={analytics.countries}
              devices={analytics.devices}
            />

            {/* Charts */}
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
          <div className="py-12 flex items-center justify-center text-xs text-slate-400">
            Waiting for data…
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-3 text-center text-xs text-slate-400 bg-white">
        PulseLink Enterprise Telemetry • Node.js • PostgreSQL • Redis • BullMQ • React
      </footer>
    </div>
  );
}