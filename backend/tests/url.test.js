import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('URL Shortening and Redirection API', () => {
  let createdShortCode = '';

  //  Shorten a valid URL
  it('should shorten a long URL and return 201 Created', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ originalUrl: 'https://github.com/torvalds/linux' });

    // Expect HTTP 201 Created
    expect(res.status).toBe(201);

    // Expect the response body to have our generated shortCode and originalUrl
    expect(res.body).toHaveProperty('shortCode');
    expect(res.body.originalUrl).toBe('https://github.com/torvalds/linux');

    // Save the shortCode so Test 2 can use it to test redirection!
    createdShortCode = res.body.shortCode;
  });

  //  Redirect using the shortCode generated in Test 1
  it('should redirect a short URL to the original destination with 302', async () => {
    const res = await request(app).get(`/${createdShortCode}`);

    // Expect HTTP 302 (Temporary Redirect)
    expect(res.status).toBe(302);

    // Expect the HTTP Location header to point to the destination URL
    expect(res.headers.location).toBe('https://github.com/torvalds/linux');
  });

  //  Reject an invalid URL format
  it('should return 400 Bad Request for an invalid URL', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ originalUrl: 'not-a-valid-website' });

    // Expect HTTP 400 Bad Request
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid URL format');
  });
});