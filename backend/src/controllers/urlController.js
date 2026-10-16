import pool from '../config/db.js';
import redis from '../config/redis.js';
import { encodeBase62 } from '../utils/base62.js';

const CACHE_TTL_SECONDS = 86400; // 24h
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// POST /api/urls
export async function shortenUrl(req, res) {
  try {
    const { originalUrl, customAlias } = req.body;
    if (!originalUrl) return res.status(400).json({ error: 'originalUrl is required' });

    try { new URL(originalUrl); } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    if (customAlias) {
      const existing = await pool.query('SELECT id FROM urls WHERE custom_alias = $1 OR short_code = $1', [customAlias]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Custom alias is already taken' });

      const insertResult = await pool.query(
        `INSERT INTO urls (short_code, original_url, custom_alias) VALUES ($1, $2, $1) RETURNING id, short_code, original_url, created_at`,
        [customAlias, originalUrl]
      );
      const newUrl = insertResult.rows[0];
      await redis.set(`url:${newUrl.short_code}`, JSON.stringify({ id: newUrl.id, originalUrl: newUrl.original_url }), 'EX', CACHE_TTL_SECONDS);

      return res.status(201).json({ shortCode: newUrl.short_code, shortUrl: `${BASE_URL}/${newUrl.short_code}`, originalUrl: newUrl.original_url, createdAt: newUrl.created_at });
    }

    const insertResult = await pool.query(`INSERT INTO urls (short_code, original_url) VALUES ('temp', $1) RETURNING id`, [originalUrl]);
    const generatedId = insertResult.rows[0].id;
    const shortCode = encodeBase62(generatedId);

    const updateResult = await pool.query(`UPDATE urls SET short_code = $1 WHERE id = $2 RETURNING id, short_code, original_url, created_at`, [shortCode, generatedId]);
    const newUrl = updateResult.rows[0];
    await redis.set(`url:${newUrl.short_code}`, JSON.stringify({ id: newUrl.id, originalUrl: newUrl.original_url }), 'EX', CACHE_TTL_SECONDS);

    return res.status(201).json({ shortCode: newUrl.short_code, shortUrl: `${BASE_URL}/${newUrl.short_code}`, originalUrl: newUrl.original_url, createdAt: newUrl.created_at });
  } catch (error) {
    console.error('Error shortening URL:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET /api/urls
export async function getRecentUrls(req, res) {
  try {
    const result = await pool.query('SELECT id, short_code, original_url, clicks_count, created_at FROM urls ORDER BY created_at DESC LIMIT 30');
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent URLs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET /api/urls/:code/analytics
export async function getUrlAnalytics(req, res) {
  try {
    const { code } = req.params;
    const urlResult = await pool.query('SELECT id, short_code, original_url, clicks_count, created_at FROM urls WHERE short_code = $1 OR custom_alias = $1', [code]);
    if (urlResult.rows.length === 0) return res.status(404).json({ error: 'Short URL not found' });

    const urlRecord = urlResult.rows[0];
    const urlId = urlRecord.id;

    const [summaryStats, countryStats, deviceStats, browserStats, timeSeriesStats, referrerStats] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total_clicks, COUNT(DISTINCT ip_hash)::int AS unique_visitors FROM clicks WHERE url_id = $1`, [urlId]),
      pool.query(`SELECT country, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY country ORDER BY clicks DESC LIMIT 6`, [urlId]),
      pool.query(`SELECT device_type, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY device_type ORDER BY clicks DESC`, [urlId]),
      pool.query(`SELECT browser, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY browser ORDER BY clicks DESC LIMIT 5`, [urlId]),
      pool.query(`SELECT to_char(date_trunc('hour', clicked_at), 'YYYY-MM-DD HH24:00') AS time_bucket, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY time_bucket ORDER BY time_bucket ASC LIMIT 24`, [urlId]),
      pool.query(`SELECT referrer, COUNT(*)::int AS clicks FROM clicks WHERE url_id = $1 GROUP BY referrer ORDER BY clicks DESC LIMIT 6`, [urlId]),
    ]);

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