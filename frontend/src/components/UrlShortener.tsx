import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy, Check, ExternalLink, QrCode, Loader2, AlertCircle, X,
  Search, Link as LinkIcon
} from 'lucide-react';
import type { UrlData } from '../types/analytics';

export interface UrlShortenerProps {
  onUrlCreated?: (shortCode: string) => void;
  activeCode?: string;
  onSelectCode?: (code: string) => void;
  recentCodes?: string[];
  linkClicksMap?: Record<string, number>;
  apiBase?: string;
  onCloseMobileDrawer?: () => void;
}

export default function UrlShortener({
  onUrlCreated,
  activeCode = '',
  onSelectCode,
  recentCodes = [],
  linkClicksMap = {},
  apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000',
  onCloseMobileDrawer,
}: UrlShortenerProps) {
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [customAlias, setCustomAlias] = useState<string>('');
  const [createdUrl, setCreatedUrl] = useState<UrlData | null>(null);
  const [isShortening, setIsShortening] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showQR, setShowQR] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const handleShorten = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!originalUrl) return;
    setIsShortening(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/api/urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl, customAlias: customAlias.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error(`Rate limited — wait ${data.retryAfterSeconds || 60}s`);
        throw new Error(data.error || 'Failed to shorten');
      }

      setCreatedUrl(data);
      setOriginalUrl('');
      setCustomAlias('');
      if (onUrlCreated) onUrlCreated(data.shortCode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to shorten URL');
      }
    } finally {
      setIsShortening(false);
    }
  };

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredCodes = useMemo(() => {
    if (!searchFilter.trim()) return recentCodes;
    const query = searchFilter.toLowerCase().trim().replace(/^\//, '');
    return recentCodes.filter((c) => c.toLowerCase().includes(query));
  }, [recentCodes, searchFilter]);

  return (
    <aside className="w-[280px] shrink-0 h-full flex flex-col bg-[var(--surface)] border-r border-[var(--border)] select-none">
      {/* ── 1. Top Logo Header with Pulse Line Mark ── */}
      <div className="h-12 border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Small pulse line logo mark */}
          <div className="w-6 h-6 rounded-[var(--radius-control)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
            PulseLink
          </span>
          <span className="text-[11px] font-normal text-[var(--text-muted)] tracking-wider">
            CONSOLE
          </span>
        </div>

        {/* Mobile close button */}
        {onCloseMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="md:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-control)]"
            title="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── 2. Shorten Input Form Section ── */}
      <div className="p-3.5 border-b border-[var(--border)] shrink-0 space-y-2.5">
        <form onSubmit={handleShorten} className="space-y-2">
          {/* Destination URL */}
          <div className="relative flex items-center">
            <LinkIcon className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />
            <input
              type="url"
              required
              placeholder="Paste long URL…"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-control)] pl-8 pr-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-ring transition-smooth"
            />
          </div>

          {/* Custom Slug with prefix */}
          <div className="flex items-center rounded-[var(--radius-control)] bg-[var(--surface-raised)] border border-[var(--border)] px-2.5 py-1.5 text-xs font-mono">
            <span className="text-[var(--text-muted)] select-none">
              slug:
            </span>
            <input
              type="text"
              placeholder="custom-slug"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              className="w-full bg-transparent pl-1.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>

          {/* Teal Primary Shorten Button */}
          <button
            type="submit"
            disabled={isShortening}
            className="w-full h-8 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0A0F12] dark:text-[#0A0F12] text-xs font-semibold tracking-tight transition-smooth shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 focus-ring"
          >
            {isShortening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Shorten Link</span>
          </button>
        </form>

        {/* Shorten Success Card */}
        {createdUrl && (
          <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-control)] p-2 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--text-primary)] truncate font-medium text-[11px]">
                /{createdUrl.shortCode}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => copyLink(createdUrl.shortUrl)}
                  title="Copy link"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-smooth cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={createdUrl.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open link"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-smooth"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowQR(true)}
                  title="Show QR Code"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-smooth cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-500/10 px-2 py-1 rounded-[var(--radius-control)] border border-rose-500/20">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
      </div>

      {/* ── 3. Scrollable List of Links with "Jump to slug" Search ── */}
      <div className="p-3 pb-1.5 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Your Links
          </span>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {recentCodes.length}
          </span>
        </div>

        {/* Jump to slug search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2 pointer-events-none" />
          <input
            type="text"
            placeholder="Jump to slug…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-control)] pl-7 pr-2.5 py-1 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-ring transition-smooth"
          />
        </div>
      </div>

      {/* Links List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 custom-scrollbar min-h-0">
        {filteredCodes.length > 0 ? (
          filteredCodes.map((code) => {
            const isSelected = activeCode === code;
            const clicks = linkClicksMap ? linkClicksMap[code] : undefined;

            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  if (onSelectCode) onSelectCode(code);
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                className={`w-full h-9 px-2.5 rounded-[var(--radius-control)] text-xs font-mono transition-smooth flex items-center justify-between cursor-pointer group text-left ${
                  isSelected
                    ? 'border-l-2 border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text-primary)] font-medium pl-2 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] pl-2.5'
                }`}
              >
                <span className="truncate font-medium">/{code}</span>
                <span className="text-[11px] font-sans tabular-nums text-[var(--text-muted)] shrink-0 ml-2">
                  {clicks !== undefined ? `${clicks} ${clicks === 1 ? 'click' : 'clicks'}` : '0 clicks'}
                </span>
              </button>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            {searchFilter ? 'No links found' : 'No shortened links yet'}
          </div>
        )}
      </div>

      {/* QR Code Modal Dialog */}
      {showQR && createdUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] p-5 shadow-2xl text-center space-y-3.5 max-w-xs w-full transition-smooth">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">QR Code</span>
              <button
                onClick={() => setShowQR(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-smooth"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-white p-3 rounded-[var(--radius-control)] border border-slate-200 inline-block">
              <QRCodeSVG value={createdUrl.shortUrl} size={150} />
            </div>
            <p className="text-xs font-mono text-[var(--text-secondary)] truncate font-medium">
              {createdUrl.shortUrl}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
