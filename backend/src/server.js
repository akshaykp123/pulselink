import app from './app.js';
import dotenv from 'dotenv';

// Start the background telemetry worker when the server runs
import './workers/telemetryWorker.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 PulseLink Server running at http://localhost:${PORT}`);
});