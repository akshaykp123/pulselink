import React from 'react';

export default function AnalyticsSummary({ summary, countries, devices }) {
  const stats = [
    {
      label: 'Total Clicks',
      value: summary?.totalClicks ?? 0,
    },
    {
      label: 'Unique Visitors',
      value: summary?.uniqueVisitors ?? 0,
    },
    {
      label: 'Top Country',
      value: countries?.[0]?.country || '—',
    },
    {
      label: 'Primary Device',
      value: devices?.[0]?.device_type || '—',
    },
  ];

  return (
    <div
      className="bg-white rounded-lg flex divide-x divide-slate-100"
      style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}
    >
      {stats.map((s, i) => (
        <div key={i} className="flex-1 min-w-0 px-4 sm:px-5 py-3.5">
          <p
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '5px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {s.label}
          </p>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0f172a',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}