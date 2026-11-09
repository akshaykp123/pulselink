import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Distributed Redis Rate Limiter Middleware', () => {
  const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;

  it('should allow up to 5 requests, then block the 6th with HTTP 429', async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/urls')
        .set('x-forwarded-for', testIp)
        .send({ originalUrl: `https://example.com/page-${i}` });

      expect(res.status).toBe(201);
    }

    const blockedRes = await request(app)
      .post('/api/urls')
      .set('x-forwarded-for', testIp)
      .send({ originalUrl: 'https://example.com/blocked-page' });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body).toHaveProperty('error', 'Too Many Requests');
    expect(blockedRes.headers).toHaveProperty('retry-after');
  });
});
