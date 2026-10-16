import { Router } from 'express';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { shortenUrl, getRecentUrls, getUrlAnalytics } from '../controllers/urlController.js';

const router = Router();

router.post('/', rateLimiter(5, 60), shortenUrl);
router.get('/', getRecentUrls);
router.get('/:code/analytics', getUrlAnalytics);

export default router;