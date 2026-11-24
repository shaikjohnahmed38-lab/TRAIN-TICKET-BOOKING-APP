import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import type { CoachType, CustomerUser, UserRole } from '../../src/types/railway';
import {
  adminUpdateBookingRefund,
  adminUpdateUser,
  broadcastSystemNotification,
  createTrainAdmin,
  deleteTrainAdmin,
  exportSafeBackupSnapshot,
  getAdminAnalytics,
  getAppConfigMap,
  listAllBookingsAdmin,
  listAuditLogsAdmin,
  listTrainsAdmin,
  listTransactionsAdmin,
  listUsersAdmin,
  updateAppConfig,
  updatePricingRuleAdmin,
} from '../adminService';
import {
  bootstrapOrClaimAdmin,
  changePassword,
  deleteAccount,
  getAdminBootstrapStatus,
  getUserByToken,
  listUserSessions,
  loginWithPassword,
  logoutToken,
  registerUser,
  requestEmailVerification,
  requestOtpLogin,
  requestPasswordReset,
  resetPasswordWithCode,
  revokeSessionById,
  updateUserProfile,
  verifyEmailCode,
  verifyOtpLogin,
} from '../authService';
import {
  addSavedPassenger,
  advanceRefundSimulation,
  cancelBooking,
  checkoutDemoBooking,
  deleteSavedPassenger,
  getBookingByPnr,
  getBookingByPnrScoped,
  getCoachSeats,
  getPricingRulesMap,
  holdSeats,
  listBookings,
  listNotifications,
  listSavedPassengers,
  listStations,
  markAllNotificationsRead,
  recordRazorpayOrderForBooking,
  releaseSeats,
  searchTrains,
  verifyAndFinalizeRazorpayPayment,
} from '../bookingService';
import { getDbPathLabel } from '../db';
import {
  createRazorpayOrder,
  fetchOfficialTrainLiveStatus,
  getIntegrationStatuses,
  isRazorpayConfigured,
  verifyRazorpayWebhookSignature,
} from '../integrations';
import { getTelemetrySummary, logError, recordAuditLog } from '../logger';
import {
  broadcastCoachUpdate,
  broadcastUserEvent,
  getRealtimeStats,
  registerSseClient,
} from '../realtime';
import { createRateLimiter, getClientIp, verifyCsrfOriginMiddleware } from '../security';

export const SESSION_COOKIE_NAME = 'trainsynk_session';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    try {
      result[k] = decodeURIComponent(v);
    } catch {
      result[k] = v;
    }
  }
  return result;
}

export function extractAuthToken(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] ?? cookies['rail_demo_session'] ?? null;
}

function setSessionCookie(req: express.Request, res: express.Response, token: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const maxAge = 7 * 86400;
  if (isHttps) {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${maxAge}`
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
    );
  }
}

function clearSessionCookie(req: express.Request, res: express.Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isHttps) {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`
    );
  } else {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  }
}

