import { performance } from 'perf_hooks';
import { nanoid } from 'nanoid';
import pool from '../config/db.js';
import redis from '../config/redis.js';
import { telemetryQueue } from '../queues/telemetryQueue.js';

const CACHE_TTL_SECONDS = 86400; // 24 hours

export async function handleRedirect(req, res) {
  const startTime = performance.now();
  const { code } = req.params;

  try {
    let urlData = null;
    let isCacheHit = false;

    // Check Redis cache first
    const cachedString = await redis.get(`url:${code}`);
    if (cachedString) {
      try {
        urlData = JSON.parse(cachedString);
        isCacheHit = true;
      } catch {
        urlData = { originalUrl: cachedString };
      }
    }

    // Fall back to Postgres on cache miss
    if (!urlData || !urlData.id) {
      const result = await pool.query(
        'SELECT id, original_url FROM urls WHERE short_code = $1 OR custom_alias = $1',
        [code]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Short URL not found' });
      }

      urlData = { id: result.rows[0].id, originalUrl: result.rows[0].original_url };
      await redis.set(`url:${code}`, JSON.stringify(urlData), 'EX', CACHE_TTL_SECONDS);
    }

    const duration = (performance.now() - startTime).toFixed(2);
    res.setHeader('X-Cache', isCacheHit ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Extract real client IP behind reverse proxy / load balancer
    const rawIp =
      req.headers['true-client-ip'] ||
      req.headers['cf-connecting-ip'] ||
      (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
      req.ip ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const clientIp = typeof rawIp === 'string' ? rawIp.replace(/(:\d+$)/, '').trim() : '127.0.0.1';

    // Track unique visitor via cookie or x-visitor-id header (for cross-origin/simulated clicks)
    let visitorId = null;
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)pulselink_vid=([^;]+)/);
      if (match) visitorId = match[1];
    }
    if (!visitorId && req.headers['x-visitor-id']) {
      visitorId = req.headers['x-visitor-id'];
    }
    if (!visitorId) {
      visitorId = nanoid();
    }

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('pulselink_vid', visitorId, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    });

    // Skip bot prefetches (e.g. mobile camera scanners, link previews)
    const isPrefetch =
      req.headers['purpose'] === 'prefetch' ||
      req.headers['sec-purpose'] === 'prefetch';

    // Debounce rapid duplicate clicks within 2 seconds using atomic Redis lock
    const debounceKey = `debounce:${code}:${clientIp}:${req.headers['user-agent'] || ''}`;
    const isFreshClick = await redis.set(debounceKey, '1', 'EX', 2, 'NX');

    if (!isPrefetch && isFreshClick) {
      // Enqueue click processing asynchronously so redirect isn't blocked
      telemetryQueue.add('process-click', {
        urlId: urlData.id,
        ip: clientIp,
        visitorId,
        userAgent: req.headers['user-agent'] || '',
        referer: req.headers['referer'] || req.headers['referrer'] || 'Direct',
      }).catch((err) => console.error('Failed to enqueue click telemetry:', err));

      pool.query('UPDATE urls SET clicks_count = clicks_count + 1 WHERE id = $1', [urlData.id])
        .catch((err) => console.error('Error updating click count:', err));
    }

    // 302 redirect (not 301, so future clicks hit server for analytics)
    return res.redirect(302, urlData.originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
