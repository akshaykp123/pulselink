import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, QrCode, Loader2, AlertCircle, X, Link as LinkIcon } from 'lucide-react';

export default function UrlShortener({ 
  onUrlCreated, 
  activeCode, 
  onSelectCode, 
  recentCodes = [], 
  apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000' 
}) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [createdUrl, setCreatedUrl] = useState(null);
  const [isShortening, setIsShortening] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [searchCode, setSearchCode] = useState('');

  const handleShorten = async (e) => {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setIsShortening(false);
    }
  };

  const handleInspectSubmit = (e) => {
    e.preventDefault();
    const cleanCode = searchCode.trim().replace(/^\//, '');
    if (cleanCode && onSelectCode) {
      onSelectCode(cleanCode);
      setSearchCode('');
    }
  };

  const copyLink = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs divide-y divide-slate-100">
      {/* Row 1: URL input form */}
      <form onSubmit={handleShorten} className="flex items-center">
        {/* Long URL input */}
        <div className="flex flex-1 items-center gap-2.5 px-4 py-3 border-r border-slate-100 min-w-0">
          <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="url"
            required
            placeholder="Paste a long URL to shorten (e.g. https://github.com/torvalds/linux)…"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 min-w-0"
          />
        </div>

        {/* Custom slug */}
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-3 border-r border-slate-100">
          <span className="text-xs text-slate-300 shrink-0 select-none font-mono">/</span>
          <input
            type="text"
            placeholder="custom-slug"
            value={customAlias}
            onChange={(e) => setCustomAlias(e.target.value)}
            className="w-20 sm:w-28 bg-transparent text-xs sm:text-sm text-slate-700 outline-none placeholder:text-slate-400 font-mono"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isShortening}
          className="flex items-center gap-1.5 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition cursor-pointer shrink-0"
        >
          {isShortening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Shorten →
        </button>
      </form>

      {/* Row 2: Inspect Search + Scrollable Chips + Result Banner */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 flex-wrap min-h-[38px]">
        <span className="text-xs text-slate-500 font-semibold shrink-0">Inspect:</span>

        {/* 1. Quick search for ANY short code */}
        <form onSubmit={handleInspectSubmit} className="flex items-center gap-1 shrink-0">
          <input
            type="text"
            placeholder="code…"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-16 sm:w-20 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-mono text-slate-700 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer transition"
          >
            Go
          </button>
        </form>

        {/* 2. Horizontally scrollable recent chips */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto py-0.5 [&::-webkit-scrollbar]:hidden">
          {recentCodes.map((code) => (
            <button
              key={code}
              onClick={() => onSelectCode && onSelectCode(code)}
              className={`px-2 py-1 rounded-md text-xs font-mono shrink-0 transition cursor-pointer border ${
                activeCode === code
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              /{code}
            </button>
          ))}
        </div>

        {/* Generated short URL result banner */}
        {createdUrl && (
          <div className="ml-auto flex items-center gap-2 shrink-0 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
            <span className="text-xs font-mono text-blue-900 font-semibold truncate max-w-[200px]">{createdUrl.shortUrl}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => copyLink(createdUrl.shortUrl)} title="Copy" className="p-1 text-blue-600 hover:text-blue-800 transition cursor-pointer">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a href={createdUrl.shortUrl} target="_blank" rel="noreferrer" title="Visit" className="p-1 text-blue-600 hover:text-blue-800 transition">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => setShowQR(true)} title="QR Code" className="p-1 text-blue-600 hover:text-blue-800 transition cursor-pointer">
                <QrCode className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Inline error */}
        {error && (
          <div className="ml-auto flex items-center gap-1 text-xs text-red-600 shrink-0 bg-red-50 px-2 py-1 rounded-md border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && createdUrl && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-center space-y-4 max-w-xs w-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">QR Code</span>
              <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 inline-block">
              <QRCodeSVG value={createdUrl.shortUrl} size={140} />
            </div>
            <p className="text-xs text-slate-600 font-mono truncate">{createdUrl.shortUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}