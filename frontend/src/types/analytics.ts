// Type definitions for PulseLink Telemetry and URL analytics

// Represents a shortened URL entity
export interface UrlData {
  id?: number;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
}

// KPI summary numbers
export interface AnalyticsSummaryData {
  totalClicks: number;
  uniqueVisitors: number;
}

// Breakdown dimensions
export interface CountryStat {
  country: string;
  clicks: number | string;
}

export interface DeviceStat {
  device_type: string;
  clicks: number | string;
}

export interface BrowserStat {
  browser: string;
  clicks: number | string;
}

export interface ReferrerStat {
  referrer: string;
  clicks: number | string;
}

export interface TimelinePoint {
  time_bucket: string;
  clicks: number | string;
}

// The full JSON response from GET /api/urls/:code/analytics
export interface AnalyticsResponse {
  url: UrlData;
  summary: AnalyticsSummaryData;
  countries: CountryStat[];
  devices: DeviceStat[];
  browsers: BrowserStat[];
  referrers: ReferrerStat[];
  timeline: TimelinePoint[];
}

// Normalized breakdown format for horizontal bar charts
export interface BreakdownItem {
  label: string;
  count: number;
}
