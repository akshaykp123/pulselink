import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import pool from './config/db.js';
import redis from './config/redis.js';
import { encodeBase62 } from './utils/base62.js';
import { telemetryQueue } from './queues/telemetryQueue.js';

// Import our background worker so it starts listening when the server starts!
import './workers/telemetryWorker.js';
import { rateLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const CACHE_TTL_SECONDS = 86400; // 24 hours

// Middleware
app.set('trust proxy', 1); // Trust Render / Vercel cloud reverse proxy
app.use(cors());
app.use(express.json());

// ============================================================================
// 1. Health Check Endpoint
// ============================================================================
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// ============================================================================
// 2. POST /api/urls — Shorten a Long URL (with Proactive Cache Warming)
// ============================================================================
// Change:
// app.post('/api/urls', async (req, res) => {

// To: Allow max 5 link creations per 60 seconds per IP
app.post('/api/urls', rateLimiter(5, 60), async (req, res) => {
  try {
    const { originalUrl, customAlias } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: 'originalUrl is required' });
    }

    try {
      new URL(originalUrl);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL format. Must include http:// or https://' });
    }

    // Case A: User provided a custom vanity slug
    if (customAlias) {
      const existing = await pool.query(
        'SELECT id FROM urls WHERE custom_alias = $1 OR short_code = $1',
        [customAlias]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Custom alias is already taken. Try another!' });
      }

      const insertResult = await pool.query(
        `INSERT INTO urls (short_code, original_url, custom_alias)
         VALUES ($1, $2, $1)
         RETURNING id, short_code, original_url, created_at`,
        [customAlias, originalUrl]
      );

      const newUrl = insertResult.rows[0];

      // Proactive Cache: Store both ID and destination URL as JSON
      await redis.set(
        `url:${newUrl.short_code}`,
        JSON.stringify({ id: newUrl.id, originalUrl: newUrl.original_url }),
        'EX',
        CACHE_TTL_SECONDS
      );

      return res.status(201).json({
        shortCode: newUrl.short_code,
        shortUrl: `${BASE_URL}/${newUrl.short_code}`,
        originalUrl: newUrl.original_url,
        createdAt: newUrl.created_at,
      });
    }

    // Case B: Auto-generate Base62 short code from unique Database ID
    const insertResult = await pool.query(
      `INSERT INTO urls (short_code, original_url)
       VALUES ('temp', $1)
       RETURNING id`,
      [originalUrl]
    );

    const generatedId = insertResult.rows[0].id;
    const shortCode = encodeBase62(generatedId);

    const updateResult = await pool.query(
      `UPDATE urls
       SET short_code = $1
       WHERE id = $2
       RETURNING id, short_code, original_url, created_at`,
      [shortCode, generatedId]
    );

    const newUrl = updateResult.rows[0];

    // Proactive Cache: Store both ID and destination URL as JSON
    await redis.set(
      `url:${newUrl.short_code}`,
      JSON.stringify({ id: newUrl.id, originalUrl: newUrl.original_url }),
      'EX',
      CACHE_TTL_SECONDS
    );

    return res.status(201).json({
      shortCode: newUrl.short_code,
      shortUrl: `${BASE_URL}/${newUrl.short_code}`,
      originalUrl: newUrl.original_url,
      createdAt: newUrl.created_at,
    });
  } catch (error) {
    console.error('Error shortening URL:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// 2b. GET /api/urls — Fetch Recent Shortened URLs (PostgreSQL Persistence)
// ============================================================================
app.get('/api/urls', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, short_code, original_url, clicks_count, created_at FROM urls ORDER BY created_at DESC LIMIT 30'
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent URLs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// 3. GET /:code — Redirect Gateway with Asynchronous Telemetry
// ============================================================================
app.get('/:code', async (req, res) => {
  const startTime = performance.now();
  const { code } = req.params;

  try {
    let urlData = null;
    let isCacheHit = false;

    // STEP 1: Check Redis Cache (In-Memory RAM)
    const cachedString = await redis.get(`url:${code}`);

    if (cachedString) {
      try {
        urlData = JSON.parse(cachedString);
        isCacheHit = true;
      } catch {
        // Fallback if legacy string cache exists
        urlData = { originalUrl: cachedString };
      }
    }

    // STEP 2: Cache Miss — Query PostgreSQL
    if (!urlData || !urlData.id) {
      const result = await pool.query(
        `SELECT id, original_url
         FROM urls
         WHERE short_code = $1 OR custom_alias = $1`,
        [code]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Short URL not found' });
      }

      const urlRecord = result.rows[0];
      urlData = { id: urlRecord.id, originalUrl: urlRecord.original_url };

      // Save to Redis for next time
      await redis.set(`url:${code}`, JSON.stringify(urlData), 'EX', CACHE_TTL_SECONDS);
    }

    const duration = (performance.now() - startTime).toFixed(2);

    if (isCacheHit) {
      console.log(`🎯 [CACHE HIT] /${code} -> ${urlData.originalUrl} (${duration}ms)`);
      res.setHeader('X-Cache', 'HIT');
    } else {
      console.log(`💨 [CACHE MISS] /${code} -> Fetched from PostgreSQL (${duration}ms)`);
      res.setHeader('X-Cache', 'MISS');
    }

    res.setHeader('X-Response-Time', `${duration}ms`);

    // ------------------------------------------------------------------------
    // STEP 3: ASYNCHRONOUS TELEMETRY (Fire-and-Forget into BullMQ)
    // Takes < 1ms to push to Redis queue, never slowing down the redirect!
    // ------------------------------------------------------------------------
        // Extract true client IP behind Render / Cloudflare proxy
    const rawIp =
      req.headers['cf-connecting-ip'] ||
      (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
      req.ip ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    // Strip ephemeral client port if present (e.g., "157.45.12.34:52310" -> "157.45.12.34")
    const clientIp = typeof rawIp === 'string' ? rawIp.replace(/(:\d+$)/, '').trim() : '127.0.0.1';

    telemetryQueue.add('process-click', {
      urlId: urlData.id,
      ip: clientIp,
      userAgent: req.headers['user-agent'] || '',
      referer: req.headers['referer'] || req.headers['referrer'] || 'Direct',
    }).catch((err) => console.error('Failed to enqueue click telemetry:', err));

    // Update summary click counter asynchronously
    pool.query('UPDATE urls SET clicks_count = clicks_count + 1 WHERE id = $1', [urlData.id])
      .catch((err) => console.error('Error updating click count:', err));

    // Instant 302 Redirect to user!
    return res.redirect(302, urlData.originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// ============================================================================
// 4. GET /api/urls/:code/analytics — Aggregated Telemetry for Dashboard
// ============================================================================
app.get('/api/urls/:code/analytics', async (req, res) => {
  try {
    const { code } = req.params;

    // 1. Fetch the URL record
    const urlResult = await pool.query(
      `SELECT id, short_code, original_url, clicks_count, created_at
       FROM urls
       WHERE short_code = $1 OR custom_alias = $1`,
      [code]
    );

    if (urlResult.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const urlRecord = urlResult.rows[0];
    const urlId = urlRecord.id;

    // 2. Run High-Performance SQL Aggregations in Parallel using Promise.all
    const [
      summaryStats,
      countryStats,
      deviceStats,
      browserStats,
      timeSeriesStats,
      referrerStats,  
    ] = await Promise.all([
      // A. Total Clicks & Unique Visitors (Distinct IP hashes)
      pool.query(
        `SELECT 
           COUNT(*)::int AS total_clicks,
           COUNT(DISTINCT ip_hash)::int AS unique_visitors
         FROM clicks 
         WHERE url_id = $1`,
        [urlId]
      ),

      // B. Top Countries Breakdown (for Bar Chart)
      pool.query(
        `SELECT country, COUNT(*)::int AS clicks
         FROM clicks
         WHERE url_id = $1
         GROUP BY country
         ORDER BY clicks DESC
         LIMIT 6`,
        [urlId]
      ),

      // C. Device Breakdown (for Donut Chart)
      pool.query(
        `SELECT device_type, COUNT(*)::int AS clicks
         FROM clicks
         WHERE url_id = $1
         GROUP BY device_type
         ORDER BY clicks DESC`,
        [urlId]
      ),

      // D. Browser Breakdown (for Pie Chart)
      pool.query(
        `SELECT browser, COUNT(*)::int AS clicks
         FROM clicks
         WHERE url_id = $1
         GROUP BY browser
         ORDER BY clicks DESC
         LIMIT 5`,
        [urlId]
      ),

      // E. Clicks Over Time (Hourly Timeline for Line Graph)
      pool.query(
        `SELECT 
           to_char(date_trunc('hour', clicked_at), 'YYYY-MM-DD HH24:00') AS time_bucket,
           COUNT(*)::int AS clicks
         FROM clicks
         WHERE url_id = $1
         GROUP BY time_bucket
         ORDER BY time_bucket ASC
         LIMIT 24`,
        [urlId]
      ),
      pool.query(
        `SELECT referrer, COUNT(*)::int AS clicks
         FROM clicks
         WHERE url_id = $1
         GROUP BY referrer
         ORDER BY clicks DESC
         LIMIT 6`,
        [urlId]
      ),
    ]);

    // 3. Return clean, formatted response for React charts
    return res.json({
      url: {
        shortCode: urlRecord.short_code,
        shortUrl: `${BASE_URL}/${urlRecord.short_code}`,
        originalUrl: urlRecord.original_url,
        createdAt: urlRecord.created_at,
      },
      summary: {
        totalClicks: summaryStats.rows[0]?.total_clicks || 0,
        uniqueVisitors: summaryStats.rows[0]?.unique_visitors || 0,
      },
      countries: countryStats.rows,
      devices: deviceStats.rows,
      browsers: browserStats.rows,
      referrers: referrerStats.rows,
      timeline: timeSeriesStats.rows,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the HTTP server
app.listen(PORT, () => {
  console.log(`🚀 PulseLink Server running at http://localhost:${PORT}`);
});