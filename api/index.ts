import express, { Request, Response } from 'express';
import { INITIAL_DATABASE, ERaporDatabase } from '../src/utils/storage.ts';

const app = express();
app.use(express.json({ limit: '20mb' }));

// In-memory state for serverless execution
let cloudDatabase: ERaporDatabase = INITIAL_DATABASE;

app.get('/api/database', (_req: Request, res: Response) => {
  res.json({
    success: true,
    version: Date.now(),
    timestamp: new Date().toISOString(),
    db: cloudDatabase,
  });
});

app.post('/api/database', (req: Request, res: Response) => {
  const { db } = req.body;
  if (!db || !db.sekolah) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  cloudDatabase = db;

  res.json({
    success: true,
    message: 'Data berhasil disinkronkan ke Vercel Cloud',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    platform: 'vercel',
    timestamp: new Date().toISOString(),
  });
});

export default app;
