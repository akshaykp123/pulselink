import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /health (Smoke Test)', () => {
  it('should return 200 OK and status healthy', async () => {
    // Act: Send a simulated GET request to /health
    const response = await request(app).get('/health');

    // Assert: Check the HTTP status code
    expect(response.status).toBe(200);

    // Assert: Check the JSON body returned by Express
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
  });
});