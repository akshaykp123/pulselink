import React from 'react';
import { AnalyticsSummaryData, CountryStat, DeviceStat } from '../types/analytics';

export interface AnalyticsSummaryProps {
  summary?: AnalyticsSummaryData | null;
  countries?: CountryStat[];
  devices?: DeviceStat[];
}

interface StatItem {
  label: string;
  value: string | number;
  sub: string;
}

// Display mapping from ISO-3166 2-letter country code to full readable country name
function getDisplayCountry(rawCountry?: string): string {
  if (!rawCountry || rawCountry === 'Unknown') return 'No Data';
  if (rawCountry === 'Localhost (Dev)' || rawCountry === 'Localhost') return 'Localhost (Dev)';
  if (rawCountry.length === 2) {
    try {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      return regionNames.of(rawCountry.toUpperCase()) || rawCountry;
    } catch {
      return rawCountry;
    }
  }
  return rawCountry;
}

export default function AnalyticsSummary({
  summary,
  countries,
  devices,
}: AnalyticsSummaryProps): React.JSX.Element {
  const topCountry = getDisplayCountry(countries?.[0]?.country);

  const stats: StatItem[] = [
    {
      label: 'Total Clicks',
      value: summary?.totalClicks ?? 0,
      sub: 'All time redirects',
    },
    {
      label: 'Unique Visitors',
      value: summary?.uniqueVisitors ?? 0,
      sub: 'Distinct visitor hash',
    },
    {
      label: 'Top Location',
      value: topCountry,
      sub: countries?.[0]?.clicks ? `${Number(countries[0].clicks).toLocaleString()} clicks` : 'No data yet',
    },
    {
      label: 'Primary Device',
      value: devices?.[0]?.device_type || 'No Data',
      sub: devices?.[0]?.clicks ? `${Number(devices[0].clicks).toLocaleString()} hits` : 'No data yet',
    },
  ];

  return (
    <div className="bg-[var(--surface)] rounded-[var(--radius-card)] border border-[var(--border)] shadow-[var(--shadow-card)] grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] overflow-hidden transition-smooth">
      {stats.map((s, i) => (
        <div key={i} className="px-5 py-4 sm:px-6 sm:py-5 min-w-0">
          <p className="text-xs font-medium text-[var(--text-secondary)] tracking-tight truncate mb-2">
            {s.label}
          </p>
          <p className="text-[28px] sm:text-[30px] font-semibold text-[var(--text-primary)] leading-none truncate tabular-nums tracking-tight my-1">
            {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] truncate mt-2 font-normal">
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
