import crypto from 'crypto';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

/**
 * Parses raw HTTP request details into clean, structured analytics data
 * @param {string} ip - Visitor IP address
 * @param {string} userAgent - HTTP User-Agent header
 * @param {string} referer - HTTP Referer header
 */
// Parses raw request headers into structured analytics data
export function parseClickTelemetry(ip, userAgent = '', referer = 'Direct') {
  // 1. Clean the IP string and remove port number if attached
  const rawClean = typeof ip === 'string' ? ip.split(',')[0].trim().replace(/(:\d+$)/, '') : (ip || '127.0.0.1');
  const cleanIp = (rawClean === '::1' || rawClean.startsWith('::ffff:127.0.0.1') || rawClean === 'localhost')
    ? '127.0.0.1'
    : rawClean;

  // 2. Hash the IP with SHA-256 for privacy (we never store plain IP addresses)
  const ipHash = crypto.createHash('sha256').update(cleanIp).digest('hex');

  // 3. Find visitor country and city using geoip-lite offline database
  let country = 'Unknown';
  let city = 'Unknown';

  // Check if testing locally on development machine
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