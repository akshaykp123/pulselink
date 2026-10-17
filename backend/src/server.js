import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import urlRoutes from './routes/urlRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';

// Import and start background BullMQ queue worker process to consume click events
import './workers/telemetryWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Why trust proxy 1: Tells Express to trust reverse proxies (Nginx, Docker, Cloudflare). Without this, req.ip would always be the internal proxy IP (127.0.0.1) instead of the user IP
app.set('trust proxy', 1);

// Enable cross-origin requests from the React frontend
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Health check endpoint to verify server is running
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Mount URL creation and analytics endpoints
app.use('/api/urls', urlRoutes);

// Mount redirect endpoint on root path (e.g. GET /:code)
app.use('/', redirectRoutes);

// Start listening for incoming HTTP requests
app.listen(PORT, () => {
  console.log(`🚀 PulseLink Server running at http://localhost:${PORT}`);
});