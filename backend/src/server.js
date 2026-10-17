import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import urlRoutes from './routes/urlRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';

// Start background queue worker
import './workers/telemetryWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy headers so we can read real client IPs behind reverse proxies
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