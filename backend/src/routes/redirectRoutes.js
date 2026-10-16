import { Router } from 'express';
import { handleRedirect } from '../controllers/redirectController.js';

const router = Router();

router.get('/:code', handleRedirect);

export default router;