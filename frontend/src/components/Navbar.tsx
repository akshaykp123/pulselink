import React, { useState, useEffect } from 'react';
import { RefreshCw, Sun, Moon, Menu } from 'lucide-react';

export interface NavbarProps {
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  onSimulateClick: () => void;
  isSimulating: boolean;
  onToggleSidebar?: () => void;
}

export default function Navbar({
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
    <header className="h-12 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30 flex items-center px-4 sm:px-8 justify-between transition-smooth shrink-0">
      {/* Mobile drawer toggle (< 900px) */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-smooth focus-ring cursor-pointer"
          title="Toggle Navigation"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Small mobile logo mark visible only on small screens */}
        <div className="flex md:hidden items-center gap-2">
          <svg className="w-4 h-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">PulseLink</span>
        </div>
      </div>

      {/* Actions: Live switch, secondary Simulate Click, and theme toggle */}
      <div className="flex items-center gap-2.5 ml-auto">
        {/* Live switch: teal track when on, neutral when off, pulsing teal dot */}
        <button
          type="button"
          role="switch"
          aria-checked={autoRefresh}
          onClick={() => setAutoRefresh(!autoRefresh)}
          className="flex items-center gap-2 cursor-pointer select-none py-1 px-2 rounded-[var(--radius-control)] hover:bg-[var(--surface-raised)] transition-smooth focus-ring"
          title={autoRefresh ? 'Live updates active (polling every 3s)' : 'Click to enable live polling'}
        >
          <div className="relative inline-flex items-center">
            <div
              className={`w-7 h-4 rounded-full transition-colors duration-150 ease-out ${
                autoRefresh
                  ? 'bg-[var(--accent)]'
                  : 'bg-[var(--surface-raised)] border border-[var(--border)]'
              }`}
            />
            <div
              className={`absolute left-0.5 top-0.5 bg-white dark:bg-[#0A0F12] w-3 h-3 rounded-full transition-transform duration-150 ease-out shadow-xs ${
                autoRefresh ? 'translate-x-3' : 'translate-x-0'
              }`}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            {autoRefresh && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]"></span>
              </span>
            )}
            <span>Live</span>
          </div>
        </button>

        {/* Secondary outlined button for Simulate Click */}
        <button
          onClick={onSimulateClick}
          disabled={isSimulating}
          className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-transparent hover:bg-[var(--surface-raised)] active:bg-[var(--surface-hover)] text-xs font-medium text-[var(--text-primary)] transition-smooth focus-ring disabled:opacity-50 cursor-pointer shadow-xs"
          title="Simulate redirect click event"
        >
          {isSimulating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
          ) : (
            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          )}
          <span className="hidden sm:inline">{isSimulating ? 'Logging…' : 'Simulate Click'}</span>
          <span className="sm:hidden">{isSimulating ? '…' : 'Simulate'}</span>
        </button>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-8 h-8 rounded-[var(--radius-control)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-smooth focus-ring cursor-pointer"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
