import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const TABS = ['Countries', 'Devices', 'Browsers', 'Referrers'];

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '11px',
  padding: '6px 10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  color: '#0f172a',
};

const axisProps = {
  tick: { fontSize: 11, fill: '#64748b' },
  tickLine: false,
  axisLine: false,
};

export default function AnalyticsCharts({ timeline = [], countries = [], devices = [], browsers = [], referrers = [] }) {
  const [activeTab, setActiveTab] = useState('Countries');

  const activeList =
    activeTab === 'Countries'
      ? countries.map((c) => ({ label: c.country || 'Unknown', count: Number(c.clicks) }))
      : activeTab === 'Devices'
      ? devices.map((d) => ({ label: d.device_type || 'Unknown', count: Number(d.clicks) }))
      : activeTab === 'Browsers'
      ? browsers.map((b) => ({ label: b.browser || 'Unknown', count: Number(b.clicks) }))
      : referrers.map((r) => ({ label: r.referrer || 'Direct', count: Number(r.clicks) }));

  const totalListClicks = activeList.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <>
      <style>{`
        .charts-responsive-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          width: 100%;
        }
        @media (max-width: 600px) {
          .charts-responsive-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="charts-responsive-grid">
        {/* ── LEFT: Hourly Traffic Area Chart ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-w-0 shadow-xs" style={{ height: '260px' }}>
          {/* Card header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 shrink-0">
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Click Traffic</p>
              <p className="text-[11px] text-slate-400">Hourly aggregation</p>
            </div>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              24h Window
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
                    tickFormatter={(val) => {
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
                    formatter={(value) => [`${value} click${value === 1 ? '' : 's'}`, 'Traffic']}
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
                <p className="text-xs">No traffic yet — click "Simulate" above</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Breakdown Bar Chart ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-w-0 shadow-xs" style={{ height: '260px' }}>
          {/* Card header with tabs */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 shrink-0 gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900">Breakdown</p>
              {activeList.length > 0 && (
                <span className="text-[11px] font-medium text-slate-400">
                  ({activeList.length})
                </span>
              )}
            </div>

            {/* Tab pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200/60 shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer shrink-0 ${
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
                <BarChart
                  data={activeList}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                  barSize={10}
                  barCategoryGap="25%"
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
                    width={90}
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value) => [
                      `${value} click${value === 1 ? '' : 's'}${totalListClicks > 0 ? ` (${Math.round((value / totalListClicks) * 100)}%)` : ''}`,
                      'Clicks'
                    ]}
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