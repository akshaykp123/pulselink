import pool from '../config/db.js';
import redis from '../config/redis.js';
import { encodeBase62 } from '../utils/base62.js';

const CACHE_TTL_SECONDS = 86400; // 24h
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// Reserved system keywords that cannot be used as short codes or custom aliases
const RESERVED_ALIASES = new Set([
  'api',
  'health',
  'admin',
  'login',
  'docs',
  'favicon',
  'favicon.ico',
  'robots',
  'robots.txt',
  'sitemap',
  'sitemap.xml',
  'static',
  'assets',
  'dashboard',
]);

// Create short URL (supports custom alias or auto-generated Base62 slug)
export async function shortenUrl(req, res) {
  try {
    const { originalUrl, customAlias } = req.body;
    if (!originalUrl) return res.status(400).json({ error: 'originalUrl is required' });

    try {
      new URL(originalUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Handle custom alias
    if (customAlias !== undefined && customAlias !== null && String(customAlias).trim() !== '') {
      const cleanAlias = String(customAlias).trim();

      // Enforce 3 to 16 characters
      if (cleanAlias.length < 3 || cleanAlias.length > 16) {
        return res.status(400).json({
          error: 'Custom alias must be between 3 and 16 characters',
        });
      }

      // Enforce URL-safe characters: alphanumeric, hyphens, and underscores
      if (!/^[a-zA-Z0-9_-]+$/.test(cleanAlias)) {
        return res.status(400).json({
          error: 'Custom alias can only contain letters, numbers, hyphens (-), and underscores (_)',
        });
      }

      // Prevent collisions with reserved system endpoints
      if (RESERVED_ALIASES.has(cleanAlias.toLowerCase())) {
        return res.status(400).json({
          error: `'${cleanAlias}' is a reserved system keyword. Please choose another alias.`,
        });
      }

      const existing = await pool.query(
        'SELECT id FROM urls WHERE custom_alias = $1 OR short_code = $1',
        [cleanAlias]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Custom alias is already taken' });
      }

      const insertResult = await pool.query(
        `INSERT INTO urls (short_code, original_url, custom_alias)
         VALUES ($1, $2, $1)
         RETURNING id, short_code, original_url, created_at`,
        [cleanAlias, originalUrl]
      );
      const newUrl = insertResult.rows[0];

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

    // Auto-generate slug from Postgres sequence + Base62
    const seqResult = await pool.query(`SELECT nextval('urls_id_seq') AS id`);
    const generatedId = seqResult.rows[0].id;
    const shortCode = encodeBase62(generatedId);

    const insertResult = await pool.query(
      `INSERT INTO urls (id, short_code, original_url)
       VALUES ($1, $2, $3)
       RETURNING id, short_code, original_url, created_at`,
      [generatedId, shortCode, originalUrl]
    );
    const newUrl = insertResult.rows[0];

    // Pre-warm Redis cache for instant first redirect
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
}

// Get recent short links
export async function getRecentUrls(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, short_code, original_url, clicks_count, created_at FROM urls ORDER BY created_at DESC LIMIT 30'
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent URLs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Fetch analytics breakdowns for a short link
export async function getUrlAnalytics(req, res) {
  try {
    const { code } = req.params;
    const range = (req.query.range || '24h').toLowerCase();

    const urlResult = await pool.query(
      'SELECT id, short_code, original_url, clicks_count, created_at FROM urls WHERE short_code = $1 OR custom_alias = $1',
      [code]
    );
    if (urlResult.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const urlRecord = urlResult.rows[0];
    const urlId = urlRecord.id;

    // Build timeline query with continuous zero-filled baseline across the requested range
    let timelineQuery;
    if (range === '7d') {
      timelineQuery = `
        WITH time_slots AS (
          SELECT generate_series(
            date_trunc('day', NOW() - INTERVAL '6 days'),
            date_trunc('day', NOW()),
            INTERVAL '1 day'
          ) AS slot
        )
        SELECT
          to_char(ts.slot, 'YYYY-MM-DD') AS time_bucket,
          COALESCE(COUNT(c.id), 0)::int AS clicks
        FROM time_slots ts
        LEFT JOIN clicks c
          ON c.url_id = $1
          AND date_trunc('day', c.clicked_at) = ts.slot
        GROUP BY ts.slot
        ORDER BY ts.slot ASC
      `;
    } else if (range === '30d') {
      timelineQuery = `
        WITH time_slots AS (
          SELECT generate_series(
            date_trunc('day', NOW() - INTERVAL '29 days'),
            date_trunc('day', NOW()),
            INTERVAL '1 day'
          ) AS slot
        )
        SELECT
          to_char(ts.slot, 'YYYY-MM-DD') AS time_bucket,
          COALESCE(COUNT(c.id), 0)::int AS clicks
        FROM time_slots ts
        LEFT JOIN clicks c
          ON c.url_id = $1
          AND date_trunc('day', c.clicked_at) = ts.slot
        GROUP BY ts.slot
        ORDER BY ts.slot ASC
      `;
    } else {
      // Default: 24 hours
      timelineQuery = `
        WITH time_slots AS (
          SELECT generate_series(
            date_trunc('hour', NOW() - INTERVAL '23 hours'),
            date_trunc('hour', NOW()),
            INTERVAL '1 hour'
          ) AS slot
        )
        SELECT
          to_char(ts.slot, 'YYYY-MM-DD HH24:00') AS time_bucket,
          COALESCE(COUNT(c.id), 0)::int AS clicks
        FROM time_slots ts
        LEFT JOIN clicks c
          ON c.url_id = $1
          AND date_trunc('hour', c.clicked_at) = ts.slot
        GROUP BY ts.slot
        ORDER BY ts.slot ASC
      `;
    }

    // Run aggregations in parallel for low latency
    const [summaryStats, countryStats, deviceStats, browserStats, timeSeriesStats, referrerStats] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total_clicks, COUNT(DISTINCT ip_hash)::int AS unique_visitors FROM clicks WHERE url_id = $1`, [urlId]),
      pool.query(`SELECT country, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY country ORDER BY clicks DESC LIMIT 6`, [urlId]),
      pool.query(`SELECT device_type, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY device_type ORDER BY clicks DESC`, [urlId]),
      pool.query(`SELECT browser, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY browser ORDER BY clicks DESC LIMIT 5`, [urlId]),
      pool.query(timelineQuery, [urlId]),
      pool.query(`SELECT referrer, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY referrer ORDER BY clicks DESC LIMIT 6`, [urlId]),
    ]);

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
}

// Delete a short URL, evict cache, and cascade-delete clicks
export async function deleteUrl(req, res) {
  try {
    const { code } = req.params;

    // Deleting from urls cascade-deletes clicks via foreign key ON DELETE CASCADE
    const result = await pool.query(
      'DELETE FROM urls WHERE short_code = $1 OR custom_alias = $1 RETURNING id, short_code, custom_alias',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const deleted = result.rows[0];

    // Evict cached redirect from Redis
    await redis.del(`url:${deleted.short_code}`);
    if (deleted.custom_alias) {
      await redis.del(`url:${deleted.custom_alias}`);
    }

    return res.json({
      message: 'Short URL and all associated telemetry deleted successfully',
      shortCode: deleted.short_code,
    });
  } catch (error) {
    console.error('Error deleting short URL:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
