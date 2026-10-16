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

// Middleware
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Mount Routes
app.use('/api/urls', urlRoutes);
app.use('/', redirectRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PulseLink Server running at http://localhost:${PORT}`);
});