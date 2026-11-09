import { performance } from 'perf_hooks';
import { nanoid } from 'nanoid';
import pool from '../config/db.js';
import redis from '../config/redis.js';
import { telemetryQueue } from '../queues/telemetryQueue.js';

const CACHE_TTL_SECONDS = 86400; // 24 hours in seconds (prevents Redis RAM from filling up indefinitely with inactive links)

// Handles incoming short link redirects (e.g. GET /:code)
export async function handleRedirect(req, res) {
  // Track start time with high-resolution timer to measure exact server response latency
  const startTime = performance.now();
  const { code } = req.params;

  try {
    let urlData = null;
    let isCacheHit = false;

    // 1. Try fetching URL from Redis RAM cache first instead of slow database disk
    // In-memory key lookup takes ~0.5ms compared to ~15-20ms disk query
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
      // Cache warm-up: save to Redis for 24h so every future visit to this link bypasses PostgreSQL completely
      await redis.set(`url:${code}`, JSON.stringify(urlData), 'EX', CACHE_TTL_SECONDS);
    }

    // Measure total lookup time and attach diagnostic headers for monitoring
    const duration = (performance.now() - startTime).toFixed(2);
    res.setHeader('X-Cache', isCacheHit ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time', `${duration}ms`);

    // In production behind reverse proxies (Cloudflare, Nginx, Docker), req.ip is just the proxy IP
    // We check true-client-ip and x-forwarded-for to capture the real end-user IP address
    const rawIp = req.headers['true-client-ip'] || req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const clientIp = typeof rawIp === 'string' ? rawIp.replace(/(:\d+$)/, '').trim() : '127.0.0.1';

    // -------------------------------------------------------------
    // 3. NanoID Visitor Tracking (Persistent Cross-Network Identity)
    // -------------------------------------------------------------
    let visitorId = null;
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)pulselink_vid=([^;]+)/);
      if (match) visitorId = match[1];
    }
    if (!visitorId) {
      visitorId = nanoid();
    }

    // Set cookie on response (lasts 1 year, httpOnly for security)
    res.cookie('pulselink_vid', visitorId, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    });

    // -------------------------------------------------------------
    // 4. Click Debouncing via Redis (2-Second Window Filter)
    // -------------------------------------------------------------
    // Check if the request is an automated background prefetch (e.g. mobile camera or browser preview)
    const isPrefetch =
      req.headers['purpose'] === 'prefetch' ||
      req.headers['sec-purpose'] === 'prefetch';

    // 2-second Redis debounce lock per short code + client IP + user-agent
    const debounceKey = `debounce:${code}:${clientIp}:${req.headers['user-agent'] || ''}`;
    const isFreshClick = await redis.set(debounceKey, '1', 'EX', 2, 'NX');

    // Only record analytics if it is NOT an automated prefetch AND NOT a rapid duplicate within 2s!
    if (!isPrefetch && isFreshClick) {
      // Offload to BullMQ with visitorId
      telemetryQueue.add('process-click', {
        urlId: urlData.id,
        ip: clientIp,
        visitorId: visitorId,
        userAgent: req.headers['user-agent'] || '',
        referer: req.headers['referer'] || req.headers['referrer'] || 'Direct',
      }).catch((err) => console.error('Failed to enqueue click telemetry:', err));

      // Increment click counter in PostgreSQL
      pool.query('UPDATE urls SET clicks_count = clicks_count + 1 WHERE id = $1', [urlData.id])
        .catch((err) => console.error('Error updating click count:', err));
    }

    // -------------------------------------------------------------
    // 5. Send HTTP 302 (Found / Temporary Redirect)
    // -------------------------------------------------------------
    return res.redirect(302, urlData.originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
