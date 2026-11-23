import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Sun, Moon } from 'lucide-react';

export interface NavbarProps {
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  onSimulateClick: () => void;
  isSimulating: boolean;
}

export default function Navbar({
  autoRefresh,
  setAutoRefresh,
  onSimulateClick,
  isSimulating,
}: NavbarProps): React.JSX.Element {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pulselink_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('pulselink_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pulselink_theme', 'light');
    }
  }, [isDark]);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-50 h-14 flex items-center transition-smooth">
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 min-w-0">
        {/* Brand: PulseLink at weight 600 + quiet muted console */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-[6px] bg-[var(--accent)] flex items-center justify-center text-white shadow-xs">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
            PulseLink
          </span>
          <span className="text-xs font-normal text-[var(--text-muted)] tracking-normal pl-0.5">
            console
          </span>
        </div>

        {/* Actions: Live switch, secondary outlined button, theme toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Live switch with pulsing green dot when active */}
          <button
            type="button"
            role="switch"
            aria-checked={autoRefresh}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2 cursor-pointer select-none py-1 px-2 rounded-[var(--radius-control)] hover:bg-[var(--surface-subtle)] transition-smooth focus-ring"
          >
            <div className="relative inline-flex items-center">
              <div
                className={`w-7 h-4 rounded-full transition-smooth ${
                  autoRefresh ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
              />
              <div
                className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-smooth shadow-xs ${
                  autoRefresh ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
              {autoRefresh && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              )}
              <span>Live</span>
            </div>
          </button>

          {/* Secondary outlined button for Simulate Click */}
          <button
            onClick={onSimulateClick}
            disabled={isSimulating}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-transparent hover:bg-[var(--surface-subtle)] active:bg-[var(--surface-hover)] text-xs font-medium text-[var(--text-primary)] transition-smooth focus-ring disabled:opacity-50 cursor-pointer shadow-xs"
            title="Simulate redirect click event"
          >
            {isSimulating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
            <span>{isSimulating ? 'Logging…' : 'Simulate Click'}</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-8 h-8 rounded-[var(--radius-control)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-smooth focus-ring cursor-pointer"
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
