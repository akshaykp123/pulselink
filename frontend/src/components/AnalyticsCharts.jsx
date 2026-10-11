import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const TABS = ['Countries', 'Devices', 'Browsers', 'Referrers'];

// Shared tooltip styling
const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '9.5px',
  padding: '4px 7px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  color: '#0f172a',
};

// Shared axis props
const axisProps = {
  tick: { fontSize: 8.5, fill: '#94a3b8' },
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
          gap: 8px;
          width: 100%;
        }
        @media (max-width: 480px) {
          .charts-responsive-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="charts-responsive-grid">
        {/* ── LEFT: Hourly Traffic Area Chart ── */}
      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden flex flex-col min-w-0" style={{ height: '220px' }}>
        {/* Card header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-50 shrink-0">
          <div>
            <p className="text-[11px] font-semibold text-slate-700">Click Traffic</p>
            <p className="text-[8.5px] text-slate-400">Hourly aggregation</p>
          </div>
          <span
            className="text-[8.5px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ background: '#eff6ff', color: '#2563eb' }}
          >
            24h
          </span>
        </div>

        {/* Chart area */}
        <div className="flex-1 px-1 pb-1">
          {timeline && timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timeline}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 6"
                  stroke="#f1f5f9"
                  vertical={false}
                />

                <XAxis
                  dataKey="time_bucket"
                  {...axisProps}
                  interval="preserveStartEnd"
                  tickFormatter={(val) => {
                    if (!val) return '';
                    // Extract time "HH:00" or short date
                    const parts = val.split(' ');
                    return parts[1] ? parts[1].slice(0, 5) : val.slice(5);
                  }}
                />
                <YAxis
                  {...axisProps}
                  allowDecimals={false}
                  width={24}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ fontSize: '9px', padding: 0 }}
                  labelStyle={{ fontSize: '9px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '2 2' }}
                  formatter={(value) => [`${value} click${value === 1 ? '' : 's'}`, 'Traffic']}
                />

                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#trafficGrad)"
                  dot={false}
                  activeDot={{ r: 3.5, fill: '#2563eb', stroke: '#fff', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-1">
              <span style={{ fontSize: '18px' }}>📊</span>
              <p className="text-[9.5px] text-slate-300">No traffic yet — hit "Simulate" above</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Breakdown Bar Chart ── */}
      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden flex flex-col min-w-0" style={{ height: '220px' }}>
        {/* Card header with tabs */}
        <div className="flex items-center justify-between pl-3 pr-3.5 py-1.5 border-b border-slate-50 shrink-0 gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <p className="text-[11px] font-semibold text-slate-700 shrink-0">Breakdown</p>
            {activeList.length > 0 && (
              <span className="text-[8.5px] text-slate-400 font-normal">
                ({activeList.length})
              </span>
            )}
          </div>

          {/* Tab pills — never clips */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md shrink-0 max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="transition cursor-pointer rounded-sm shrink-0"
                style={{
                  padding: '1.5px 5px',
                  fontSize: '9px',
                  fontWeight: activeTab === tab ? '600' : '400',
                  color: activeTab === tab ? '#0f172a' : '#94a3b8',
                  background: activeTab === tab ? '#ffffff' : 'transparent',
                  boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Bar chart — fills remaining space */}
        <div className="flex-1 px-1 pb-1 pt-1">
          {activeList.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeList}
                layout="vertical"
                margin={{ top: 2, right: 16, left: 4, bottom: 2 }}
                barSize={7}
                barCategoryGap="28%"
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
                  width={68}
                  tick={{ fontSize: 9, fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ fontSize: '9px', padding: 0 }}
                  labelStyle={{ fontSize: '9.5px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value) => [
                    `${value} click${value === 1 ? '' : 's'}${totalListClicks > 0 ? ` (${Math.round((value / totalListClicks) * 100)}%)` : ''}`,
                    'Clicks'
                  ]}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  fill="#3b82f6"
                  background={{ fill: '#f8fafc', radius: 4 }}
                  activeBar={{ fill: '#2563eb' }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-1">
              <span style={{ fontSize: '18px' }}>🌍</span>
              <p className="text-[9.5px] text-slate-300">No breakdown data yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}