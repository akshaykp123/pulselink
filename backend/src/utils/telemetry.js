import crypto from 'crypto';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

/**
 * Parses raw HTTP request details into clean, structured analytics data
 * @param {string} ip - Visitor IP address
 * @param {string} userAgent - HTTP User-Agent header
 * @param {string} referer - HTTP Referer header
 */
export function parseClickTelemetry(ip, userAgent = '', referer = 'Direct') {
  // Normalize client IP (handles comma-separated proxy header chains)
  const cleanIp = typeof ip === 'string' ? ip.split(',')[0].trim() : (ip || '');

  // 1. Privacy: Hash the IP address using SHA-256
  // Never store raw IP addresses in your database!
  const ipHash = cleanIp
    ? crypto.createHash('sha256').update(cleanIp).digest('hex')
    : 'unknown';

  // 2. Geo-Location Lookup via geoip-lite (offline lookup, sub-0.1ms)
  let country = 'Unknown';
  let city = 'Unknown';

  // Normalize localhost testing IPs (::1 or 127.0.0.1)
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

  // 3. User-Agent Parsing (Device, Browser, Operating System)
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();

  const browser = uaResult.browser.name || 'Unknown';
  const os = uaResult.os.name || 'Unknown';
  
  // Classify device type: Desktop, Mobile, Tablet, or Bot
  let deviceType = 'Desktop';
  if (uaResult.device.type === 'mobile') {
    deviceType = 'Mobile';
  } else if (uaResult.device.type === 'tablet') {
    deviceType = 'Tablet';
  } else if (uaResult.device.type) {
    deviceType = uaResult.device.type;
  }

  // 4. Clean up the Referrer
  let cleanedReferrer = 'Direct';
  if (referer && referer !== 'Direct') {
    try {
      const url = new URL(referer);
      cleanedReferrer = url.hostname.replace('www.', ''); // e.g. "linkedin.com", "t.co"
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