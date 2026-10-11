import React from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export default function Navbar({ autoRefresh, setAutoRefresh, onSimulateClick, isSimulating }) {
  return (
          <header className="border-b border-slate-200 bg-white sticky top-0 z-50 h-14 flex items-center">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block shrink-0 shadow-xs" />
          <span className="text-base font-bold text-slate-900 tracking-tight">PulseLink</span>
          <span className="text-sm text-slate-300 select-none">/</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1 sm:mr-0">Console</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shrink-0 ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span>{autoRefresh ? 'Live (3s)' : 'Live Off'}</span>
          </button>

          {/* Simulate */}
          <button
            onClick={onSimulateClick}
            disabled={isSimulating}
            className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            {isSimulating
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Activity className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Logging…' : 'Simulate Click'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}