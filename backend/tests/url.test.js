import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('URL Shortening and Redirection API', () => {
  let createdShortCode = '';

  it('should shorten a long URL and return 201 Created', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ originalUrl: 'https://github.com/torvalds/linux' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('shortCode');
    expect(res.body.originalUrl).toBe('https://github.com/torvalds/linux');

    createdShortCode = res.body.shortCode;
  });

  it('should redirect a short URL to the original destination with 302', async () => {
    const res = await request(app).get(`/${createdShortCode}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://github.com/torvalds/linux');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('pulselink_vid=');
  });

  it('should return 400 Bad Request for an invalid URL', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ originalUrl: 'not-a-valid-website' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid URL format');
  });

  it('should delete a short URL and return 404 on subsequent lookups', async () => {
    const deleteRes = await request(app).delete(`/api/urls/${createdShortCode}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toHaveProperty('shortCode', createdShortCode);

    const redirectRes = await request(app).get(`/${createdShortCode}`);
    expect(redirectRes.status).toBe(404);

    const analyticsRes = await request(app).get(`/api/urls/${createdShortCode}/analytics`);
    expect(analyticsRes.status).toBe(404);
  });
});
