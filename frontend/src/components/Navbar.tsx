import React, { useState, useEffect } from 'react';
import { RefreshCw, Sun, Moon, Menu } from 'lucide-react';

export interface NavbarProps {
  activeCode?: string;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  onSimulateClick: () => void;
  isSimulating: boolean;
  onToggleSidebar?: () => void;
}

export default function Navbar({
  activeCode = '',
  autoRefresh,
  setAutoRefresh,
  onSimulateClick,
  isSimulating,
  onToggleSidebar,
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
    <header className="h-[72px] border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30 flex items-center px-3 sm:px-8 justify-between transition-smooth shrink-0 min-w-0">
      {/* Left: Mobile hamburger (< 900px, 40px tap target) + Desktop Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden h-10 w-10 p-0 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-smooth focus-ring cursor-pointer flex items-center justify-center shrink-0"
          title="Toggle Navigation"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Breadcrumb only (hidden on mobile to prevent clipped "Links" label & overflow) */}
        <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 text-sm font-medium min-w-0 truncate">
          <span className="text-[var(--text-secondary)]">Links</span>
          <span className="text-[var(--text-tertiary)] select-none">/</span>
          <span className="text-[var(--text-primary)] font-semibold font-mono truncate">
            {activeCode ? `/${activeCode}` : 'All telemetry'}
          </span>
        </nav>
      </div>

      {/* Right: Live switch, Simulate Click (icon-only on mobile), Theme toggle (40px tap targets, 8px gaps on mobile) */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Live switch: 40px height on mobile / 36px on desktop, visible 3:1 contrast border in off state */}
        <button
          type="button"
          role="switch"
          aria-checked={autoRefresh}
          onClick={() => setAutoRefresh(!autoRefresh)}
          className="h-10 sm:h-9 px-2 sm:px-3 flex items-center gap-2 cursor-pointer select-none rounded-[var(--radius-control)] hover:bg-[var(--surface-raised)] transition-smooth focus-ring shrink-0"
          title={autoRefresh ? 'Live updates active (polling every 3s)' : 'Click to enable live polling'}
        >
          <div className="relative inline-flex items-center">
            <div
              className={`w-8 h-4 rounded-full transition-colors duration-150 ease-out ${
                autoRefresh
                  ? 'bg-[var(--accent)]'
                  : 'bg-[var(--surface-raised)] border border-[var(--border-strong)]'
              }`}
            />
            <div
              className={`absolute left-0.5 top-0.5 bg-white dark:bg-[#0A0F12] w-3 h-3 rounded-full transition-transform duration-150 ease-out shadow-xs ${
                autoRefresh ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
            {autoRefresh && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-text)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent-text)]"></span>
              </span>
            )}
            <span>Live</span>
          </div>
        </button>

        {/* Thin Divider on desktop */}
        <div className="hidden sm:block h-5 w-px bg-[var(--border)] shrink-0" />

        {/* Simulate Click (40px icon-only button on mobile, text on desktop) */}
        <button
          onClick={onSimulateClick}
          disabled={isSimulating}
          className="h-10 w-10 sm:h-9 sm:w-auto p-0 sm:px-3.5 flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-transparent hover:bg-[var(--surface-raised)] active:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-smooth focus-ring disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
          title="Simulate redirect click event"
          aria-label="Simulate redirect click"
        >
          {isSimulating ? (
            <RefreshCw className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin text-[var(--accent-text)]" />
          ) : (
            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          )}
          <span className="hidden sm:inline">{isSimulating ? 'Logging…' : 'Simulate Click'}</span>
        </button>

        {/* Thin Divider on desktop */}
        <div className="hidden sm:block h-5 w-px bg-[var(--border)] shrink-0" />

        {/* Light / Dark Mode Toggle (40px tap target on mobile, 36px on desktop) */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="h-10 w-10 sm:h-9 sm:w-9 rounded-[var(--radius-control)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-smooth focus-ring cursor-pointer shadow-xs shrink-0"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
