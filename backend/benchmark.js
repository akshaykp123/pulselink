import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. Benchmark Configuration
export const options = {
  // Simulate 100 concurrent users hitting the redirect endpoint simultaneously
  vus: 100,
  duration: '15s',

  // Performance thresholds: Fail if 95% of requests take longer than 10ms
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests should be under 10ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

// 2. The Stress Action
export default function () {
  // We hit the short link redirect endpoint
  // redirects: 0 tells k6 not to follow the 302 to GitHub, but to measure our server's redirect speed!
  const res = http.get('http://localhost:5000/gh2026', {
    redirects: 0,
  });

  // Verify that Express responded with HTTP 302 Found
  check(res, {
    'status is 302': (r) => r.status === 302,
  });

  // Tiny 5ms pacing between clicks so each virtual user acts like a rapid client
  sleep(0.005);
}