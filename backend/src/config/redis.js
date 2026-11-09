import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});

redis.on('connect', () => {
  console.log('⚡ Connected to Redis cache (RAM)');
});

redis.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});

export default redis;
