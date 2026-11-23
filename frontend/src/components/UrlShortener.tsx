import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy, Check, ExternalLink, QrCode, Loader2, AlertCircle, X,
  Link as LinkIcon, ChevronDown, Search
} from 'lucide-react';
import type { UrlData } from '../types/analytics';

export interface UrlShortenerProps {
  onUrlCreated?: (shortCode: string) => void;
  activeCode?: string;
  onSelectCode?: (code: string) => void;
  recentCodes?: string[];
  apiBase?: string;
}

export default function UrlShortener({
  onUrlCreated,
  activeCode = '',
  onSelectCode,
  recentCodes = [],
  apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000',
}: UrlShortenerProps) {
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [customAlias, setCustomAlias] = useState<string>('');
  const [createdUrl, setCreatedUrl] = useState<UrlData | null>(null);
  const [isShortening, setIsShortening] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showQR, setShowQR] = useState<boolean>(false);
  const [searchCode, setSearchCode] = useState<string>('');
  const [showOverflow, setShowOverflow] = useState<boolean>(false);
  const [dropdownSearch, setDropdownSearch] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOverflow(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleInspectSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanCode = searchCode.trim().replace(/^\//, '');
    if (cleanCode && onSelectCode) {
      onSelectCode(cleanCode);
      setSearchCode('');
    }
  };

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const primaryChips = recentCodes.slice(0, 5);
  const overflowCodes = recentCodes.slice(5);
  const filteredOverflow = overflowCodes.filter((c) =>
    c.toLowerCase().includes(dropdownSearch.toLowerCase().trim())
  );

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden transition-smooth">
      {/* ── CREATE BAR: single row with thin dividers and filled primary 40px button ── */}
      <form onSubmit={handleShorten} className="flex items-center p-1.5 gap-1.5 flex-wrap sm:flex-nowrap">
        {/* Long URL Input */}
        <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5 min-w-[200px]">
          <LinkIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="url"
            required
            placeholder="Paste a long URL to shorten…"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>

        {/* Thin Divider */}
        <div className="hidden sm:block w-[1px] h-6 bg-[var(--border)]" />

        {/* Custom Slug with muted prefix */}
        <div className="flex items-center gap-1 px-3 py-1.5 shrink-0 bg-[var(--surface-subtle)] sm:bg-transparent rounded-[var(--radius-control)] sm:rounded-none">
          <span className="text-xs text-[var(--text-muted)] font-mono select-none">
            pulselink.app/
          </span>
          <input
            type="text"
            placeholder="custom-slug"
            value={customAlias}
            onChange={(e) => setCustomAlias(e.target.value)}
            className="w-24 sm:w-28 bg-transparent text-xs sm:text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>

        {/* Thin Divider */}
        <div className="hidden sm:block w-[1px] h-6 bg-[var(--border)]" />

        {/* Filled Primary 40px Button */}
        <button
          type="submit"
          disabled={isShortening}
          className="h-10 px-5 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-medium transition-smooth shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 focus-ring"
        >
          {isShortening ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          <span>Shorten</span>
        </button>
      </form>

      {/* Thin Horizontal Divider */}
      <div className="h-[1px] w-full bg-[var(--border)]" />

      {/* ── YOUR LINKS ROW: latest 5 chips + dropdown popover ── */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 min-h-[38px] bg-[var(--surface)] text-xs flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <span className="text-xs font-medium text-[var(--text-muted)] shrink-0 mr-1 select-none">
            Your links
          </span>

          {/* Top 5 Chips */}
          {primaryChips.map((code) => {
            const isSelected = activeCode === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelectCode && onSelectCode(code)}
                className={`h-6 px-2.5 rounded-full text-xs font-mono transition-smooth cursor-pointer shrink-0 flex items-center gap-1 focus-ring ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white font-medium shadow-xs'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                <span>/{code}</span>
              </button>
            );
          })}

          {/* +N More Popover Dropdown */}
          {overflowCodes.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowOverflow(!showOverflow)}
                className="h-6 px-2.5 rounded-full text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center gap-1 transition-smooth cursor-pointer focus-ring"
              >
                <span>+{overflowCodes.length} more</span>
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
              </button>

              {showOverflow && (
                <div className="absolute left-0 top-8 z-50 w-56 rounded-[var(--radius-control)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-dropdown)] p-1.5 transition-smooth">
                  <div className="flex items-center gap-1.5 px-2 py-1 border-b border-[var(--border)] mb-1">
                    <Search className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                    <input
                      type="text"
                      placeholder="Filter links…"
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {filteredOverflow.length > 0 ? (
                      filteredOverflow.map((code) => {
                        const isSelected = activeCode === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              if (onSelectCode) onSelectCode(code);
                              setShowOverflow(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-[6px] text-xs font-mono transition-smooth flex items-center justify-between ${
                              isSelected
                                ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <span>/{code}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-2 py-2 text-[11px] text-[var(--text-muted)] text-center">
                        No links found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Lookup Input */}
          <form onSubmit={handleInspectSubmit} className="flex items-center gap-1 shrink-0 ml-1">
            <input
              type="text"
              placeholder="Jump to slug…"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-24 sm:w-28 h-6 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-full px-2.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-ring"
            />
          </form>
        </div>

        {/* Shortened URL Feedback Pill */}
        {createdUrl && (
          <div className="flex items-center gap-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-full px-2.5 py-0.5 shrink-0">
            <span className="text-xs font-mono text-[var(--text-primary)] font-medium truncate max-w-[180px]">
              {createdUrl.shortUrl}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => copyLink(createdUrl.shortUrl)}
                title="Copy short link"
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-smooth cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={createdUrl.shortUrl}
                target="_blank"
                rel="noreferrer"
                title="Open short link"
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-smooth"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowQR(true)}
                title="Show QR Code"
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-smooth cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/40 shrink-0">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* QR Code Modal Dialog */}
      {showQR && createdUrl && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-dropdown)] text-center space-y-4 max-w-xs w-full transition-smooth">
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
    </div>
  );
}
