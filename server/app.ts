import express from 'express';
import type { Express } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';

export function createApp({ distDir = path.resolve(process.cwd(), 'dist') }: { distDir?: string } = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    const start = Date.now();
    res.on('finish', () => console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`));
    next();
  });
  app.get('/api/health', (_req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json({ status: 'ok', app: 'Veylo', version: '1.0.0' }); });
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API route not found' }); });
  app.use('/_expo', express.static(path.join(distDir, '_expo'), { immutable: true, maxAge: '1y', index: false, fallthrough: false }));
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/assets/') || path.extname(req.path)) return next();
    if (!req.accepts('html')) return res.status(404).json({ error: 'Not found' });
    const index = path.join(distDir, 'index.html');
    if (!existsSync(index)) return res.status(503).type('text').send('Veylo’s web build is not ready. Run npm run web:build first.');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(index);
  });
  app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    const status = typeof error === 'object' && error && 'status' in error && typeof error.status === 'number' && error.status >= 400 && error.status < 600 ? error.status : 500;
    if (status >= 500) console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(status).json({ error: status === 400 ? 'Invalid request body' : status === 413 ? 'Request body is too large' : status === 404 ? 'Not found' : 'The request could not be completed' });
  });
  return app;
}
