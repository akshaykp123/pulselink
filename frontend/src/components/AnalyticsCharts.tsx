import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { TimelinePoint, CountryStat, DeviceStat, BrowserStat, ReferrerStat, BreakdownItem } from '../types/analytics';

type TabType = 'Countries' | 'Devices' | 'Browsers' | 'Referrers';
type RangeType = '24h' | '7d' | '30d';

const TABS: TabType[] = ['Countries', 'Devices', 'Browsers', 'Referrers'];

function formatCountryName(countryCodeOrName: string): string {
  if (!countryCodeOrName || countryCodeOrName === 'Unknown') return 'Unknown';
  if (countryCodeOrName === 'Localhost (Dev)' || countryCodeOrName === 'Localhost') return 'Localhost (Dev)';
  if (countryCodeOrName.length === 2) {
    try {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      return regionNames.of(countryCodeOrName.toUpperCase()) || countryCodeOrName;
    } catch {
      return countryCodeOrName;
    }
  }
  return countryCodeOrName;
}

export interface AnalyticsChartsProps {
  timeline?: TimelinePoint[];
  countries?: CountryStat[];
  devices?: DeviceStat[];
  browsers?: BrowserStat[];
  referrers?: ReferrerStat[];
}

export default function AnalyticsCharts({
  timeline = [],
  countries = [],
  devices = [],
  browsers = [],
  referrers = [],
}: AnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Countries');
  const [timeRange, setTimeRange] = useState<RangeType>('24h');

  // Normalize different metric structures into uniform { label, count } format
  const activeList: BreakdownItem[] =
    activeTab === 'Countries'
      ? countries.map((c) => ({ label: c.country || 'Unknown', count: Number(c.clicks) }))
      : activeTab === 'Devices'
      ? devices.map((d) => ({ label: d.device_type || 'Unknown', count: Number(d.clicks) }))
      : activeTab === 'Browsers'
      ? browsers.map((b) => ({ label: b.browser || 'Unknown', count: Number(b.clicks) }))
      : referrers.map((r) => ({ label: r.referrer || 'Direct', count: Number(r.clicks) }));

  const totalListClicks = activeList.reduce((acc, curr) => acc + curr.count, 0);
  const maxClicks = Math.max(...activeList.map((i) => i.count), 1);

  return (
    <>
      <style>{`
        .charts-responsive-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          width: 100%;
        }
        @media (max-width: 860px) {
          .charts-responsive-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="charts-responsive-grid">
        {/* ── LEFT: Click Traffic Area Chart ── */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] p-5 flex flex-col min-w-0 shadow-[var(--shadow-card)] transition-smooth" style={{ height: '330px' }}>
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border)] shrink-0">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Click Traffic</p>
              <p className="text-[11px] text-[var(--text-muted)]">Hourly volume overview</p>
            </div>

            {/* Segmented range control (24h / 7d / 30d) */}
            <div className="flex items-center p-0.5 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] border border-[var(--border)] shrink-0">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-smooth cursor-pointer ${
                    timeRange === r
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full min-h-0 pt-1">
            {timeline && timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeline}
                  margin={{ top: 8, right: 12, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="time_bucket"
                    tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    interval="preserveStartEnd"
                    tickFormatter={(val: string) => {
                      if (!val) return '';
                      const parts = val.split(' ');
                      return parts[1] ? parts[1].slice(0, 5) : val.slice(5);
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickCount={4}
                    width={30}
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-dropdown)] rounded-[var(--radius-control)] px-3 py-2 text-xs transition-smooth">
                            <p className="text-[11px] text-[var(--text-muted)] font-mono mb-1">{label}</p>
                            <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                              {payload[0].value} {Number(payload[0].value) === 1 ? 'click' : 'clicks'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#trafficGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] py-8">
                <span className="text-xl opacity-60">📈</span>
                <p className="text-xs">No traffic yet — click Simulate Click above</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Breakdown Ranked Rows (Vercel/Linear Style) ── */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] p-5 flex flex-col min-w-0 shadow-[var(--shadow-card)] transition-smooth" style={{ height: '330px' }}>
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border)] shrink-0 gap-2">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Breakdown</p>
              <p className="text-[11px] text-[var(--text-muted)]">Audience distribution</p>
            </div>

            {/* Segmented category tabs */}
            <div className="flex items-center p-0.5 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] border border-[var(--border)] shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-smooth cursor-pointer ${
                    activeTab === tab
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Ranked Rows with 6px Track Bar */}
          <div className="flex-1 w-full min-h-0 pt-2 overflow-y-auto pr-1 space-y-3">
            {activeList.length > 0 ? (
              activeList.map((item, idx) => {
                const percentage = totalListClicks > 0 ? Math.round((item.count / totalListClicks) * 100) : 0;
                const barWidth = maxClicks > 0 ? Math.max(3, Math.round((item.count / maxClicks) * 100)) : 0;
                const displayLabel = activeTab === 'Countries' ? formatCountryName(item.label) : item.label;

                return (
                  <div key={idx} className="space-y-1.5 group">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)] truncate max-w-[210px] sm:max-w-[260px]">
                        {displayLabel}
                      </span>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {item.count.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] w-8 text-right font-normal">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    {/* 6px bar track */}
                    <div className="w-full h-1.5 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] py-8">
                <span className="text-xl opacity-60">🌍</span>
                <p className="text-xs">No distribution data recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
