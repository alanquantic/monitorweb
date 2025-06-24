import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Website Monitor',
    uptime: process.uptime()
  });
});

// Status endpoint - últimos reportes
app.get('/status', async (req, res) => {
  try {
    const reportsDir = path.join(__dirname, '..', 'reports');
    const reports = await fs.readdir(reportsDir);
    const latestReport = reports
      .filter(file => file.endsWith('.json'))
      .sort()
      .pop();

    if (latestReport) {
      const reportData = await fs.readJson(path.join(reportsDir, latestReport));
      res.json({
        status: 'active',
        latestReport: reportData,
        lastUpdate: latestReport
      });
    } else {
      res.json({
        status: 'no-reports',
        message: 'No reports found yet'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Información general
app.get('/', (req, res) => {
  res.json({
    service: 'Website Monitor',
    description: 'Monitoreo automático de sitios web con capturas y emails',
    endpoints: {
      health: '/health',
      status: '/status'
    },
    author: 'CEOs New Media'
  });
});

// Solo iniciar servidor si no estamos en modo cron
if (process.env.NODE_ENV !== 'cron') {
  app.listen(PORT, () => {
    console.log(`🌐 Health server corriendo en puerto ${PORT}`);
  });
}

export default app; 