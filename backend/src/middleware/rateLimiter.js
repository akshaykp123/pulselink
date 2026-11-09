import redis from '../config/redis.js';

// Sliding-window rate limiter using Redis atomic counters
export function rateLimiter(maxRequests = 5, windowSeconds = 60) {
  return async (req, res, next) => {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const key = `ratelimit:${req.baseUrl || req.path}:${ip}`;

      const requests = await redis.incr(key);
      if (requests === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requests));
      res.setHeader('X-RateLimit-Reset', ttl);

      if (requests > maxRequests) {
        console.warn(`🚨 [RATE LIMIT] Blocked IP ${ip} on ${req.originalUrl} (${requests}/${maxRequests} in ${windowSeconds}s)`);
        
        res.setHeader('Retry-After', ttl);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `You have exceeded the rate limit of ${maxRequests} requests per ${windowSeconds} seconds.`,
          retryAfterSeconds: ttl,
        });
      }

      next();
    } catch (error) {
      // Fail-open: allow request if Redis is unreachable
      console.error('Rate limiter error:', error);
      next();
    }
  };
}
