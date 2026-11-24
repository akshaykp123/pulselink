import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { TimelinePoint, CountryStat, DeviceStat, BrowserStat, ReferrerStat, BreakdownItem } from '../types/analytics';

export type TabType = 'Countries' | 'Devices' | 'Browsers' | 'Referrers';
export type RangeType = '24h' | '7d' | '30d';

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
  timeRange?: RangeType;
  onRangeChange?: (range: RangeType) => void;
}

export default function AnalyticsCharts({
  timeline = [],
  countries = [],
  devices = [],
  browsers = [],
  referrers = [],
  timeRange: propTimeRange,
  onRangeChange,
}: AnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Countries');
  const [internalRange, setInternalRange] = useState<RangeType>('24h');
  const activeRange = propTimeRange || internalRange;

  const chartCardRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState<number>(0);
  const [activeMobileTooltip, setActiveMobileTooltip] = useState<{
    label: string;
    clicks: number;
    x: number;
    y: number;
  } | null>(null);

  // Measure container using ResizeObserver to handle drawer toggle, resize, and rotation
  useEffect(() => {
    if (!chartCardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setCardWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(chartCardRef.current);
    return () => observer.disconnect();
  }, []);

  const isMobile = cardWidth > 0 ? cardWidth <= 520 : (typeof window !== 'undefined' ? window.innerWidth <= 640 : false);

  // Dismiss mobile tooltip when tapping elsewhere
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (chartWrapperRef.current && !chartWrapperRef.current.contains(e.target as Node)) {
        setActiveMobileTooltip(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const handleRangeSelect = (r: RangeType) => {
    setInternalRange(r);
    setActiveMobileTooltip(null);
    if (onRangeChange) {
      onRangeChange(r);
    }
  };

  // Build a continuous zero-filled baseline across the entire active range
  const chartData = useMemo(() => {
    if (!timeline) return [];

    // Map existing timeline data by timestamp key
    const dataMap = new Map<string, number>();
    timeline.forEach((pt) => {
      const rawKey = String(pt.time_bucket || '').trim();
      if (!rawKey) return;
      const count = Number(pt.clicks) || 0;
      dataMap.set(rawKey, count);

      // Also map date-only key "YYYY-MM-DD" for daily aggregation
      if (rawKey.includes(' ')) {
        const dateOnly = rawKey.split(' ')[0];
        dataMap.set(dateOnly, (dataMap.get(dateOnly) || 0) + count);
      }
    });

    // If backend already returned full pre-filled sequence matching active range, return it directly
    if (
      (activeRange === '24h' && timeline.length >= 24) ||
      (activeRange === '7d' && timeline.length >= 7) ||
      (activeRange === '30d' && timeline.length >= 30)
    ) {
      return timeline;
    }

    // Client-side baseline fill for sparse datasets
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const buckets: TimelinePoint[] = [];

    if (activeRange === '24h') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 3600 * 1000);
        const hourKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
        buckets.push({
          time_bucket: hourKey,
          clicks: dataMap.get(hourKey) || 0,
        });
      }
    } else if (activeRange === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400 * 1000);
        const dayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        buckets.push({
          time_bucket: dayKey,
          clicks: dataMap.get(dayKey) || 0,
        });
      }
    } else {
      // 30d
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400 * 1000);
        const dayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        buckets.push({
          time_bucket: dayKey,
          clicks: dataMap.get(dayKey) || 0,
        });
      }
    }

    return buckets;
  }, [timeline, activeRange]);

  // Check if all data points in active range are zero
  const isRangeEmpty = useMemo(() => {
    return chartData.length > 0 && chartData.every((pt) => Number(pt.clicks) === 0);
  }, [chartData]);

  // 4-5 ticks on mobile, standard ticks on desktop
  const xInterval = useMemo(() => {
    if (!isMobile) {
      return activeRange === '7d' ? 0 : activeRange === '30d' ? 5 : 3;
    }
    if (activeRange === '24h') return 5; // 24 / 5 ≈ 5 ticks
    if (activeRange === '7d') return 1;  // 7 / 2 ≈ 4 ticks
    return 6;                           // 30 / 6 ≈ 5 ticks
  }, [isMobile, activeRange]);

  // Handle pointer down on mobile chart to tap-inspect data point
  const handleChartPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile || !chartWrapperRef.current || !chartData.length) return;
    const rect = chartWrapperRef.current.getBoundingClientRect();
    const paddingLeft = 32;
    const paddingRight = 16;
    const effectiveWidth = Math.max(rect.width - paddingLeft - paddingRight, 1);
    const clickX = e.clientX - rect.left - paddingLeft;
    const ratio = Math.max(0, Math.min(1, clickX / effectiveWidth));
    const index = Math.round(ratio * (chartData.length - 1));
    const targetPoint = chartData[index];

    if (targetPoint) {
      let formatted = targetPoint.time_bucket;
      try {
        if (activeRange === '24h') {
          const d = new Date(formatted.includes(' ') ? formatted.replace(' ', 'T') : formatted);
          if (!isNaN(d.getTime())) {
            formatted = d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        } else {
          const parts = formatted.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            formatted = d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          }
        }
      } catch {}

      setActiveMobileTooltip({
        label: formatted,
        clicks: Number(targetPoint.clicks) || 0,
        x: Math.max(8, Math.min(rect.width - 130, e.clientX - rect.left - 50)),
        y: Math.max(10, e.clientY - rect.top - 55),
      });
    }
  };

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
          gap: 24px;
          width: 100%;
          align-items: start;
        }
        .chart-card-box {
          height: 330px;
        }
        .breakdown-card-box {
          height: 330px;
          align-self: start;
        }
        @media (max-width: 860px) {
          .charts-responsive-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        @media (max-width: 640px) {
          .chart-card-box {
            height: 275px;
          }
          .breakdown-card-box {
            height: auto;
            min-height: 0;
            align-self: stretch;
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="charts-responsive-grid">
        {/* ── LEFT: Click Traffic Area Chart ── */}
        <div
          ref={chartCardRef}
          className="chart-card-box bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] p-4 sm:p-5 flex flex-col min-w-0 shadow-[var(--shadow-card)] transition-smooth relative"
        >
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border)] shrink-0 gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">Click Traffic</p>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                {activeRange === '24h'
                  ? 'Last 24 hours hourly volume'
                  : activeRange === '7d'
                  ? 'Last 7 days daily volume'
                  : 'Last 30 days daily volume'}
              </p>
            </div>

            {/* Segmented range control (24h / 7d / 30d) */}
            <div className="flex items-center p-0.5 rounded-[var(--radius-control)] bg-[var(--surface-raised)] border border-[var(--border)] shrink-0">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRangeSelect(r)}
                  className={`px-2.5 py-0.5 rounded-[var(--radius-control)] text-[11px] font-semibold transition-smooth cursor-pointer ${
                    activeRange === r
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={chartWrapperRef}
            onPointerDown={handleChartPointerDown}
            className="flex-1 w-full min-h-0 pt-1 relative"
            style={{ touchAction: 'pan-y' }}
          >
            {chartData && chartData.length > 0 ? (
              <>
                <ResponsiveContainer
                  key={`chart-${cardWidth}-${activeRange}`}
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={chartData}
                    margin={
                      isMobile
                        ? { top: 8, right: 18, left: -2, bottom: 0 }
                        : { top: 8, right: 12, left: -22, bottom: 0 }
                    }
                  >
                    <defs>
                      <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.14} />
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
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                      interval={xInterval}
                      padding={{ left: isMobile ? 12 : 4, right: isMobile ? 12 : 4 }}
                      tickFormatter={(val: string) => {
                        if (!val) return '';
                        if (activeRange === '24h') {
                          const parts = val.split(' ');
                          return parts[1] ? parts[1].slice(0, 5) : val.slice(11, 16);
                        }
                        try {
                          const parts = val.split('-');
                          if (parts.length === 3) {
                            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }
                        } catch {}
                        return val.slice(5);
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      domain={[0, 'auto']}
                      tickCount={4}
                      width={isMobile ? 22 : 28}
                    />

                    {/* Desktop Hover Tooltip */}
                    {!isMobile && (
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const rawLabel = label !== undefined && label !== null ? String(label) : '';
                            let formattedLabel = rawLabel;
                            try {
                              if (activeRange === '24h') {
                                const d = new Date(rawLabel.includes(' ') ? rawLabel.replace(' ', 'T') : rawLabel);
                                if (!isNaN(d.getTime())) {
                                  formattedLabel = d.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  });
                                }
                              } else {
                                const parts = rawLabel.split('-');
                                if (parts.length === 3) {
                                  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                  formattedLabel = d.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  });
                                }
                              }
                            } catch {}

                            return (
                              <div className="bg-[var(--surface)] border border-[var(--border)] shadow-xl rounded-[var(--radius-control)] px-3 py-2 text-xs transition-smooth">
                                <p className="text-[11px] text-[var(--text-secondary)] font-mono mb-1">{formattedLabel}</p>
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
                    )}

                    {/* Straight-line Area with 1.5px teal stroke & 14% fill */}
                    <Area
                      type="linear"
                      dataKey="clicks"
                      stroke="var(--accent)"
                      strokeWidth={1.5}
                      fill="url(#trafficGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Mobile Tap-to-Inspect Tooltip Overlay */}
                {isMobile && activeMobileTooltip && (
                  <div
                    style={{ left: activeMobileTooltip.x, top: activeMobileTooltip.y }}
                    className="absolute z-20 pointer-events-auto bg-[var(--surface)] border border-[var(--border)] shadow-xl rounded-[var(--radius-control)] px-2.5 py-1.5 text-xs animate-in fade-in duration-100"
                    onClick={() => setActiveMobileTooltip(null)}
                  >
                    <p className="text-[10px] text-[var(--text-secondary)] font-mono">{activeMobileTooltip.label}</p>
                    <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                      {activeMobileTooltip.clicks} {activeMobileTooltip.clicks === 1 ? 'click' : 'clicks'}
                    </p>
                  </div>
                )}

                {/* Empty Range Baseline Hint */}
                {isRangeEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--surface)]/85 backdrop-blur-xs px-2.5 py-1 rounded-[var(--radius-control)] border border-[var(--border)] shadow-xs">
                      No clicks in this range
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)] py-8">
                <span className="text-xl opacity-80">📈</span>
                <p className="text-xs">No traffic yet — click Simulate Click above</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Breakdown Rows ── */}
        <div className="breakdown-card-box bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-panel)] p-4 sm:p-5 flex flex-col min-w-0 shadow-[var(--shadow-card)] transition-smooth">
          {/* Header stacked on mobile: Title on Row 1, Segmented control on Row 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-2 border-b border-[var(--border)] shrink-0 gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Breakdown</p>
              <p className="text-xs text-[var(--text-secondary)]">Audience distribution</p>
            </div>

            {/* Segmented category tabs: full-width 4 equal columns on mobile, scrollable on narrow <= 320px */}
            <div className="relative w-full sm:w-auto min-w-0">
              <div className="grid grid-cols-4 sm:flex items-center p-0.5 rounded-[var(--radius-control)] bg-[var(--surface-raised)] border border-[var(--border)] w-full overflow-x-auto no-scrollbar">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`h-9 px-2 sm:px-2.5 py-1 rounded-[var(--radius-control)] text-[13px] font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap text-center flex items-center justify-center min-w-0 ${
                      activeTab === tab
                        ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="truncate">{tab}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 custom-scrollbar pt-1 flex flex-col min-w-0">
            {activeList && activeList.length > 0 ? (
              <>
                {/* Spaced bar rows with gap (space-y-1.5) */}
                <div className="space-y-1.5 min-w-0">
                  {activeList.slice(0, 8).map((item, idx) => {
                    const count = item.count;
                    const percentage = totalListClicks > 0 ? Math.round((count / totalListClicks) * 100) : 0;
                    const barWidth = maxClicks > 0 ? Math.min((count / maxClicks) * 100, 100) : 0;
                    const displayLabel = activeTab === 'Countries' ? formatCountryName(item.label) : item.label;

                    return (
                      <div
                        key={idx}
                        className="group relative flex items-center justify-between h-10 px-2.5 rounded-[var(--radius-control)] select-none cursor-default shrink-0 min-w-0"
                      >
                        {/* Background bar layer: exact rgba(15,118,110,0.12) via --accent-tint */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-[var(--radius-control)] bg-[var(--accent-tint)] group-hover:opacity-100 transition-opacity duration-150 ease-out pointer-events-none"
                          style={{ width: `${barWidth}%` }}
                        />

                        {/* Left: label */}
                        <div className="relative z-10 min-w-0 flex-1 pr-3">
                          <span
                            className="text-sm font-medium text-[var(--text-primary)] truncate block"
                            title={displayLabel}
                          >
                            {displayLabel}
                          </span>
                        </div>

                        {/* Right: count and percentage with fixed-width columns */}
                        <div className="relative z-10 flex items-center shrink-0">
                          <span className="text-sm font-medium tabular-nums text-[var(--text-primary)] text-right w-11 sm:w-12">
                            {count}
                          </span>
                          <span className="text-[13px] font-medium tabular-nums text-[var(--text-secondary)] text-right w-11 sm:w-12 ml-1 sm:ml-2">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeList.length > 8 && (
                  <div className="pt-2 pb-1 text-center mt-auto shrink-0">
                    <span className="text-xs text-[var(--text-tertiary)] font-normal">
                      Showing 8 of {activeList.length}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-6">
                <p className="text-xs text-[var(--text-secondary)]">No {activeTab.toLowerCase()} recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
