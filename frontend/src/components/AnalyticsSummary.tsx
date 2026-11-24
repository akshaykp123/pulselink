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
  isNumeric: boolean;
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
      isNumeric: true,
      sub: 'All time redirects',
    },
    {
      label: 'Unique Visitors',
      value: summary?.uniqueVisitors ?? 0,
      isNumeric: true,
      sub: 'Distinct visitor hash',
    },
    {
      label: 'Top Location',
      value: topCountry,
      isNumeric: false,
      sub: countries?.[0]?.clicks ? `${Number(countries[0].clicks).toLocaleString()} clicks` : 'No telemetry yet',
    },
    {
      label: 'Primary Device',
      value: devices?.[0]?.device_type || 'No Data',
      isNumeric: false,
      sub: devices?.[0]?.clicks ? `${Number(devices[0].clicks).toLocaleString()} hits` : 'No telemetry yet',
    },
  ];

  return (
    <div className="bg-[var(--surface)] rounded-[var(--radius-panel)] border border-[var(--border)] shadow-[var(--shadow-card)] grid grid-cols-2 lg:grid-cols-4 overflow-hidden transition-smooth">
      {stats.map((s, i) => (
        <div
          key={i}
          className={`px-4 py-3.5 sm:px-6 sm:py-5 min-w-0 flex flex-col justify-between ${
            i % 2 === 0 ? 'border-r border-[var(--border)]' : ''
          } ${
            i < 2 ? 'border-b border-[var(--border)] lg:border-b-0' : ''
          } ${
            i === 1 ? 'lg:border-r lg:border-[var(--border)]' : ''
          } ${
            i === 2 ? 'lg:border-r lg:border-[var(--border)]' : ''
          }`}
        >
          <p className="text-[12.5px] font-medium text-[var(--text-secondary)] tracking-tight truncate mb-2">
            {s.label}
          </p>
          <div className="my-1 flex items-baseline truncate">
            {s.isNumeric ? (
              <span className="text-[28px] font-semibold text-[var(--text-primary)] leading-none tabular-nums tracking-tight">
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
              </span>
            ) : (
              <span className="text-[22px] font-semibold text-[var(--text-primary)] leading-tight truncate tracking-tight">
                {s.value}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] truncate mt-2 font-normal">
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
