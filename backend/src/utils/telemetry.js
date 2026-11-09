import crypto from 'crypto';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

/**
 * Parses raw HTTP request details into clean, structured analytics data
 * @param {string} ip - Visitor IP address
 * @param {string} userAgent - HTTP User-Agent header
 * @param {string} referer - HTTP Referer header
 * @param {string|null} visitorId - Persistent NanoID browser identifier (cookie)
 */
export function parseClickTelemetry(ip, userAgent = '', referer = 'Direct', visitorId = null) {
  // 1. Clean the IP string and remove port number if attached
  const rawClean = typeof ip === 'string' ? ip.split(',')[0].trim().replace(/(:\d+$)/, '') : (ip || '127.0.0.1');
  const cleanIp = (rawClean === '::1' || rawClean.startsWith('::ffff:127.0.0.1') || rawClean === 'localhost')
    ? '127.0.0.1'
    : rawClean;

  // 2. Hash the visitor identity with SHA-256 for privacy (GDPR compliance)
  // If persistent NanoID visitor cookie is present, use it for cross-network identity; fallback to cleanIp
  const identitySource = visitorId || cleanIp;
  const ipHash = crypto.createHash('sha256').update(identitySource).digest('hex');

  // 3. Find visitor country and city using geoip-lite offline database
  // Why geoip-lite: Uses an in-memory binary database (<0.1ms lookup) instead of slow third-party HTTP APIs that can fail or rate-limit us
  let country = 'Unknown';
  let city = 'Unknown';

  // Development fallback: Loopback IPs (127.0.0.1 or ::1) have no geographical location in GeoIP
  // We explicitly label them as 'Localhost (Dev)' so developers see immediate chart data during testing
  const isLocalhost = !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1');

  if (isLocalhost) {
    country = 'Localhost (Dev)';
    city = 'Localhost';
  } else {
    const geo = geoip.lookup(ip);
    if (geo) {
      country = geo.country || 'Unknown';
      city = geo.city || 'Unknown';
    }
  }

  // 4. Parse User-Agent string to detect browser, OS, and device type
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();

  const browser = uaResult.browser.name || 'Unknown';
  const os = uaResult.os.name || 'Unknown';
  
  // Categorize device into Desktop, Mobile, or Tablet
  let deviceType = 'Desktop';
  if (uaResult.device.type === 'mobile') {
    deviceType = 'Mobile';
  } else if (uaResult.device.type === 'tablet') {
    deviceType = 'Tablet';
  } else if (uaResult.device.type) {
    deviceType = uaResult.device.type;
  }

  // 5. Clean referrer URL to extract just the domain name (e.g. linkedin.com)
  let cleanedReferrer = 'Direct';
  if (referer && referer !== 'Direct') {
    try {
      const url = new URL(referer);
      cleanedReferrer = url.hostname.replace('www.', '');
    } catch {
      cleanedReferrer = referer.substring(0, 50);
    }
  }

  return {
    ipHash,
    country,
    city,
    deviceType,
    browser,
    os,
    referrer: cleanedReferrer,
  };
}
