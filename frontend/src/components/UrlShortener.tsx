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
  // Shared state & submit handler with mobile create card
  sharedOriginalUrl?: string;
  setSharedOriginalUrl?: (url: string) => void;
  sharedCustomAlias?: string;
  setSharedCustomAlias?: (alias: string) => void;
  sharedIsShortening?: boolean;
  sharedError?: string;
  setSharedError?: (err: string) => void;
  onSharedShorten?: (e: React.FormEvent<HTMLFormElement>) => void;
  sharedCreatedUrl?: UrlData | null;
}

export default function UrlShortener({
  onUrlCreated,
  activeCode = '',
  onSelectCode,
  recentCodes = [],
  linkClicksMap = {},
  apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000',
  onCloseMobileDrawer,
  sharedOriginalUrl,
  setSharedOriginalUrl,
  sharedCustomAlias,
  setSharedCustomAlias,
  sharedIsShortening,
  sharedError,
  setSharedError,
  onSharedShorten,
  sharedCreatedUrl,
}: UrlShortenerProps) {
  const [internalOriginalUrl, setInternalOriginalUrl] = useState<string>('');
  const [internalCustomAlias, setInternalCustomAlias] = useState<string>('');
  const [internalCreatedUrl, setInternalCreatedUrl] = useState<UrlData | null>(null);
  const [internalIsShortening, setInternalIsShortening] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showQR, setShowQR] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const originalUrl = sharedOriginalUrl !== undefined ? sharedOriginalUrl : internalOriginalUrl;
  const setOriginalUrl = setSharedOriginalUrl || setInternalOriginalUrl;
  const customAlias = sharedCustomAlias !== undefined ? sharedCustomAlias : internalCustomAlias;
  const setCustomAlias = setSharedCustomAlias || setInternalCustomAlias;
  const isShortening = sharedIsShortening !== undefined ? sharedIsShortening : internalIsShortening;
  const error = sharedError !== undefined ? sharedError : internalError;
  const setError = setSharedError || setInternalError;
  const createdUrl = sharedCreatedUrl !== undefined ? sharedCreatedUrl : internalCreatedUrl;

  const handleShorten = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSharedShorten) {
      onSharedShorten(e);
      return;
    }

    if (!originalUrl) return;

    // Client-side validation for custom alias
    const trimmedAlias = customAlias.trim();
    if (trimmedAlias) {
      if (trimmedAlias.length < 3 || trimmedAlias.length > 16) {
        setError('Custom alias must be between 3 and 16 characters');
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedAlias)) {
        setError('Only letters, numbers, hyphens (-), and underscores (_) are allowed');
        return;
      }
      const RESERVED_ALIASES = ['api', 'health', 'admin', 'login', 'docs', 'favicon', 'robots', 'sitemap', 'static', 'assets', 'dashboard'];
      if (RESERVED_ALIASES.includes(trimmedAlias.toLowerCase())) {
        setError(`'${trimmedAlias}' is a reserved system keyword. Please choose another.`);
        return;
      }
    }

    setInternalIsShortening(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/api/urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl, customAlias: trimmedAlias || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error(`Rate limited — wait ${data.retryAfterSeconds || 60}s`);
        throw new Error(data.error || 'Failed to shorten');
      }

      setInternalCreatedUrl(data);
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
      setInternalIsShortening(false);
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
    <aside className="w-[310px] shrink-0 h-full flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] select-none">
      {/* ── 1. Top Logo Header (72px height, aligned with top bar) ── */}
      <div className="h-[72px] border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Logo tile: 40px, 8px radius, teal tint, 20px pulse icon */}
          <div className="w-10 h-10 rounded-[8px] bg-[var(--accent-tint)] border border-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent-text)] shadow-xs shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[21px] font-semibold tracking-tight text-[var(--text-primary)]">
              PulseLink
            </span>
            {/* CONSOLE: 11px uppercase label with 0.08em tracking in a subtle bordered chip */}
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border)] bg-[var(--surface-raised)] select-none">
              CONSOLE
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="md:hidden p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-control)] hover:bg-[var(--surface-raised)] cursor-pointer"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── 2. Shorten Input Form Section (Desktop-only; on mobile shown at front of main content) ── */}
      <div className="hidden md:block p-4 border-b border-[var(--border)] shrink-0 space-y-3">
        <form onSubmit={handleShorten} className="space-y-2.5">
          {/* Destination URL Input (White background on light, defined border) */}
          <div className="relative flex items-center">
            <LinkIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 pointer-events-none" />
            <input
              type="url"
              required
              placeholder="Paste long URL to shorten…"
              value={originalUrl}
              onChange={(e) => {
                setOriginalUrl(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-control)] pl-8 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus-ring transition-smooth shadow-2xs"
            />
          </div>

          {/* Custom Slug with prefix (3-16 characters) */}
          <div className="flex items-center rounded-[var(--radius-control)] bg-[var(--input-bg)] border border-[var(--input-border)] px-3 py-1.5 text-xs font-mono shadow-2xs focus-within:border-[var(--accent-border)] transition-colors">
            <span className="text-[var(--text-tertiary)] select-none shrink-0 font-medium">
              slug:
            </span>
            <input
              type="text"
              placeholder="alias (3-16 chars)"
              maxLength={16}
              value={customAlias}
              onChange={(e) => {
                setCustomAlias(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-transparent pl-1.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none"
            />
          </div>

          {/* Primary Shorten Button (White text on light, weight 600) */}
          <button
            type="submit"
            disabled={isShortening}
            className="w-full h-9 rounded-[var(--radius-control)] bg-[var(--accent-btn)] hover:bg-[var(--accent-btn-hover)] text-[var(--accent-btn-text)] text-xs font-semibold tracking-tight transition-smooth shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 focus-ring"
          >
            {isShortening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Shorten Link</span>
          </button>
        </form>

        {/* Shorten Success Feedback Pill */}
        {createdUrl && (
          <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-control)] p-2.5 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--text-primary)] truncate font-semibold text-xs">
                /{createdUrl.shortCode}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => copyLink(createdUrl.shortUrl)}
                  title="Copy link"
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-smooth cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={createdUrl.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open link"
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-smooth"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowQR(true)}
                  title="Show QR Code"
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-smooth cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Polished Error Notification with full text wrap & dismiss button */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-2.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-[var(--radius-control)] p-2.5 animate-in fade-in slide-in-from-top-1 duration-150 shadow-2xs"
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="leading-snug break-words font-medium">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              className="p-0.5 rounded text-rose-500/70 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 mt-0.5"
              title="Dismiss error"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── 3. Scrollable Links Section with "Jump to slug" Search ── */}
      <div className="p-3.5 pb-2 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Your Links
          </span>
          <span className="text-xs font-mono font-medium text-[var(--text-tertiary)] tabular-nums">
            {recentCodes.length}
          </span>
        </div>

        {/* Jump to slug search (White bg on light, defined border) */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Jump to slug…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-control)] pl-8 pr-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus-ring transition-smooth shadow-2xs"
          />
        </div>
      </div>

      {/* Links List: Number-only click count on right, zero in tertiary, selected row teal */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-0.5 custom-scrollbar min-h-0">
        {filteredCodes.length > 0 ? (
          filteredCodes.map((code) => {
            const isSelected = activeCode === code;
            const clicks = linkClicksMap ? linkClicksMap[code] : undefined;
            const countNum = clicks !== undefined ? Number(clicks) : 0;

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
                    ? 'border-l-2 border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--text-primary)] font-semibold pl-2 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] pl-2.5'
                }`}
              >
                <span className={`truncate ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'font-normal'}`}>
                  /{code}
                </span>

                {/* Right: Click count as number only (tabular, 13px, secondary color; zero in tertiary; teal on active) */}
                <span
                  className={`text-[13px] font-sans tabular-nums shrink-0 ml-2 ${
                    isSelected
                      ? 'text-[var(--accent-text)] font-semibold'
                      : countNum > 0
                      ? 'text-[var(--text-secondary)] font-medium'
                      : 'text-[var(--text-tertiary)]'
                  }`}
                >
                  {countNum}
                </span>
              </button>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
            {searchFilter ? 'No links found' : 'No shortened links yet'}
          </div>
        )}
      </div>

      {/* QR Code Modal Dialog */}
      {showQR && createdUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] p-5 shadow-2xl text-center space-y-3.5 max-w-xs w-full transition-smooth">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">QR Code</span>
              <button
                onClick={() => setShowQR(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-smooth"
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
