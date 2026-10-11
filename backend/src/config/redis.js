import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Connect to Redis using the URL from .env
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required for BullMQ in Day 4
  retryStrategy(times) {
    // If connection drops, retry every 2 seconds
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