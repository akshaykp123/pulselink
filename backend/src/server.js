import app from './app.js';
import dotenv from 'dotenv';
import { initDb } from './config/db.js';

// Start the background telemetry worker when the server runs
import './workers/telemetryWorker.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Run non-blocking DB schema check on startup
initDb().catch((err) => console.warn('DB Init notice:', err.message));

app.listen(PORT, () => {
  console.log(`🚀 PulseLink Server running at http://localhost:${PORT}`);
});