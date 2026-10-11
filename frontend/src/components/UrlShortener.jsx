import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, QrCode, Loader2, AlertCircle, X, Link as LinkIcon } from 'lucide-react';

export default function UrlShortener({ onUrlCreated, activeCode, onSelectCode, recentCodes = [] }) {
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
      const res = await fetch('http://localhost:5000/api/urls', {
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
    const cleanCode = searchCode.trim().replace(/^\//, ''); // removes leading "/" if entered
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
    <div className="bg-white border border-slate-100 rounded-lg divide-y divide-slate-100">
      {/* Row 1: URL input form */}
      <form onSubmit={handleShorten} className="flex items-center">
        {/* Long URL input */}
        <div className="flex flex-1 items-center gap-2 px-3 sm:px-3.5 py-2.5 border-r border-slate-100 min-w-0">
          <LinkIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <input
            type="url"
            required
            placeholder="Paste a long URL to shorten…"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            className="flex-1 bg-transparent text-[11px] text-slate-800 outline-none placeholder:text-slate-300 min-w-0"
          />
        </div>

        {/* Custom slug */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 border-r border-slate-100">
          <span className="text-[10px] text-slate-300 shrink-0 select-none">/</span>
          <input
            type="text"
            placeholder="custom-slug"
            value={customAlias}
            onChange={(e) => setCustomAlias(e.target.value)}
            className="w-16 sm:w-24 bg-transparent text-[11px] text-slate-700 outline-none placeholder:text-slate-300"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isShortening}
          className="flex items-center gap-1 px-3 sm:px-4 py-2.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition cursor-pointer shrink-0"
        >
          {isShortening ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
          Shorten →
        </button>
      </form>

      {/* Row 2: Inspect Search + Scrollable Chips + Result Banner */}
      <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 flex-wrap min-h-[32px]">
        <span className="text-[10px] text-slate-400 font-medium shrink-0">Inspect:</span>

        {/* 1. Quick search for ANY short code */}
        <form onSubmit={handleInspectSubmit} className="flex items-center gap-1 shrink-0">
          <input
            type="text"
            placeholder="code…"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-14 sm:w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-700 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-2 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium cursor-pointer"
          >
            Go
          </button>
        </form>

        {/* 2. Horizontally scrollable recent chips — scrollbar hidden */}
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto py-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {recentCodes.map((code) => (
            <button
              key={code}
              onClick={() => onSelectCode && onSelectCode(code)}
              className={`px-1.5 py-px rounded text-[9.5px] font-mono shrink-0 transition cursor-pointer border ${
                activeCode === code
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200 hover:text-slate-700'
              }`}
            >
              /{code}
            </button>
          ))}
        </div>

        {/* Generated short URL result — distinct compact pill */}
        {createdUrl && (
          <div className="ml-auto flex items-center gap-1.5 shrink-0 bg-emerald-50/80 border border-emerald-200/70 rounded px-2 py-0.5">
            <span className="text-[9.5px] font-mono text-emerald-800 truncate max-w-[150px]">{createdUrl.shortUrl}</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => copyLink(createdUrl.shortUrl)} title="Copy" className="p-0.5 text-emerald-600 hover:text-emerald-800 transition cursor-pointer">
                {copied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
              </button>
              <a href={createdUrl.shortUrl} target="_blank" rel="noreferrer" title="Visit" className="p-0.5 text-emerald-600 hover:text-emerald-800 transition">
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button onClick={() => setShowQR(true)} title="QR Code" className="p-0.5 text-emerald-600 hover:text-emerald-800 transition cursor-pointer">
                <QrCode className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}

        {/* Inline error */}
        {error && (
          <div className="ml-auto flex items-center gap-1 text-[9.5px] text-red-500 shrink-0 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
            <AlertCircle className="w-2.5 h-2.5" />
            {error}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && createdUrl && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg text-center space-y-3 w-52">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-800">QR Code</span>
              <button onClick={() => setShowQR(false)} className="text-slate-300 hover:text-slate-600 cursor-pointer transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 inline-block">
              <QRCodeSVG value={createdUrl.shortUrl} size={112} />
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">{createdUrl.shortUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}