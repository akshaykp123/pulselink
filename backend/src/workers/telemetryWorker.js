import { Worker } from 'bullmq';
import pool from '../config/db.js';
import { parseClickTelemetry } from '../utils/telemetry.js';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Dedicated Redis connection for BullMQ worker
// Why maxRetriesPerRequest: null is required by BullMQ so blocking Redis commands (BRPOPLPUSH) wait without timing out
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Background worker that pulls click events from Redis queue and writes to PostgreSQL
export const telemetryWorker = new Worker(
  'telemetry-queue',
  async (job) => {
    const { urlId, ip, userAgent, referer } = job.data;

    // 1. Parse raw IP and User-Agent into clean country, device, browser, and OS data
    const telemetry = parseClickTelemetry(ip, userAgent, referer);

    // 2. Insert the complete click event record into PostgreSQL clicks table
    const query = `
      INSERT INTO clicks (
        url_id, ip_hash, country, city, device_type, browser, os, referrer
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, clicked_at;
    `;

    const values = [
      urlId,
      telemetry.ipHash,
      telemetry.country,
      telemetry.city,
      telemetry.deviceType,
      telemetry.browser,
      telemetry.os,
      telemetry.referrer,
    ];

    await pool.query(query, values);

    // Print summary log to terminal
    console.log(
      `📊 [WORKER] Click logged for URL #${urlId} -> ${telemetry.country} | ${telemetry.browser} | ${telemetry.deviceType}`
    );
  },
  {
    connection: redisConnection,
    // Concurrency: process up to 5 click jobs at the same time
    concurrency: 5,
  }
);

// Worker event listeners for monitoring job status
telemetryWorker.on('completed', (job) => {
  // Job finished successfully
});

telemetryWorker.on('failed', (job, err) => {
  console.error(`❌ [WORKER] Job #${job.id} failed:`, err.message);
});

console.log('👷 BullMQ Telemetry Worker is running and listening for click events');