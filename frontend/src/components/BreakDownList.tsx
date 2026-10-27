import React from 'react';

export interface BreakdownListProps {
  title: string;
  items?: Record<string, any>[];
  labelKey: string;
  countKey: string;
  barColor?: string;
}

export default function BreakdownList({
  title,
  items = [],
  labelKey,
  countKey,
  barColor = 'bg-blue-600',
}: BreakdownListProps) {
  const total = items ? items.reduce((acc, curr) => acc + Number(curr[countKey] || 0), 0) : 0;

  return (
    <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-xs space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      <div className="space-y-2.5">
        {items && items.length > 0 ? (
          items.map((item, index) => {
            const count = Number(item[countKey] || 0);
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">{item[labelKey]}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{count} clicks ({percent}%)</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${percent}%` }}></div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-slate-400">No data available</p>
        )}
      </div>
    </div>
  );
}