export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createApiRouter(db: DatabaseSync): express.Router {
  const router = express.Router();

  const authRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 40,
    keyPrefix: 'auth',
  });
  const writeRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyPrefix: 'write',
  });

  router.use(verifyCsrfOriginMiddleware);

  const resolveUser = (req: express.Request): CustomerUser | null => {
    const token = extractAuthToken(req);
    return getUserByToken(db, token);
  };

  const requireAuth = (req: express.Request): CustomerUser => {
    const user = resolveUser(req);
    if (!user) throw new HttpError(401, 'Authentication required. Please sign in.');
    return user;
  };

  const requireRole = (req: express.Request, roles: UserRole[]): CustomerUser => {
    const user = requireAuth(req);
    if (!roles.includes(user.role ?? 'customer')) {
      throw new HttpError(403, 'Insufficient permissions for this resource.');
    }
    return user;
  };

  // --- Health, Config, Docs & Integrations ---
  router.get('/health', (_req, res) => {
    const config = getAppConfigMap(db);
    res.json({
      ok: true,
      appName: config.appName,
      version: '1.0.0',
      database: 'SQLite WAL',
      realtime: getRealtimeStats(),
      timestamp: Date.now(),
    });
  });

  router.get('/config', (_req, res) => {
    res.json(getAppConfigMap(db));
  });

  router.get('/integrations/status', (_req, res) => {
    res.json(getIntegrationStatuses(getDbPathLabel()));
  });

  router.get('/docs', (_req, res) => {
    res.json({
      service: 'TRAINSYNK REST API',
      version: 'v1',
      basePath: '/api/v1',
      realtime: { websocket: '/ws', sse: '/api/v1/events' },
      endpoints: [
        'GET /api/v1/health',
        'GET /api/v1/config',
        'GET /api/v1/integrations/status',
        'GET /api/v1/stations',
        'GET /api/v1/trains/search?from=SC&to=VSKP&date=YYYY-MM-DD',
        'GET /api/v1/trains/:trainId/live-status',
        'GET /api/v1/trains/:trainId/coaches/:coachId/seats?date=YYYY-MM-DD',
        'POST /api/v1/holds',
        'POST /api/v1/holds/release',
        'POST /api/v1/bookings/checkout',
        'POST /api/v1/payments/razorpay/order',
        'POST /api/v1/payments/razorpay/verify',
        'POST /api/v1/webhooks/razorpay',
        'GET /api/v1/bookings',
        'GET /api/v1/bookings/:pnr',
        'POST /api/v1/bookings/:pnr/cancel',
        'POST /api/v1/bookings/:pnr/refund-advance',
        'GET /api/v1/notifications',
        'POST /api/v1/notifications/read-all',
        'POST /api/v1/auth/register',
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/request-otp',
        'POST /api/v1/auth/verify-otp',
        'POST /api/v1/auth/verify-email/request',
        'POST /api/v1/auth/verify-email/confirm',
        'POST /api/v1/auth/forgot-password',
        'POST /api/v1/auth/reset-password',
        'GET /api/v1/auth/me',
        'PUT /api/v1/auth/profile',
        'POST /api/v1/auth/change-password',
        'GET /api/v1/auth/sessions',
        'DELETE /api/v1/auth/sessions/:sessionId',
        'DELETE /api/v1/auth/account',
        'POST /api/v1/auth/logout',
        'GET/POST/DELETE /api/v1/passengers',
        'GET /api/v1/pricing',
        'GET /api/v1/admin/bootstrap-status',
        'POST /api/v1/admin/bootstrap',
        'GET /api/v1/admin/overview',
        'GET/POST /api/v1/admin/bookings',
        'GET/PATCH /api/v1/admin/users',
        'GET/POST/DELETE /api/v1/admin/trains',
        'PUT /api/v1/admin/pricing/:coachType',
        'PUT /api/v1/admin/config',
        'POST /api/v1/admin/notifications/broadcast',
        'GET /api/v1/admin/transactions',
        'GET /api/v1/admin/audit-logs',
        'GET /api/v1/admin/telemetry',
        'GET /api/v1/admin/backup',
      ],
    });
  });

  // SSE stream for real-time user alerts
  router.get('/events', (req, res) => {
    const user = resolveUser(req);
    const sessionId = req.query.sessionId ? String(req.query.sessionId) : null;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
    const unregister = registerSseClient(res, user?.id ?? null, sessionId);
    const keepAlive = setInterval(() => {
      res.write(`: ping\n\n`);
    }, 25_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unregister();
    });
  });

  // --- Stations, Trains & Seat Maps ---
  router.get('/stations', (_req, res) => {
    res.json(listStations(db));
  });

  router.get('/trains/search', (req, res) => {
    const from = String(req.query.from ?? '').trim();
    const to = String(req.query.to ?? '').trim();
    const date = String(req.query.date ?? '').trim();
    const timeWindow = req.query.timeWindow ? String(req.query.timeWindow) : 'ALL';

    if (!from || !to || !date) {
      throw new HttpError(400, 'From station, To station, and Journey date are required.');
    }
    if (from.toUpperCase() === to.toUpperCase()) {
      throw new HttpError(400, 'From and To stations must be different.');
    }

    res.json(
      searchTrains(db, {
        fromCode: from,
        toCode: to,
        journeyDate: date,
        timeWindow,
      })
    );
  });

  router.get('/trains/:trainNumber/live-status', async (req, res, next) => {
    try {
      const status = await fetchOfficialTrainLiveStatus(String(req.params.trainNumber));
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  router.get('/trains/:trainId/coaches/:coachId/seats', (req, res) => {
    const date = String(req.query.date ?? '').trim();
    if (!date) {
      throw new HttpError(400, 'Journey date query parameter is required.');
    }
    const seats = getCoachSeats(db, String(req.params.trainId), String(req.params.coachId), date);
    res.json(seats);
  });

  // --- Seat Holds (with Real-Time Broadcast) ---
  router.post('/holds', writeRateLimit, (req, res) => {
    const { sessionId, trainId, coachId, journeyDate, seatNumbers, allowWaitlist } = req.body ?? {};
    if (!sessionId || !trainId || !coachId || !journeyDate || !Array.isArray(seatNumbers)) {
      throw new HttpError(400, 'Missing required hold parameters.');
    }
    const result = holdSeats(db, {
      sessionId: String(sessionId),
      trainId: String(trainId),
      coachId: String(coachId),
      journeyDate: String(journeyDate),
      seatNumbers: seatNumbers.map(Number),
      allowWaitlist: Boolean(allowWaitlist),
    });

    broadcastCoachUpdate(String(trainId), String(coachId), String(journeyDate), {
      action: 'SEATS_HELD',
      seatNumbers: seatNumbers.map(Number),
    });

    res.json(result);
  });

  router.post('/holds/release', writeRateLimit, (req, res) => {
    const { sessionId, trainId, coachId, journeyDate, seatNumbers } = req.body ?? {};
    if (!sessionId || !trainId || !coachId || !journeyDate) {
      throw new HttpError(400, 'Missing required release parameters.');
    }
    const releasedCount = releaseSeats(db, {
      sessionId: String(sessionId),
      trainId: String(trainId),
      coachId: String(coachId),
      journeyDate: String(journeyDate),
      seatNumbers: Array.isArray(seatNumbers) ? seatNumbers.map(Number) : undefined,
    });

    if (releasedCount > 0) {
      broadcastCoachUpdate(String(trainId), String(coachId), String(journeyDate), {
        action: 'SEATS_RELEASED',
        seatNumbers: Array.isArray(seatNumbers) ? seatNumbers.map(Number) : undefined,
      });
    }

    res.json({ releasedCount });
  });

  // --- Bookings & Payments ---
  router.post('/bookings/checkout', writeRateLimit, (req, res) => {
    const user = resolveUser(req);
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
      throw new HttpError(400, 'Missing required booking fields.');
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

    broadcastCoachUpdate(String(trainId), String(coachId), String(journeyDate), {
      action: outcome === 'SUCCESS' ? 'SEATS_BOOKED' : 'SEATS_HELD',
      seatNumbers: seatNumbers.map(Number),
    });
    broadcastUserEvent(user?.id ?? null, String(sessionId), {
      type: 'booking:created',
      pnr: result.booking.pnr,
      status: result.booking.status,
    });

    res.json(result);
  });

  // Real Razorpay order & verification routes
  router.post('/payments/razorpay/order', writeRateLimit, async (req, res, next) => {
    try {
      const user = resolveUser(req);
      const { pnr } = req.body ?? {};
      if (!pnr) throw new HttpError(400, 'PNR is required.');
      const booking = getBookingByPnr(db, String(pnr));
      if (!booking) throw new HttpError(404, 'Booking not found.');

      const order = await createRazorpayOrder({
        amountInr: booking.totalFare,
        receipt: booking.pnr,
        notes: { pnr: booking.pnr, trainNumber: booking.trainNumber },
      });

      if (!order.configured) {
        res.status(503).json({
          configured: false,
          error: 'Razorpay API keys are not configured on the server.',
        });
        return;
      }

      recordRazorpayOrderForBooking(db, {
        pnr: booking.pnr,
        userId: user?.id ?? null,
        orderId: order.orderId,
        amount: booking.totalFare,
      });

      res.json(order);
    } catch (err) {
      next(err);
    }
  });

  router.post('/payments/razorpay/verify', writeRateLimit, (req, res) => {
    const user = resolveUser(req);
    const { pnr, orderId, paymentId, signature, sessionId } = req.body ?? {};
    if (!pnr || !orderId || !paymentId || !signature) {
      throw new HttpError(400, 'Missing Razorpay verification fields.');
    }
    if (!isRazorpayConfigured()) {
      throw new HttpError(503, 'Razorpay is not configured.');
    }
    const booking = verifyAndFinalizeRazorpayPayment(db, {
      pnr: String(pnr),
      orderId: String(orderId),
      paymentId: String(paymentId),
      signature: String(signature),
      userId: user?.id ?? null,
      sessionId: String(sessionId ?? ''),
    });

    broadcastCoachUpdate(booking.trainId, booking.coachId, booking.journeyDate, {
      action: 'SEATS_BOOKED',
      seatNumbers: booking.seatNumbers,
    });
    res.json({ booking });
  });

  router.post('/webhooks/razorpay', (req, res) => {
    const sig = String(req.headers['x-razorpay-signature'] ?? '');
    const rawBody = JSON.stringify(req.body ?? {});
    if (!verifyRazorpayWebhookSignature(rawBody, sig)) {
      throw new HttpError(401, 'Invalid webhook signature.');
    }
    const event = req.body?.event as string | undefined;
    const paymentEntity = req.body?.payload?.payment?.entity as
      | { id?: string; order_id?: string; status?: string }
      | undefined;

    if (event === 'payment.captured' && paymentEntity?.order_id && paymentEntity?.id) {
      const now = Date.now();
      db.prepare(
        `UPDATE transactions SET gateway_payment_id = ?, status = 'SUCCESS', raw_status = 'webhook_captured', updated_at = ?
         WHERE gateway_order_id = ?`
      ).run(paymentEntity.id, now, paymentEntity.order_id);
    }
    res.json({ received: true });
  });

  router.get('/bookings', (req, res) => {
    const user = resolveUser(req);
    const sessionId = String(req.query.sessionId ?? 'DEMO-GUEST');
    res.json(listBookings(db, user?.id ?? null, sessionId));
  });

  router.get('/bookings/:pnr', (req, res) => {
    const user = resolveUser(req);
    const sessionId = String(req.query.sessionId ?? 'DEMO-GUEST');
    res.json(
      getBookingByPnrScoped(db, String(req.params.pnr), user?.id ?? null, sessionId, user?.role)
    );
  });

  router.post('/bookings/:pnr/cancel', writeRateLimit, (req, res) => {
    const user = resolveUser(req);
    const sessionId = String(req.body?.sessionId ?? 'DEMO-GUEST');
    const updated = cancelBooking(
      db,
      String(req.params.pnr),
      user?.id ?? null,
      sessionId,
      Date.now(),
      user?.role
    );
    broadcastCoachUpdate(updated.trainId, updated.coachId, updated.journeyDate, {
      action: 'SEATS_CANCELLED',
      seatNumbers: updated.seatNumbers,
    });
    broadcastUserEvent(updated.userId, updated.sessionId, {
      type: 'booking:updated',
      pnr: updated.pnr,
      status: updated.status,
    });
    res.json(updated);
  });

  router.post('/bookings/:pnr/refund-advance', writeRateLimit, (req, res) => {
    const user = resolveUser(req);
    const sessionId = String(req.body?.sessionId ?? 'DEMO-GUEST');
    const updated = advanceRefundSimulation(
      db,
      String(req.params.pnr),
      user?.id ?? null,
      sessionId,
      Date.now(),
      user?.role
    );
    res.json(updated);
  });

  // --- Notifications ---
  router.get('/notifications', (req, res) => {
    const user = resolveUser(req);
    const sessionId = String(req.query.sessionId ?? 'DEMO-GUEST');
    res.json(listNotifications(db, user?.id ?? null, sessionId));
  });

  router.post('/notifications/read-all', (req, res) => {
    const user = resolveUser(req);
    const sessionId = String(req.body?.sessionId ?? 'DEMO-GUEST');
    markAllNotificationsRead(db, user?.id ?? null, sessionId);
    res.json({ ok: true });
  });

  // --- Saved Co-Travellers ---
  router.get('/passengers', (req, res) => {
    const user = requireAuth(req);
    res.json(listSavedPassengers(db, user.id));
  });

  router.post('/passengers', writeRateLimit, (req, res) => {
    const user = requireAuth(req);
    const created = addSavedPassenger(db, user.id, req.body ?? {});
    res.status(201).json(created);
  });

  router.delete('/passengers/:id', (req, res) => {
    const user = requireAuth(req);
    deleteSavedPassenger(db, user.id, String(req.params.id));
    res.json({ ok: true });
  });

  // --- Authentication & Account Management ---
  router.post('/auth/register', authRateLimit, async (req, res, next) => {
    try {
      const { name, email, mobile, password, sessionId } = req.body ?? {};
      const result = await registerUser(db, {
        name: String(name ?? ''),
        email: String(email ?? ''),
        mobile: String(mobile ?? ''),
        password: String(password ?? ''),
        sessionId: sessionId ? String(sessionId) : undefined,
        userAgent: req.headers['user-agent'],
        ipAddress: getClientIp(req),
      });
      setSessionCookie(req, res, result.token);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/login', authRateLimit, (req, res) => {
    const { identifier, password, sessionId } = req.body ?? {};
    const result = loginWithPassword(db, {
      identifier: String(identifier ?? ''),
      password: String(password ?? ''),
      sessionId: sessionId ? String(sessionId) : undefined,
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIp(req),
    });
    setSessionCookie(req, res, result.token);
    res.json(result);
  });

  router.post('/auth/request-otp', authRateLimit, async (req, res, next) => {
    try {
      const mobile = String(req.body?.mobile ?? '');
      const result = await requestOtpLogin(db, mobile);
      res.json({
        ...result,
        // Keep legacy field alias only in unconfigured sandbox mode
        ...(result.sandboxOtpPreview ? { demoOtpHint: result.sandboxOtpPreview } : {}),
        disclaimer:
          result.deliveryMode === 'TWILIO'
            ? 'OTP sent to your mobile via SMS.'
            : 'SMS gateway unconfigured — sandbox OTP preview active for testing.',
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/verify-otp', authRateLimit, (req, res) => {
    const { mobile, otp, sessionId } = req.body ?? {};
    const result = verifyOtpLogin(db, {
      mobile: String(mobile ?? ''),
      otp: String(otp ?? ''),
      sessionId: sessionId ? String(sessionId) : undefined,
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIp(req),
    });
    setSessionCookie(req, res, result.token);
    res.json(result);
  });

  router.post('/auth/verify-email/request', authRateLimit, async (req, res, next) => {
    try {
      const user = requireAuth(req);
      const delivery = await requestEmailVerification(db, user.id);
      res.json(delivery);
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/verify-email/confirm', authRateLimit, (req, res) => {
    const user = requireAuth(req);
    const updated = verifyEmailCode(db, user.id, String(req.body?.code ?? ''));
    res.json({ user: updated });
  });

  router.post('/auth/forgot-password', authRateLimit, async (req, res, next) => {
    try {
      const result = await requestPasswordReset(db, String(req.body?.email ?? ''));
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/reset-password', authRateLimit, (req, res) => {
    const { email, code, newPassword } = req.body ?? {};
    resetPasswordWithCode(db, {
      email: String(email ?? ''),
      code: String(code ?? ''),
      newPassword: String(newPassword ?? ''),
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true });
  });

  router.get('/auth/me', (req, res) => {
    res.json({ user: resolveUser(req) });
  });

  router.put('/auth/profile', (req, res) => {
    const user = requireAuth(req);
    const { name, email, age, gender } = req.body ?? {};
    const updated = updateUserProfile(db, user.id, {
      name: String(name ?? ''),
      email: String(email ?? ''),
      age: age ? Number(age) : null,
      gender: gender ?? null,
    });
    res.json({ user: updated });
  });

  router.post('/auth/change-password', authRateLimit, (req, res) => {
    const user = requireAuth(req);
    const { currentPassword, newPassword } = req.body ?? {};
    changePassword(db, user.id, {
      currentPassword: currentPassword ? String(currentPassword) : undefined,
      newPassword: String(newPassword ?? ''),
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true });
  });

  router.get('/auth/sessions', (req, res) => {
    const user = requireAuth(req);
    const token = extractAuthToken(req);
    res.json(listUserSessions(db, user.id, token));
  });

  router.delete('/auth/sessions/:sessionId', (req, res) => {
    const user = requireAuth(req);
    revokeSessionById(db, user.id, String(req.params.sessionId));
    res.json({ ok: true });
  });

  router.delete('/auth/account', (req, res) => {
    const user = requireAuth(req);
    const password = String(req.body?.password ?? '');
    deleteAccount(db, user.id, password, getClientIp(req));
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  router.post('/auth/logout', (req, res) => {
    const token = extractAuthToken(req);
    logoutToken(db, token);
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // --- Public Pricing Read ---
  router.get('/pricing', (_req, res) => {
    res.json(getPricingRulesMap(db));
  });

  // --- Admin Bootstrap & RBAC Management ---
  router.get('/admin/bootstrap-status', (_req, res) => {
    res.json(getAdminBootstrapStatus(db));
  });

  router.post('/admin/bootstrap', authRateLimit, (req, res) => {
    const { name, email, mobile, password, passcode } = req.body ?? {};
    const result = bootstrapOrClaimAdmin(db, {
      name: String(name ?? ''),
      email: String(email ?? ''),
      mobile: String(mobile ?? ''),
      password: String(password ?? ''),
      passcode: passcode ? String(passcode) : undefined,
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIp(req),
    });
    setSessionCookie(req, res, result.token);
    res.status(201).json(result);
  });

  router.get('/admin/overview', (req, res) => {
    requireRole(req, ['admin', 'operator']);
    res.json({
      analytics: getAdminAnalytics(db),
      integrations: getIntegrationStatuses(getDbPathLabel()),
      realtime: getRealtimeStats(),
      telemetry: getTelemetrySummary(),
      config: getAppConfigMap(db),
    });
  });

  router.get('/admin/bookings', (req, res) => {
    requireRole(req, ['admin', 'operator']);
    res.json(
      listAllBookingsAdmin(db, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 15,
        status: req.query.status ? String(req.query.status) : 'ALL',
        query: req.query.q ? String(req.query.q) : '',
      })
    );
  });

  router.post('/admin/bookings/:pnr/refund', (req, res) => {
    const actor = requireRole(req, ['admin', 'operator']);
    const nextStatus = req.body?.status === 'REFUNDED' ? 'REFUNDED' : 'PROCESSING';
    const updated = adminUpdateBookingRefund(db, String(req.params.pnr), nextStatus, {
      id: actor.id,
      label: actor.email || actor.mobile,
      ipAddress: getClientIp(req),
    });
    res.json(updated);
  });

  router.get('/admin/users', (req, res) => {
    requireRole(req, ['admin']);
    res.json(
      listUsersAdmin(db, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 15,
        query: req.query.q ? String(req.query.q) : '',
      })
    );
  });

  router.patch('/admin/users/:userId', (req, res) => {
    const actor = requireRole(req, ['admin']);
    const { role, isActive, isVerified } = req.body ?? {};
    const updated = adminUpdateUser(
      db,
      String(req.params.userId),
      { role, isActive, isVerified },
      { id: actor.id, label: actor.email || actor.mobile, ipAddress: getClientIp(req) }
    );
    res.json({ user: updated });
  });

  router.get('/admin/trains', (req, res) => {
    requireRole(req, ['admin', 'operator']);
    res.json(listTrainsAdmin(db));
  });

  router.post('/admin/trains', (req, res) => {
    const actor = requireRole(req, ['admin']);
    const created = createTrainAdmin(db, req.body ?? {}, {
      id: actor.id,
      label: actor.email || actor.mobile,
      ipAddress: getClientIp(req),
    });
    res.status(201).json(created);
  });

  router.delete('/admin/trains/:trainId', (req, res) => {
    const actor = requireRole(req, ['admin']);
    deleteTrainAdmin(db, String(req.params.trainId), {
      id: actor.id,
      label: actor.email || actor.mobile,
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true });
  });

  router.put('/admin/pricing/:coachType', (req, res) => {
    const actor = requireRole(req, ['admin']);
    const updated = updatePricingRuleAdmin(
      db,
      String(req.params.coachType) as CoachType,
      req.body ?? {},
      { id: actor.id, label: actor.email || actor.mobile, ipAddress: getClientIp(req) }
    );
    res.json(updated);
  });

  router.put('/admin/config', (req, res) => {
    const actor = requireRole(req, ['admin']);
    const updated = updateAppConfig(db, req.body ?? {}, {
      id: actor.id,
      label: actor.email || actor.mobile,
      ipAddress: getClientIp(req),
    });
    res.json(updated);
  });

  router.post('/admin/notifications/broadcast', (req, res) => {
    const actor = requireRole(req, ['admin', 'operator']);
    const created = broadcastSystemNotification(db, req.body ?? {}, {
      id: actor.id,
      label: actor.email || actor.mobile,
      ipAddress: getClientIp(req),
    });
    res.status(201).json(created);
  });

  router.get('/admin/transactions', (req, res) => {
    requireRole(req, ['admin', 'operator']);
    res.json(
      listTransactionsAdmin(db, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      })
    );
  });

  router.get('/admin/audit-logs', (req, res) => {
    requireRole(req, ['admin']);
    res.json(
      listAuditLogsAdmin(db, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 25,
      })
    );
  });

  router.get('/admin/telemetry', (req, res) => {
    requireRole(req, ['admin', 'operator']);
    res.json({
      telemetry: getTelemetrySummary(),
      realtime: getRealtimeStats(),
      integrations: getIntegrationStatuses(getDbPathLabel()),
    });
  });

  router.get('/admin/backup', (req, res) => {
    const actor = requireRole(req, ['admin']);
    recordAuditLog(db, {
      actorId: actor.id,
      actorLabel: actor.email || actor.mobile,
      action: 'ADMIN_BACKUP_EXPORTED',
      targetType: 'DATABASE',
      targetId: 'snapshot',
      ipAddress: getClientIp(req),
    });
    res.json(exportSafeBackupSnapshot(db));
  });

  // Centralized router error handler
  router.use(
    (
      err: Error & { statusCode?: number },
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const status =
        err.statusCode ??
        (err.message?.includes('not found') ? 404 : 400);
      if (status >= 500) {
        logError(`API error on ${req.method} ${req.originalUrl}`, err);
      }
      res.status(status).json({
        error: err.message || 'An unexpected error occurred.',
      });
    }
  );

  return router;
}
