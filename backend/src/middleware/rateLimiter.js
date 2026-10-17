import redis from '../config/redis.js';

// Rate limiter middleware using Redis to track and limit requests per IP
export function rateLimiter(maxRequests = 5, windowSeconds = 60) {
  return async (req, res, next) => {
    try {
      // 1. Identify the client by their IP address
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const key = `ratelimit:${req.baseUrl || req.path}:${ip}`;

      // 2. Atomically increment the request count in Redis RAM
      // Why redis.incr(): Redis operations are atomic, preventing race conditions if multiple requests arrive at the exact same millisecond
      const requests = await redis.incr(key);

      // 3. If this is the first request in the window, set the expiration timer
      if (requests === 1) {
        await redis.expire(key, windowSeconds);
      }

      // 4. Fetch the time remaining until the window resets
      const ttl = await redis.ttl(key);

      // 5. Attach industry-standard Rate Limit headers to the response
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requests));
      res.setHeader('X-RateLimit-Reset', ttl);

      // 6. If the client exceeded the allowed limit: BLOCK THEM with HTTP 429!
      // HTTP 429 Too Many Requests: Informs bots and clients they are throttled and attaches Retry-After header
      if (requests > maxRequests) {
        console.warn(`🚨 [RATE LIMIT] Blocked IP ${ip} on ${req.originalUrl} (${requests}/${maxRequests} in ${windowSeconds}s)`);
        
        res.setHeader('Retry-After', ttl);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `You have exceeded the rate limit of ${maxRequests} requests per ${windowSeconds} seconds.`,
          retryAfterSeconds: ttl,
        });
      }

      // If under the limit: Let the request proceed to the route handler!
      next();
    } catch (error) {
      // Fail-Open Resilience: If Redis ever goes down or network lags, allow traffic through instead of crashing the site for legitimate users
      console.error('Rate limiter error:', error);
      next();
    }
  };
}