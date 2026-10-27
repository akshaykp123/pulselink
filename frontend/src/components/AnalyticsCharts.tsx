import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { TimelinePoint, CountryStat, DeviceStat, BrowserStat, ReferrerStat, BreakdownItem } from '../types/analytics';

type TabType = 'Countries' | 'Devices' | 'Browsers' | 'Referrers';

const TABS: TabType[] = ['Countries', 'Devices', 'Browsers', 'Referrers'];

const tooltipStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '11.5px',
  padding: '6px 10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  color: '#0f172a',
};

const axisProps = {
  tick: { fontSize: 11, fill: '#64748b' },
  tickLine: false,
  axisLine: false,
};

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
  // Current active breakdown tab (Countries, Devices, Browsers, or Referrers)
  const [activeTab, setActiveTab] = useState<TabType>('Countries');

  // Why data normalization: Each tab has different SQL column names (country, device_type, browser, referrer).
  // We map them into uniform [{ label, count }] objects so a single Recharts <BarChart> component can render all 4 views interchangeably
  const activeList: BreakdownItem[] =
    activeTab === 'Countries'
      ? countries.map((c) => ({ label: c.country || 'Unknown', count: Number(c.clicks) }))
      : activeTab === 'Devices'
      ? devices.map((d) => ({ label: d.device_type || 'Unknown', count: Number(d.clicks) }))
      : activeTab === 'Browsers'
      ? browsers.map((b) => ({ label: b.browser || 'Unknown', count: Number(b.clicks) }))
      : referrers.map((r) => ({ label: r.referrer || 'Direct', count: Number(r.clicks) }));

  // Calculate sum of clicks in the selected tab to compute relative percentage share in the tooltip
  const totalListClicks = activeList.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <>
      <style>{`
        /* 2-column grid on desktop, single column on mobile */
        .charts-responsive-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          width: 100%;
        }
        @media (max-width: 640px) {
          .charts-responsive-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="charts-responsive-grid">
        {/* ── LEFT: Hourly Traffic Area Chart ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-w-0 shadow-xs" style={{ height: '280px' }}>
          {/* Card header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 shrink-0">
            <div>
              <p className="text-sm font-bold text-slate-800">Click Traffic</p>
              <p className="text-[11px] text-slate-400">Hourly aggregation</p>
            </div>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              24h
            </span>
          </div>

          {/* Chart area */}
          <div className="flex-1 w-full min-h-0">
            {timeline && timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeline}
                  margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="time_bucket"
                    {...axisProps}
                    interval="preserveStartEnd"
                    tickFormatter={(val: string) => {
                      if (!val) return '';
                      const parts = val.split(' ');
                      return parts[1] ? parts[1].slice(0, 5) : val.slice(5);
                    }}
                  />
                  <YAxis
                    {...axisProps}
                    allowDecimals={false}
                    width={28}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    formatter={(value: any) => [`${value} click${Number(value) === 1 ? '' : 's'}`, 'Traffic']}
                  />

                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#trafficGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-1.5 text-slate-400">
                <span className="text-2xl">📊</span>
                <p className="text-xs">No traffic yet — click "Simulate Click" above</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Breakdown Bar Chart ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-w-0 shadow-xs" style={{ height: '280px' }}>
          {/* Card header with tabs — clean layout, tabs fully contained */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 shrink-0 gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <p className="text-sm font-bold text-slate-800">Breakdown</p>
              {activeList.length > 0 && (
                <span className="text-[11px] font-normal text-slate-400">
                  ({activeList.length})
                </span>
              )}
            </div>

            {/* Tab pills container — tight padding so all 4 tabs sit inside the pill */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Bar chart area */}
          <div className="flex-1 w-full min-h-0 pt-1">
            {activeList.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {/* Why layout="vertical": Places category names on the Y-axis so long text (e.g. 'United States') never overlaps or truncates */}
                <BarChart
                  data={activeList}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                  barSize={12}
                  barCategoryGap="24%"
                >
                  <XAxis
                    type="number"
                    {...axisProps}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    {...axisProps}
                    width={95}
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                  />
                  {/* Tooltip computes dynamic percentage share: (value / totalListClicks) * 100 */}
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: any) => {
                      const num = Number(value);
                      return [
                        `${num} click${num === 1 ? '' : 's'}${totalListClicks > 0 ? ` (${Math.round((num / totalListClicks) * 100)}%)` : ''}`,
                        'Clicks',
                      ];
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    fill="#2563eb"
                    background={{ fill: '#f1f5f9', radius: 4 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-1.5 text-slate-400">
                <span className="text-2xl">🌍</span>
                <p className="text-xs">No distribution data recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
