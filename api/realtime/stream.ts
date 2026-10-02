export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const handshake = JSON.stringify({
    type: 'handshake',
    message: 'Terhubung ke server cloud e-Rapor real-time di Vercel',
    activeConnections: 1,
  });

  res.write(`data: ${handshake}\n\n`);
  res.end();
}
