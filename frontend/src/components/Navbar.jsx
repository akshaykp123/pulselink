import React from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export default function Navbar({ autoRefresh, setAutoRefresh, onSimulateClick, isSimulating }) {
  return (
    <header
      className="border-b border-slate-100 bg-white sticky top-0 z-50 flex items-center justify-between px-5"
      style={{ height: '38px' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 block" />
        <span className="text-[11px] font-semibold text-slate-900 tracking-tight">PulseLink</span>
        <span className="text-[10px] text-slate-300 select-none">/</span>
        <span className="text-[10px] text-slate-400 font-medium">console</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* Live toggle */}
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition cursor-pointer ${
            autoRefresh
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
          {autoRefresh ? 'Live · 3s' : 'Live'}
        </button>

        {/* Simulate */}
        <button
          onClick={onSimulateClick}
          disabled={isSimulating}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer"
        >
          {isSimulating
            ? <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            : <Activity className="w-2.5 h-2.5" />}
          {isSimulating ? 'Logging…' : 'Simulate'}
        </button>
      </div>
    </header>
  );
}