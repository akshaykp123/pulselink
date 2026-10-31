import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Distributed Redis Rate Limiter Middleware', () => {
  // Use a unique fake IP address for this test so it has a fresh Redis counter
  const testIp = '198.51.100.99';

  it('should allow up to 5 requests, then block the 6th with HTTP 429', async () => {
    // 1. Send 5 requests rapidly (All 5 should succeed with 201 Created)
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/urls')
        .set('x-forwarded-for', testIp) // Set the simulated client IP
        .send({ originalUrl: `https://example.com/page-${i}` });

      expect(res.status).toBe(201);
    }

    // 2. Send the 6th request (This one MUST be blocked by Redis!)
    const blockedRes = await request(app)
      .post('/api/urls')
      .set('x-forwarded-for', testIp)
      .send({ originalUrl: 'https://example.com/blocked-page' });

    // Assert: Expect HTTP 429 (Too Many Requests)
    expect(blockedRes.status).toBe(429);

    // Assert: Expect the rate limiter error message
    expect(blockedRes.body).toHaveProperty('error', 'Too Many Requests');

    // Assert: Verify standard HTTP rate limit headers are present
    expect(blockedRes.headers).toHaveProperty('retry-after');
  });
});