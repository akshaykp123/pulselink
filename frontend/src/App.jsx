import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UrlShortener from './components/UrlShortener';
import AnalyticsSummary from './components/AnalyticsSummary';
import AnalyticsCharts from './components/AnalyticsCharts';
import { ExternalLink, RefreshCw, Link as LinkIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function App() {
    const [activeCode, setActiveCode] = useState(() => {
    try {
      return localStorage.getItem('pulselink_active_code') || '';
    } catch {
      return '';
    }
  });
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. Initialize recentCodes from localStorage (survives page reloads)
  const [recentCodes, setRecentCodes] = useState(() => {
    try {
      const saved = localStorage.getItem('pulselink_recent_codes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual refresh with tactile visual feedback
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

  // 3. Fetch telemetry analytics for a specific short code
  const fetchAnalytics = async (code, silent = false) => {
    if (!code) return;
    if (!silent) setIsLoading(true);
    setError('');
    try {
      setActiveCode(code);
      const res = await fetch(`${API_BASE}/api/urls/${code}/analytics`);
      if (!res.ok) throw new Error('Short code not found');
      const data = await res.json();
      setAnalytics(data);
      
      localStorage.setItem('pulselink_active_code', code); // 👈 Remembers current link

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

     // Initial load: Load the latest link created on THIS specific device from localStorage
  useEffect(() => {
    try {
      const savedCodes = JSON.parse(localStorage.getItem('pulselink_recent_codes') || '[]');
      const savedActive = localStorage.getItem('pulselink_active_code');
      const codeToLoad = savedActive && savedCodes.includes(savedActive) ? savedActive : savedCodes[0];
      if (codeToLoad) {
        fetchAnalytics(codeToLoad);
      } else {
        setActiveCode('');
        setAnalytics(null);
      }
    } catch {
      setActiveCode('');
      setAnalytics(null);
    }
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
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans overflow-x-hidden">
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
            fetchAnalytics(code);
          }}
          apiBase={API_BASE}
        />

                {/* Analytics section header */}
        {analytics && (
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 pt-1 gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">Analytics</span>
              <code className="text-xs font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md shrink-0">
                /{activeCode}
              </code>
              {analytics?.url?.originalUrl && (
                <a
                  href={analytics.url.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={analytics.url.originalUrl}
                  className="hidden sm:flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition max-w-[280px] truncate min-w-0"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{analytics.url.originalUrl}</span>
                </a>
              )}
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={isLoading || isRefreshing}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 hover:border-slate-300 transition cursor-pointer disabled:opacity-50 shrink-0"
              title="Reload latest analytics and recent links"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="font-medium">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        )}
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
          <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center my-2">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
              <LinkIcon className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
              You haven't created any links yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Paste a long URL above and click <span className="font-semibold text-blue-600">Shorten →</span> to generate your first link and view real-time click telemetry.
            </p>
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