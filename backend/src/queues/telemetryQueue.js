import { Queue } from 'bullmq';
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const telemetryQueue = new Queue('telemetry-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

console.log('📬 BullMQ Telemetry Queue initialized');
