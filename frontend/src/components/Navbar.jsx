import React from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export default function Navbar({ autoRefresh, setAutoRefresh, onSimulateClick, isSimulating }) {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 flex items-center justify-between px-6 h-12">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-600 block shrink-0" />
        <span className="text-sm font-bold text-slate-900 tracking-tight">PulseLink</span>
        <span className="text-xs text-slate-300 select-none">/</span>
        <span className="text-xs text-slate-500 font-medium">Console</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2.5">
        {/* Live toggle */}
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-medium transition cursor-pointer ${
            autoRefresh
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          {autoRefresh ? 'Live (3s)' : 'Live Off'}
        </button>

        {/* Simulate */}
        <button
          onClick={onSimulateClick}
          disabled={isSimulating}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer shadow-sm"
        >
          {isSimulating
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Activity className="w-3.5 h-3.5" />}
          {isSimulating ? 'Logging…' : 'Simulate'}
        </button>
      </div>
    </header>
  );
}