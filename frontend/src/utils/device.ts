/**
 * Anonymous Device / Client Session Token Manager
 * Ensures each browser instance has an isolated, persistent UUID
 * so that links and analytics are client-scoped in production.
 */

const DEVICE_ID_KEY = 'pulselink_device_id';

export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        deviceId = crypto.randomUUID();
      } else {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
      localStorage.setItem(DEVICE_ID_KEY, deviceId);

      // On first device initialization, clean up any legacy global links
      // so stale cross-device links from prior sessions do not linger.
      localStorage.removeItem('pulselink_recent_codes');
      localStorage.removeItem('pulselink_last_created_code');
    }
    return deviceId;
  } catch {
    return 'fallback_device_session';
  }
}
