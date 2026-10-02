export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  return res.status(200).json({
    success: true,
    version: Date.now(),
    updatedAt: new Date().toISOString(),
    activeConnections: 1,
  });
}
