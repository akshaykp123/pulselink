import React from 'react';

export default function AnalyticsSummary({ summary, countries, devices }) {
  const stats = [
    {
      label: 'Total Clicks',
      value: summary?.totalClicks ?? 0,
      sub: 'All time',
    },
    {
      label: 'Unique Visitors',
      value: summary?.uniqueVisitors ?? 0,
      sub: 'By IP hash',
    },
    {
      label: 'Top Location',
      value: countries?.[0]?.country || 'No Data',
      sub: countries?.[0]?.clicks ? `${countries[0].clicks} clicks` : '—',
    },
    {
      label: 'Primary Device',
      value: devices?.[0]?.device_type || 'No Data',
      sub: devices?.[0]?.clicks ? `${devices[0].clicks} hits` : '—',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex divide-x divide-slate-100 overflow-hidden">
      {stats.map((s, i) => (
        <div key={i} className="flex-1 min-w-0 px-5 sm:px-6 py-4">
          <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider truncate mb-1">
            {s.label}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight truncate tabular-nums">
            {s.value}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  );
}