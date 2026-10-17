import { performance } from 'perf_hooks';
import pool from '../config/db.js';
import redis from '../config/redis.js';
import { telemetryQueue } from '../queues/telemetryQueue.js';

const CACHE_TTL_SECONDS = 86400;

// Handles incoming short link redirects (e.g. GET /:code)
export async function handleRedirect(req, res) {
  // Track start time to measure response latency
  const startTime = performance.now();
  const { code } = req.params;

  try {
    let urlData = null;
    let isCacheHit = false;

    // 1. Try fetching URL from Redis RAM cache first instead of slow database disk
    const cachedString = await redis.get(`url:${code}`);
    if (cachedString) {
      try {
        urlData = JSON.parse(cachedString);
        isCacheHit = true;
      } catch {
        urlData = { originalUrl: cachedString };
      }
    }

    // 2. Cache miss: if not found in Redis, look up the URL from PostgreSQL database
    if (!urlData || !urlData.id) {
      const result = await pool.query('SELECT id, original_url FROM urls WHERE short_code = $1 OR custom_alias = $1', [code]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Short URL not found' });

      urlData = { id: result.rows[0].id, originalUrl: result.rows[0].original_url };
      // Save to Redis with a 24-hour expiration so the next request is instant
      await redis.set(`url:${code}`, JSON.stringify(urlData), 'EX', CACHE_TTL_SECONDS);
    }

    // Measure total lookup time and set debug headers
    const duration = (performance.now() - startTime).toFixed(2);
    res.setHeader('X-Cache', isCacheHit ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Get visitor IP address, checking proxy and load balancer headers first
    const rawIp = req.headers['true-client-ip'] || req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const clientIp = typeof rawIp === 'string' ? rawIp.replace(/(:\d+$)/, '').trim() : '127.0.0.1';

    // 3. Offload click data to BullMQ queue without await so user gets redirected immediately
    telemetryQueue.add('process-click', {
      urlId: urlData.id,
      ip: clientIp,
      userAgent: req.headers['user-agent'] || '',
      referer: req.headers['referer'] || req.headers['referrer'] || 'Direct',
    }).catch((err) => console.error('Failed to enqueue click telemetry:', err));

    // 4. Increment total clicks in PostgreSQL in background without blocking the response
    pool.query('UPDATE urls SET clicks_count = clicks_count + 1 WHERE id = $1', [urlData.id])
      .catch((err) => console.error('Error updating click count:', err));

    // 5. Send HTTP 302 redirect right away to destination URL
    return res.redirect(302, urlData.originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}