import React from 'react';
import { Activity, RefreshCw } from 'lucide-react';

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
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 h-16 sm:h-[68px] flex items-center">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 shadow-xs"></span>
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">PulseLink</span>
          <span className="text-base text-slate-300 select-none font-light">/</span>
          <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-md">Console</span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 shadow-2xs ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span>{autoRefresh ? 'Live (3s)' : 'Live Off'}</span>
          </button>

          <button
            onClick={onSimulateClick}
            disabled={isSimulating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm hover:shadow active:scale-95 shrink-0"
          >
            {isSimulating
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Activity className="w-4 h-4" />}
            <span>{isSimulating ? 'Logging…' : 'Simulate Click'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
