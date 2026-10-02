import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_DATABASE, ERaporDatabase } from './src/utils/storage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// CORS & Proxy Buffering headers for Real-time Cloud
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-Memory Cloud Database with file persistence
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cloud-database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let cloudDatabase: ERaporDatabase = INITIAL_DATABASE;
let cloudVersion = 1;
let lastUpdatedAt = new Date().toISOString();

// Try to load persisted cloud state
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.db && parsed.db.users && parsed.db.siswa && parsed.db.nilai && parsed.version) {
      cloudDatabase = { ...INITIAL_DATABASE, ...parsed.db };
      cloudVersion = parsed.version;
      lastUpdatedAt = parsed.updatedAt || lastUpdatedAt;
    } else {
      cloudDatabase = INITIAL_DATABASE;
      cloudVersion = 1;
    }
    console.log(`[Cloud DB] Loaded persistent cloud database state (v${cloudVersion}).`);
  } catch (e) {
    console.error('[Cloud DB] Error loading existing database, using default', e);
  }
} else {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ version: cloudVersion, updatedAt: lastUpdatedAt, db: INITIAL_DATABASE }, null, 2)
    );
  } catch (e) {
    console.error('[Cloud DB] Error seeding initial file', e);
  }
}

// Connected SSE clients
const clients: Response[] = [];

function broadcastUpdate(db: ERaporDatabase, version: number, senderId?: string) {
  const payload = JSON.stringify({
    type: 'db_update',
    version,
    timestamp: lastUpdatedAt,
    senderId,
    db,
  });

  clients.forEach((client, idx) => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      clients.splice(idx, 1);
    }
  });
}

// 1. API: Fast Version Check (Super-lightweight < 100 bytes for instant sync check)
app.get('/api/version', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    version: cloudVersion,
    updatedAt: lastUpdatedAt,
    activeConnections: Math.max(1, clients.length),
  });
});

// 2. API: Get Current Cloud Database
app.get('/api/database', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    version: cloudVersion,
    updatedAt: lastUpdatedAt,
    db: cloudDatabase,
  });
});

// 3. API: Save / Update Cloud Database from any connected teacher or admin
app.post('/api/database', (req: Request, res: Response) => {
  const { db, senderId } = req.body;
  if (!db || !db.sekolah) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  cloudVersion += 1;
  lastUpdatedAt = new Date().toISOString();
  cloudDatabase = db;

  // Persist to file asynchronously
  fs.writeFile(
    DATA_FILE,
    JSON.stringify({ version: cloudVersion, updatedAt: lastUpdatedAt, db: cloudDatabase }, null, 2),
    (err) => {
      if (err) console.error('[Cloud DB] Error persisting file', err);
    }
  );

  // Broadcast to all other connected teachers/admins in real time
  broadcastUpdate(cloudDatabase, cloudVersion, senderId);

  res.json({
    success: true,
    version: cloudVersion,
    updatedAt: lastUpdatedAt,
    message: 'Data berhasil disinkronkan ke cloud secara real-time',
  });
});

// 4. API: Realtime SSE Stream for Live Device Connection
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  clients.push(res);

  // Send initial connection handshake with current version
  res.write(`data: ${JSON.stringify({
    type: 'handshake',
    version: cloudVersion,
    timestamp: lastUpdatedAt,
    message: 'Terhubung ke server cloud e-Rapor real-time',
    activeConnections: Math.max(1, clients.length),
  })}\n\n`);

  req.on('close', () => {
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
});

// Periodic keep-alive ping every 5s to prevent proxy/Cloud Run timeouts
setInterval(() => {
  clients.forEach(c => {
    try {
      // Standard SSE comment keep-alive
      c.write(`: ping\n\n`);
    } catch {}
  });
}, 5000);

// Heartbeat message every 12s with connection count
setInterval(() => {
  const heartbeatMsg = JSON.stringify({
    type: 'heartbeat',
    version: cloudVersion,
    timestamp: new Date().toISOString(),
    activeConnections: Math.max(1, clients.length),
  });
  clients.forEach(c => {
    try {
      c.write(`data: ${heartbeatMsg}\n\n`);
    } catch {}
  });
}, 12000);

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[e-Rapor Pintar] Server berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
