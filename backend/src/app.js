import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import urlRoutes from './routes/urlRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';



dotenv.config();

const app = express();

// Why trust proxy 1: Tells Express to trust reverse proxies (Nginx, Docker, Cloudflare). 
// Without this, req.ip would always be the internal proxy IP (127.0.0.1) instead of the user IP
app.set('trust proxy', 1);

// Middlewares
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Mount URL and Redirect routes
app.use('/api/urls', urlRoutes);
app.use('/', redirectRoutes);

export default app;