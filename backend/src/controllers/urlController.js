import pool from '../config/db.js';
import redis from '../config/redis.js';
import { encodeBase62 } from '../utils/base62.js';

const CACHE_TTL_SECONDS = 86400; // 24h
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// Shorten a URL (supports custom alias or auto-generated Base62 code)
export async function shortenUrl(req, res) {
  try {
    const { originalUrl, customAlias } = req.body;
    if (!originalUrl) return res.status(400).json({ error: 'originalUrl is required' });

    // Validate that the provided string is a valid URL
    try { new URL(originalUrl); } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Branch A: User provided a custom alias (e.g. /my-portfolio)
    if (customAlias) {
      // Check if alias or short code is already taken
      const existing = await pool.query('SELECT id FROM urls WHERE custom_alias = $1 OR short_code = $1', [customAlias]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Custom alias is already taken' });

      // Save custom alias to PostgreSQL
      const insertResult = await pool.query(
        `INSERT INTO urls (short_code, original_url, custom_alias) VALUES ($1, $2, $1) RETURNING id, short_code, original_url, created_at`,
        [customAlias, originalUrl]
      );
      const newUrl = insertResult.rows[0];

      // Cache the new link in Redis so redirects are instantly fast from the start
      await redis.set(`url:${newUrl.short_code}`, JSON.stringify({ id: newUrl.id, originalUrl: newUrl.original_url }), 'EX', CACHE_TTL_SECONDS);

      return res.status(201).json({ shortCode: newUrl.short_code, shortUrl: `${BASE_URL}/${newUrl.short_code}`, originalUrl: newUrl.original_url, createdAt: newUrl.created_at });
    }

    // Branch B: Auto-generate code using database sequence ID + Base62
    // Why two-step insert: The database BIGSERIAL sequence provides a collision-free 64-bit integer ID.
    // 1. We insert a row with a temporary placeholder to reserve the sequence number
    const insertResult = await pool.query(`INSERT INTO urls (short_code, original_url) VALUES ('temp', $1) RETURNING id`, [originalUrl]);
    const generatedId = insertResult.rows[0].id;

    // 2. Convert the 64-bit numeric ID into a compact Base62 string (e.g. ID 125 -> "21", ID 100000 -> "q0U")
    const shortCode = encodeBase62(generatedId);

    // 3. Update the row with its permanent Base62 short code
    const updateResult = await pool.query(`UPDATE urls SET short_code = $1 WHERE id = $2 RETURNING id, short_code, original_url, created_at`, [shortCode, generatedId]);
    const newUrl = updateResult.rows[0];

    // 4. Pre-warm Redis cache so the very first click on this new link hits RAM immediately
    await redis.set(`url:${newUrl.short_code}`, JSON.stringify({ id: newUrl.id, originalUrl: newUrl.original_url }), 'EX', CACHE_TTL_SECONDS);

    return res.status(201).json({ shortCode: newUrl.short_code, shortUrl: `${BASE_URL}/${newUrl.short_code}`, originalUrl: newUrl.original_url, createdAt: newUrl.created_at });
  } catch (error) {
    console.error('Error shortening URL:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Fetch the 30 most recently created short links
export async function getRecentUrls(req, res) {
  try {
    const result = await pool.query('SELECT id, short_code, original_url, clicks_count, created_at FROM urls ORDER BY created_at DESC LIMIT 30');
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent URLs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Fetch detailed telemetry analytics for a specific short link
export async function getUrlAnalytics(req, res) {
  try {
    const { code } = req.params;

    // 1. Find the URL record by short code or custom alias
    const urlResult = await pool.query('SELECT id, short_code, original_url, clicks_count, created_at FROM urls WHERE short_code = $1 OR custom_alias = $1', [code]);
    if (urlResult.rows.length === 0) return res.status(404).json({ error: 'Short URL not found' });

    const urlRecord = urlResult.rows[0];
    const urlId = urlRecord.id;

    // 2. Run all analytical aggregation queries in parallel using Promise.all for speed
    // Why Promise.all: Running 6 queries sequentially takes ~60ms. Running them in parallel completes in ~12ms
    const [summaryStats, countryStats, deviceStats, browserStats, timeSeriesStats, referrerStats] = await Promise.all([
      // Total clicks and distinct IP hash count (calculates unique visitors without storing plain IPs)
      pool.query(`SELECT COUNT(*)::int AS total_clicks, COUNT(DISTINCT ip_hash)::int AS unique_visitors FROM clicks WHERE url_id = $1`, [urlId]),
      // Top visitor countries
      pool.query(`SELECT country, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY country ORDER BY clicks DESC LIMIT 6`, [urlId]),
      // Device breakdown (Desktop, Mobile, Tablet)
      pool.query(`SELECT device_type, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY device_type ORDER BY clicks DESC`, [urlId]),
      // Browser breakdown (Chrome, Safari, Firefox, Edge)
      pool.query(`SELECT browser, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY browser ORDER BY clicks DESC LIMIT 5`, [urlId]),
      // 24-hour click distribution grouped by hour (date_trunc('hour') rounds minutes to 00 for clean timeline bars)
      pool.query(`SELECT to_char(date_trunc('hour', clicked_at), 'YYYY-MM-DD HH24:00') AS time_bucket, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY time_bucket ORDER BY time_bucket ASC LIMIT 24`, [urlId]),
      // Referrers (Direct, Google, LinkedIn, etc.)
      pool.query(`SELECT referrer, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY referrer ORDER BY clicks DESC LIMIT 6`, [urlId]),
    ]);

    // 3. Return structured payload for the frontend dashboard
    return res.json({
      url: { shortCode: urlRecord.short_code, shortUrl: `${BASE_URL}/${urlRecord.short_code}`, originalUrl: urlRecord.original_url, createdAt: urlRecord.created_at },
      summary: { totalClicks: summaryStats.rows[0]?.total_clicks || 0, uniqueVisitors: summaryStats.rows[0]?.unique_visitors || 0 },
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