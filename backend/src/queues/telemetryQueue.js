import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

// The connection settings pointing to our Redis container
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

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
