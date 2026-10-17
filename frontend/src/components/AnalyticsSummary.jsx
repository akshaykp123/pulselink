import React from 'react';

// Top-level KPI summary strip (Total Clicks, Unique Visitors, Top Country, Primary Device)
export default function AnalyticsSummary({ summary, countries, devices }) {
  // Extract key summary metrics for display
  const stats = [
    {
      label: 'Total Clicks',
      value: summary?.totalClicks ?? 0,
      sub: 'All time',
      color: 'text-blue-600',
    },
    {
      label: 'Unique Visitors',
      value: summary?.uniqueVisitors ?? 0,
      sub: 'By IP hash',
      color: 'text-indigo-600',
    },
    {
      label: 'Top Location',
      value: countries?.[0]?.country || 'No Data',
      sub: countries?.[0]?.clicks ? `${countries[0].clicks} clicks` : '—',
      color: 'text-emerald-600',
    },
    {
      label: 'Primary Device',
      value: devices?.[0]?.device_type || 'No Data',
      sub: devices?.[0]?.clicks ? `${devices[0].clicks} hits` : '—',
      color: 'text-amber-600',
    },
  ];

  return (
    // Responsive grid: 4 columns with vertical dividers on desktop, 2x2 grid on mobile
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-hidden">
      {stats.map((s, i) => (
        <div key={i} className="px-5 sm:px-6 py-4 sm:py-5 min-w-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate mb-1">
            {s.label}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none truncate tabular-nums my-1">
            {s.value}
          </p>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  );
}