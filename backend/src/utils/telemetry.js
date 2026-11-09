import crypto from 'crypto';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

/**
 * Parses raw request headers into structured telemetry data
 */
export function parseClickTelemetry(ip, userAgent = '', referer = 'Direct', visitorId = null) {
  // Normalize IP and strip port if present
  const rawClean = typeof ip === 'string' ? ip.split(',')[0].trim().replace(/(:\d+$)/, '') : (ip || '127.0.0.1');
  const cleanIp = (rawClean === '::1' || rawClean.startsWith('::ffff:127.0.0.1') || rawClean === 'localhost')
    ? '127.0.0.1'
    : rawClean;

  // Hash visitor cookie (fallback to IP) for GDPR-safe unique visitor tracking
  const identitySource = visitorId || cleanIp;
  const ipHash = crypto.createHash('sha256').update(identitySource).digest('hex');

  // Country & City lookup
  let country = 'Unknown';
  let city = 'Unknown';

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

  // Parse User-Agent for device, browser, and OS
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();

  const browser = uaResult.browser.name || 'Unknown';
  const os = uaResult.os.name || 'Unknown';
  
  let deviceType = 'Desktop';
  if (uaResult.device.type === 'mobile') {
    deviceType = 'Mobile';
  } else if (uaResult.device.type === 'tablet') {
    deviceType = 'Tablet';
  } else if (uaResult.device.type) {
    deviceType = uaResult.device.type;
  }

  // Extract referrer hostname
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
