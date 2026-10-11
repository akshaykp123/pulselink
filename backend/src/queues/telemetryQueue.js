import { Queue } from 'bullmq';
import dotenv from 'dotenv';

import Redis from 'ioredis';

dotenv.config();

// The connection settings pointing to Redis (supports Cloud Redis URLs and local)
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Create our BullMQ Telemetry Queue
export const telemetryQueue = new Queue('telemetry-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // If a database write fails, retry up to 3 times automatically!
    backoff: {
      type: 'exponential',
      delay: 1000, // Wait 1s, then 2s, then 4s between retries
    },
    removeOnComplete: true, // Auto-delete completed jobs from Redis RAM to keep memory clean
    removeOnFail: 1000, // Keep last 1,000 failed jobs for debugging
  },
});

console.log('📬 BullMQ Telemetry Queue initialized');
