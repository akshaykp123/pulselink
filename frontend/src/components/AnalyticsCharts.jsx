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
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
  color: '#0f172a',
};

const axisProps = {
  tick: { fontSize: 12, fill: '#475569', fontWeight: 500 },
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
          gap: 16px;
          width: 100%;
        }
        @media (max-width: 768px) {
          .charts-responsive-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="charts-responsive-grid">
        {/* ── LEFT: Hourly Traffic Area Chart ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col min-w-0 shadow-xs" style={{ minHeight: '300px' }}>
          {/* Card header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 shrink-0">
            <div>
              <p className="text-sm sm:text-base font-bold text-slate-900">Click Traffic</p>
              <p className="text-xs text-slate-400 mt-0.5">Hourly aggregation (24-hour window)</p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              Live Stream
            </span>
          </div>

          {/* Chart area */}
          <div className="flex-1 w-full min-h-[220px]">
            {timeline && timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeline}
                  margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.35} />
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
                    width={32}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1.5 }}
                    formatter={(value) => [`${value} click${value === 1 ? '' : 's'}`, 'Traffic']}
                  />

                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fill="url(#trafficGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 py-8">
                <span className="text-3xl">📊</span>
                <p className="text-sm font-medium">No traffic recorded yet — click "Simulate Click" above</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Breakdown Bar Chart ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col min-w-0 shadow-xs" style={{ minHeight: '300px' }}>
          {/* Card header with tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-slate-100 shrink-0 gap-2.5">
            <div className="flex items-center gap-2 shrink-0">
              <p className="text-sm sm:text-base font-bold text-slate-900">Dimension Breakdown</p>
              {activeList.length > 0 && (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {activeList.length} items
                </span>
              )}
            </div>

            {/* Tab pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 border border-slate-200/60 shrink-0 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
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
          <div className="flex-1 w-full min-h-[220px] pt-1">
            {activeList.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeList}
                  layout="vertical"
                  margin={{ top: 6, right: 24, left: 14, bottom: 6 }}
                  barSize={14}
                  barCategoryGap="22%"
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
                    width={110}
                    tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
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
                    radius={[0, 6, 6, 0]}
                    fill="#2563eb"
                    background={{ fill: '#f1f5f9', radius: 6 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 py-8">
                <span className="text-3xl">🌍</span>
                <p className="text-sm font-medium">No distribution data recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}