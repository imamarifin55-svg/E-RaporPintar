import { INITIAL_DATABASE, ERaporDatabase } from '../src/utils/storage';

// In-Memory Cloud Database state for Vercel Serverless Function
let cloudDbCache: ERaporDatabase = INITIAL_DATABASE;
let vercelCloudVersion = 1;
let vercelUpdatedAt = new Date().toISOString();

export default function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      version: vercelCloudVersion,
      updatedAt: vercelUpdatedAt,
      db: cloudDbCache,
    });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { db } = body || {};

    if (!db || !db.sekolah) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    vercelCloudVersion += 1;
    vercelUpdatedAt = new Date().toISOString();
    cloudDbCache = db;

    return res.status(200).json({
      success: true,
      version: vercelCloudVersion,
      updatedAt: vercelUpdatedAt,
      message: 'Data berhasil disinkronkan ke cloud secara real-time via Vercel',
    });
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
