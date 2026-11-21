import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './server/db';
import {
  advanceRefundSimulation,
  cancelBooking,
  checkoutDemoBooking,
  getCoachSeats,
  getPricingRulesMap,
  getUserByToken,
  holdSeats,
  listBookings,
  listNotifications,
  listStations,
  markAllNotificationsRead,
  releaseExpiredHolds,
  releaseSeats,
  requestDemoOtp,
  searchTrains,
  updateUserProfile,
  verifyDemoOtp,
} from './server/bookingService';
import type { CoachType } from './src/types/railway';

const PORT = 3000;
const COOKIE_NAME = 'rail_demo_session';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    result[k] = decodeURIComponent(v);
  }
  return result;
}

function extractAuthToken(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] ?? null;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  const db = getDb();

  // Periodic background sweep every 30s to release expired 15-minute seat holds
  const sweepInterval = setInterval(() => {
    try {
      releaseExpiredHolds(db, Date.now());
    } catch {
      // Ignore transient sweep errors
    }
  }, 30_000);
  sweepInterval.unref();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: 'DEMO_MVP' });
  });

  app.get('/api/stations', (_req, res) => {
    res.json(listStations(db));
  });

  app.get('/api/trains/search', (req, res) => {
    const from = String(req.query.from ?? '').trim();
    const to = String(req.query.to ?? '').trim();
    const date = String(req.query.date ?? '').trim();
    const timeWindow = req.query.timeWindow ? String(req.query.timeWindow) : 'ALL';

    if (!from || !to || !date) {
      res.status(400).json({ error: 'From station, To station, and Journey date are required.' });
      return;
    }
    if (from.toUpperCase() === to.toUpperCase()) {
      res.status(400).json({ error: 'From and To stations must be different.' });
      return;
    }

    const trains = searchTrains(db, {
      fromCode: from,
      toCode: to,
      journeyDate: date,
      timeWindow,
    });
    res.json(trains);
  });

  app.get('/api/trains/:trainId/coaches/:coachId/seats', (req, res) => {
    try {
      const date = String(req.query.date ?? '').trim();
      if (!date) {
        res.status(400).json({ error: 'Journey date query parameter is required.' });
        return;
      }
      const seats = getCoachSeats(db, req.params.trainId, req.params.coachId, date);
      res.json(seats);
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.post('/api/holds', (req, res) => {
    try {
      const { sessionId, trainId, coachId, journeyDate, seatNumbers, allowWaitlist } = req.body ?? {};
      if (!sessionId || !trainId || !coachId || !journeyDate || !Array.isArray(seatNumbers)) {
        res.status(400).json({ error: 'Missing required hold parameters.' });
        return;
      }
      const result = holdSeats(db, {
        sessionId: String(sessionId),
        trainId: String(trainId),
        coachId: String(coachId),
        journeyDate: String(journeyDate),
        seatNumbers: seatNumbers.map(Number),
        allowWaitlist: Boolean(allowWaitlist),
      });
      res.json(result);
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      res.status(e.statusCode ?? 400).json({ error: e.message });
    }
  });

  app.post('/api/holds/release', (req, res) => {
    try {
      const { sessionId, trainId, coachId, journeyDate, seatNumbers } = req.body ?? {};
      if (!sessionId || !trainId || !coachId || !journeyDate) {
        res.status(400).json({ error: 'Missing required release parameters.' });
        return;
      }
      const releasedCount = releaseSeats(db, {
        sessionId: String(sessionId),
        trainId: String(trainId),
        coachId: String(coachId),
        journeyDate: String(journeyDate),
        seatNumbers: Array.isArray(seatNumbers) ? seatNumbers.map(Number) : undefined,
      });
      res.json({ releasedCount });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/bookings/checkout', (req, res) => {
    try {
      const token = extractAuthToken(req);
      const user = getUserByToken(db, token);
      const {
        sessionId,
        trainId,
        coachId,
        fromCode,
        toCode,
        journeyDate,
        seatNumbers,
        passengers,
        paymentMethod,
        outcome,
        existingPnr,
      } = req.body ?? {};

      if (
        !sessionId ||
        !trainId ||
        !coachId ||
        !fromCode ||
        !toCode ||
        !journeyDate ||
        !Array.isArray(seatNumbers) ||
        !Array.isArray(passengers)
      ) {
        res.status(400).json({ error: 'Missing required booking fields.' });
        return;
      }

      const result = checkoutDemoBooking(db, {
        userId: user?.id ?? null,
        sessionId: String(sessionId),
        trainId: String(trainId),
        coachId: String(coachId),
        fromCode: String(fromCode),
        toCode: String(toCode),
        journeyDate: String(journeyDate),
        seatNumbers: seatNumbers.map(Number),
        passengers,
        paymentMethod: paymentMethod ?? 'UPI',
        outcome: outcome ?? 'SUCCESS',
        existingPnr: existingPnr ? String(existingPnr) : undefined,
      });
      res.json(result);
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      res.status(e.statusCode ?? 400).json({ error: e.message });
    }
  });

  app.get('/api/bookings', (req, res) => {
    const token = extractAuthToken(req);
    const user = getUserByToken(db, token);
    const sessionId = String(req.query.sessionId ?? 'DEMO-GUEST');
    res.json(listBookings(db, user?.id ?? null, sessionId));
  });

  app.post('/api/bookings/:pnr/cancel', (req, res) => {
    try {
      const token = extractAuthToken(req);
      const user = getUserByToken(db, token);
      const sessionId = String(req.body?.sessionId ?? 'DEMO-GUEST');
      const updated = cancelBooking(db, req.params.pnr, user?.id ?? null, sessionId);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/bookings/:pnr/refund-advance', (req, res) => {
    try {
      const token = extractAuthToken(req);
      const user = getUserByToken(db, token);
      const sessionId = String(req.body?.sessionId ?? 'DEMO-GUEST');
      const updated = advanceRefundSimulation(db, req.params.pnr, user?.id ?? null, sessionId);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get('/api/notifications', (req, res) => {
    const token = extractAuthToken(req);
    const user = getUserByToken(db, token);
    const sessionId = String(req.query.sessionId ?? 'DEMO-GUEST');
    res.json(listNotifications(db, user?.id ?? null, sessionId));
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const token = extractAuthToken(req);
    const user = getUserByToken(db, token);
    const sessionId = String(req.body?.sessionId ?? 'DEMO-GUEST');
    markAllNotificationsRead(db, user?.id ?? null, sessionId);
    res.json({ ok: true });
  });

  app.post('/api/auth/request-otp', (req, res) => {
    try {
      const mobile = String(req.body?.mobile ?? '');
      const challenge = requestDemoOtp(db, mobile);
      res.json({
        ...challenge,
        disclaimer: 'Simulated Demo OTP (No real SMS sent)',
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/auth/verify-otp', (req, res) => {
    try {
      const { mobile, otp } = req.body ?? {};
      const result = verifyDemoOtp(db, String(mobile ?? ''), String(otp ?? ''));
      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
      if (isHttps) {
        res.setHeader(
          'Set-Cookie',
          `${COOKIE_NAME}=${encodeURIComponent(result.token)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${7 * 86400}`
        );
      } else {
        res.setHeader(
          'Set-Cookie',
          `${COOKIE_NAME}=${encodeURIComponent(result.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}`
        );
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const token = extractAuthToken(req);
    const user = getUserByToken(db, token);
    res.json({ user });
  });

  app.put('/api/auth/profile', (req, res) => {
    try {
      const token = extractAuthToken(req);
      const user = getUserByToken(db, token);
      if (!user) {
        res.status(401).json({ error: 'Please sign in first.' });
        return;
      }
      const { name, email, age, gender } = req.body ?? {};
      const updated = updateUserProfile(db, user.id, {
        name: String(name ?? ''),
        email: String(email ?? ''),
        age: age ? Number(age) : null,
        gender: gender ?? null,
      });
      res.json({ user: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractAuthToken(req);
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
    res.json({ ok: true });
  });

  app.get('/api/pricing', (_req, res) => {
    res.json(getPricingRulesMap(db));
  });

  app.put('/api/pricing/:coachType', (req, res) => {
    const coachType = req.params.coachType as CoachType;
    const rules = getPricingRulesMap(db);
    if (!rules[coachType]) {
      res.status(404).json({ error: 'Unknown coach type.' });
      return;
    }
    const baseFare = Number(req.body?.baseFare ?? rules[coachType].baseFare);
    const perKmRate = Number(req.body?.perKmRate ?? rules[coachType].perKmRate);
    const reservationFee = Number(req.body?.reservationFee ?? rules[coachType].reservationFee);
    const gstPercent = Number(req.body?.gstPercent ?? rules[coachType].gstPercent);

    if (
      !Number.isFinite(baseFare) ||
      baseFare < 0 ||
      !Number.isFinite(perKmRate) ||
      perKmRate < 0 ||
      !Number.isFinite(reservationFee) ||
      reservationFee < 0 ||
      !Number.isFinite(gstPercent) ||
      gstPercent < 0
    ) {
      res.status(400).json({ error: 'Invalid pricing values.' });
      return;
    }

    db.prepare(
      `UPDATE pricing_config
       SET base_fare = ?, per_km_rate = ?, reservation_fee = ?, gst_percent = ?
       WHERE coach_type = ?`
    ).run(baseFare, perKmRate, reservationFee, gstPercent, coachType);

    res.json(getPricingRulesMap(db));
  });

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RailBooking MVP server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
