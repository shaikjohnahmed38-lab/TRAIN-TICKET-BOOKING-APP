import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { getDb } from './server/db';
import { releaseExpiredHolds } from './server/bookingService';
import { logInfo, trackHttpRequest } from './server/logger';
import { broadcastGlobalEvent, initRealtimeServer } from './server/realtime';
import { createApiRouter } from './server/routes/v1';
import { securityHeadersMiddleware } from './server/security';

const PORT = Number(process.env.PORT || 3000);

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api')) {
        trackHttpRequest({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - started,
        });
      }
    });
    next();
  });

  const db = getDb();
  const apiRouter = createApiRouter(db);

  // Versioned API + backward-compatible /api mount
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  return { app, db };
}

async function startServer() {
  const { app, db } = createApp();
  const httpServer = http.createServer(app);

  initRealtimeServer(httpServer, db);

  // Periodic background sweep every 30s to release expired seat holds
  const sweepInterval = setInterval(() => {
    try {
      const released = releaseExpiredHolds(db, Date.now());
      if (released > 0) {
        broadcastGlobalEvent({ type: 'holds_expired', count: released });
      }
    } catch {
      // Ignore transient sweep errors
    }
  }, 30_000);
  sweepInterval.unref();

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    logInfo(`TRAINSYNK server listening on http://localhost:${PORT}`, {
      env: process.env.NODE_ENV || 'development',
    });
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
