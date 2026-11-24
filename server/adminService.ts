import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type {
  AdminAnalytics,
  AdminTrainRecord,
  AppConfigRecord,
  AuditLogEntry,
  BookingRecord,
  CoachType,
  CustomerUser,
  NotificationItem,
  PaginatedResult,
  PricingRule,
  TrainStop,
  TransactionRecord,
  UserRole,
} from '../src/types/railway';
import { generateCoachSeatDefinitions } from '../src/utils/coachLayouts';
import { getPricingRulesMap } from './bookingService';
import { recordAuditLog } from './logger';
import { broadcastGlobalEvent, broadcastUserEvent } from './realtime';
import { sanitizeText } from './security';

export function getAppConfigMap(db: DatabaseSync): AppConfigRecord {
  const rows = db.prepare('SELECT key, value FROM app_config').all() as Array<{
    key: string;
    value: string;
  }>;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    appName: map.get('app_name') || 'TRAINSYNK',
    supportEmail: map.get('support_email') || 'support@trainsynk.in',
    holdDurationMinutes: Number(map.get('hold_duration_minutes') || '15'),
    maxSeatsPerBooking: Number(map.get('max_seats_per_booking') || '6'),
    maintenanceMode: map.get('maintenance_mode') === 'true',
  };
}

export function updateAppConfig(
  db: DatabaseSync,
  updates: Partial<AppConfigRecord>,
  actor: { id: string; label: string; ipAddress?: string }
): AppConfigRecord {
  const now = Date.now();
  const upsert = db.prepare(
    'INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, ?)'
  );

  if (updates.appName !== undefined) {
    const clean = sanitizeText(updates.appName, 60);
    if (clean.length < 2) throw new Error('Application name must be at least 2 characters.');
    upsert.run('app_name', clean, now);
  }
  if (updates.supportEmail !== undefined) {
    upsert.run('support_email', sanitizeText(updates.supportEmail, 120), now);
  }
  if (updates.holdDurationMinutes !== undefined) {
    const mins = Number(updates.holdDurationMinutes);
    if (!Number.isFinite(mins) || mins < 5 || mins > 60) {
      throw new Error('Hold duration must be between 5 and 60 minutes.');
    }
    upsert.run('hold_duration_minutes', String(Math.round(mins)), now);
  }
  if (updates.maxSeatsPerBooking !== undefined) {
    const maxSeats = Number(updates.maxSeatsPerBooking);
    if (!Number.isFinite(maxSeats) || maxSeats < 1 || maxSeats > 10) {
      throw new Error('Max seats per booking must be between 1 and 10.');
    }
    upsert.run('max_seats_per_booking', String(Math.round(maxSeats)), now);
  }
  if (updates.maintenanceMode !== undefined) {
    upsert.run('maintenance_mode', updates.maintenanceMode ? 'true' : 'false', now);
  }

  const next = getAppConfigMap(db);
  recordAuditLog(db, {
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'APP_CONFIG_UPDATED',
    targetType: 'APP_CONFIG',
    targetId: 'global',
    metadata: updates as Record<string, unknown>,
    ipAddress: actor.ipAddress,
    nowMs: now,
  });
  broadcastGlobalEvent({ type: 'config_updated', config: next });
  return next;
}

export function getAdminAnalytics(db: DatabaseSync): AdminAnalytics {
  const now = Date.now();
  const bookingAgg = db
    .prepare(
      `SELECT
         COUNT(*) as totalBookings,
         COALESCE(SUM(CASE WHEN status IN ('CONFIRMED', 'WL', 'RAC') THEN total_fare ELSE 0 END), 0) as totalRevenue,
         SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmedBookings,
         SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelledBookings,
         SUM(CASE WHEN status = 'CANCELLED' AND refund_status IN ('INITIATED', 'PROCESSING') THEN 1 ELSE 0 END) as pendingRefunds
       FROM bookings`
    )
    .get() as {
    totalBookings: number;
    totalRevenue: number;
    confirmedBookings: number;
    cancelledBookings: number;
    pendingRefunds: number;
  };

  const userAgg = db
    .prepare(
      `SELECT
         COUNT(*) as totalUsers,
         SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verifiedUsers
       FROM users`
    )
    .get() as { totalUsers: number; verifiedUsers: number };

  const holdAgg = db
    .prepare(`SELECT COUNT(*) as activeHolds FROM seats WHERE status = 'HELD' AND hold_expires_at > ?`)
    .get(now) as { activeHolds: number };

  const trainAgg = db.prepare('SELECT COUNT(*) as totalTrains FROM trains').get() as {
    totalTrains: number;
  };

  const classBreakdown = db
    .prepare(
      `SELECT coach_type as coachType,
              COUNT(*) as bookings,
              COALESCE(SUM(CASE WHEN status IN ('CONFIRMED', 'WL', 'RAC') THEN total_fare ELSE 0 END), 0) as revenue
       FROM bookings
       GROUP BY coach_type
       ORDER BY revenue DESC`
    )
    .all() as Array<{ coachType: CoachType; bookings: number; revenue: number }>;

  const topRoutes = db
    .prepare(
      `SELECT (from_code || ' → ' || to_code) as route,
              COUNT(*) as bookings,
              COALESCE(SUM(CASE WHEN status IN ('CONFIRMED', 'WL', 'RAC') THEN total_fare ELSE 0 END), 0) as revenue
       FROM bookings
       GROUP BY from_code, to_code
       ORDER BY bookings DESC
       LIMIT 6`
    )
    .all() as Array<{ route: string; bookings: number; revenue: number }>;

  return {
    totalRevenue: Number(bookingAgg.totalRevenue ?? 0),
    totalBookings: Number(bookingAgg.totalBookings ?? 0),
    confirmedBookings: Number(bookingAgg.confirmedBookings ?? 0),
    cancelledBookings: Number(bookingAgg.cancelledBookings ?? 0),
    pendingRefunds: Number(bookingAgg.pendingRefunds ?? 0),
    totalUsers: Number(userAgg.totalUsers ?? 0),
    verifiedUsers: Number(userAgg.verifiedUsers ?? 0),
    activeHolds: Number(holdAgg.activeHolds ?? 0),
    totalTrains: Number(trainAgg.totalTrains ?? 0),
    classBreakdown,
    topRoutes,
  };
}

export function listAllBookingsAdmin(
  db: DatabaseSync,
  params: { page?: number; limit?: number; status?: string; query?: string }
): PaginatedResult<BookingRecord> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(50, Math.max(1, Number(params.limit || 15)));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const bindValues: Array<string | number> = [];

  if (params.status && params.status !== 'ALL') {
    whereClauses.push('status = ?');
    bindValues.push(params.status);
  }
  if (params.query?.trim()) {
    const q = `%${params.query.trim().toLowerCase()}%`;
    whereClauses.push(
      '(lower(pnr) LIKE ? OR lower(train_number) LIKE ? OR lower(from_code) LIKE ? OR lower(to_code) LIKE ? OR lower(passengers_json) LIKE ?)'
    );
    bindValues.push(q, q, q, q, q);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const totalRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM bookings ${whereSql}`)
    .get(...bindValues) as { cnt: number };

  const rows = db
    .prepare(
      `SELECT * FROM bookings ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...bindValues, limit, offset) as Array<Record<string, unknown>>;

  const items: BookingRecord[] = rows.map((r) => ({
    pnr: String(r.pnr),
    userId: (r.user_id as string | null) ?? null,
    sessionId: String(r.session_id),
    trainId: String(r.train_id),
    trainNumber: String(r.train_number),
    trainNameEn: String(r.train_name_en),
    trainNameTe: String(r.train_name_te),
    fromCode: String(r.from_code),
    fromNameEn: String(r.from_name_en),
    toCode: String(r.to_code),
    toNameEn: String(r.to_name_en),
    departureTime: String(r.departure_time),
    arrivalTime: String(r.arrival_time),
    journeyDate: String(r.journey_date),
    coachId: String(r.coach_id),
    coachCode: String(r.coach_code),
    coachType: r.coach_type as CoachType,
    seatNumbers: JSON.parse(String(r.seat_numbers_json)),
    passengers: JSON.parse(String(r.passengers_json)),
    status: r.status as BookingRecord['status'],
    paymentMethod: (r.payment_method as BookingRecord['paymentMethod']) ?? null,
    paymentStatus: r.payment_status as BookingRecord['paymentStatus'],
    farePerSeat: Number(r.fare_per_seat),
    totalFare: Number(r.total_fare),
    holdExpiresAt: r.hold_expires_at !== null ? Number(r.hold_expires_at) : null,
    refundStatus: r.refund_status as BookingRecord['refundStatus'],
    refundAmount: Number(r.refund_amount),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  }));

  return {
    items,
    total: totalRow.cnt,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalRow.cnt / limit)),
  };
}

export function listUsersAdmin(
  db: DatabaseSync,
  params: { page?: number; limit?: number; query?: string }
): PaginatedResult<CustomerUser> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(50, Math.max(1, Number(params.limit || 15)));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const bindValues: Array<string | number> = [];

  if (params.query?.trim()) {
    const q = `%${params.query.trim().toLowerCase()}%`;
    whereClauses.push('(lower(name) LIKE ? OR lower(email) LIKE ? OR mobile LIKE ?)');
    bindValues.push(q, q, q);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const totalRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM users ${whereSql}`)
    .get(...bindValues) as { cnt: number };

  const rows = db
    .prepare(
      `SELECT id, mobile, name, email, age, gender, password_hash, role, is_verified, is_active, created_at, last_login_at
       FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...bindValues, limit, offset) as Array<Record<string, unknown>>;

  const items: CustomerUser[] = rows.map((r) => ({
    id: String(r.id),
    mobile: String(r.mobile),
    name: String(r.name),
    email: String(r.email),
    age: r.age !== null ? Number(r.age) : null,
    gender: (r.gender as CustomerUser['gender']) ?? null,
    role: (r.role as UserRole) || 'customer',
    isVerified: Boolean(r.is_verified),
    isActive: r.is_active === undefined ? true : Boolean(r.is_active),
    hasPassword: Boolean(r.password_hash),
    createdAt: Number(r.created_at),
    lastLoginAt: r.last_login_at !== null ? Number(r.last_login_at) : null,
  }));

  return {
    items,
    total: totalRow.cnt,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalRow.cnt / limit)),
  };
}

export function adminUpdateUser(
  db: DatabaseSync,
  targetUserId: string,
  updates: { role?: UserRole; isActive?: boolean; isVerified?: boolean },
  actor: { id: string; label: string; ipAddress?: string }
): CustomerUser {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as
    | Record<string, unknown>
    | undefined;
  if (!existing) throw new Error('User not found.');

  if (targetUserId === actor.id && updates.isActive === false) {
    throw new Error('You cannot suspend your own active admin account.');
  }
  if (targetUserId === actor.id && updates.role && updates.role !== 'admin') {
    throw new Error('You cannot demote your own admin role.');
  }

  const nextRole = updates.role ?? (existing.role as UserRole);
  if (!['customer', 'operator', 'admin'].includes(nextRole)) {
    throw new Error('Invalid user role.');
  }
  const nextActive =
    updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : Number(existing.is_active);
  const nextVerified =
    updates.isVerified !== undefined ? (updates.isVerified ? 1 : 0) : Number(existing.is_verified);

  const now = Date.now();
  db.prepare(
    'UPDATE users SET role = ?, is_active = ?, is_verified = ?, updated_at = ? WHERE id = ?'
  ).run(nextRole, nextActive, nextVerified, now, targetUserId);

  if (nextActive === 0) {
    db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(
      now,
      targetUserId
    );
  }

  recordAuditLog(db, {
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'ADMIN_USER_UPDATED',
    targetType: 'USER',
    targetId: targetUserId,
    metadata: updates as Record<string, unknown>,
    ipAddress: actor.ipAddress,
    nowMs: now,
  });

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as Record<
    string,
    unknown
  >;
  return {
    id: String(updated.id),
    mobile: String(updated.mobile),
    name: String(updated.name),
    email: String(updated.email),
    age: updated.age !== null ? Number(updated.age) : null,
    gender: (updated.gender as CustomerUser['gender']) ?? null,
    role: updated.role as UserRole,
    isVerified: Boolean(updated.is_verified),
    isActive: Boolean(updated.is_active),
    hasPassword: Boolean(updated.password_hash),
    createdAt: Number(updated.created_at),
    lastLoginAt: updated.last_login_at !== null ? Number(updated.last_login_at) : null,
  };
}

export function listTrainsAdmin(db: DatabaseSync): AdminTrainRecord[] {
  const trainRows = db
    .prepare('SELECT * FROM trains ORDER BY train_number ASC')
    .all() as Array<{
    id: string;
    train_number: string;
    name_en: string;
    name_te: string;
    running_days_json: string;
    stops_json: string;
  }>;

  const coachStmt = db.prepare(
    'SELECT id, coach_code, coach_type, sort_order, total_seats FROM coaches WHERE train_id = ? ORDER BY sort_order ASC'
  );

  return trainRows.map((t) => {
    const coaches = coachStmt.all(t.id) as Array<{
      id: string;
      coach_code: string;
      coach_type: CoachType;
      sort_order: number;
      total_seats: number;
    }>;
    return {
      id: t.id,
      trainNumber: t.train_number,
      nameEn: t.name_en,
      nameTe: t.name_te,
      runningDays: JSON.parse(t.running_days_json) as string[],
      stops: JSON.parse(t.stops_json) as TrainStop[],
      coaches: coaches.map((c) => ({
        id: c.id,
        coachCode: c.coach_code,
        coachType: c.coach_type,
        sortOrder: c.sort_order,
        totalSeats: c.total_seats,
      })),
    };
  });
}

export function createTrainAdmin(
  db: DatabaseSync,
  input: {
    trainNumber: string;
    nameEn: string;
    nameTe?: string;
    coaches: Array<{ code: string; type: CoachType }>;
    stops: TrainStop[];
  },
  actor: { id: string; label: string; ipAddress?: string }
): AdminTrainRecord {
  const trainNumber = sanitizeText(input.trainNumber, 10);
  const nameEn = sanitizeText(input.nameEn, 100);
  const nameTe = sanitizeText(input.nameTe || input.nameEn, 120);

  if (!/^\d{4,6}$/.test(trainNumber)) {
    throw new Error('Train number must be 4 to 6 digits.');
  }
  if (nameEn.length < 3) {
    throw new Error('Train name must be at least 3 characters.');
  }
  if (!Array.isArray(input.stops) || input.stops.length < 2) {
    throw new Error('At least 2 route stops are required.');
  }
  if (!Array.isArray(input.coaches) || input.coaches.length < 1) {
    throw new Error('At least 1 coach is required.');
  }

  const existing = db
    .prepare('SELECT id FROM trains WHERE train_number = ?')
    .get(trainNumber) as { id: string } | undefined;
  if (existing) {
    throw new Error(`Train #${trainNumber} already exists.`);
  }

  const trainId = `TR-${trainNumber}`;
  const runningDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO trains (id, train_number, name_en, name_te, running_days_json, stops_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(trainId, trainNumber, nameEn, nameTe, JSON.stringify(runningDays), JSON.stringify(input.stops));

    const insertCoach = db.prepare(
      `INSERT INTO coaches (id, train_id, coach_code, coach_type, sort_order, total_seats)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    input.coaches.forEach((coach, idx) => {
      const code = sanitizeText(coach.code, 6).toUpperCase();
      const seatCount = generateCoachSeatDefinitions(coach.type).length;
      insertCoach.run(`${trainId}-${code}`, trainId, code, coach.type, idx + 1, seatCount);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  recordAuditLog(db, {
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'ADMIN_TRAIN_CREATED',
    targetType: 'TRAIN',
    targetId: trainId,
    metadata: { trainNumber, nameEn },
    ipAddress: actor.ipAddress,
  });

  return listTrainsAdmin(db).find((t) => t.id === trainId)!;
}

export function deleteTrainAdmin(
  db: DatabaseSync,
  trainId: string,
  actor: { id: string; label: string; ipAddress?: string }
): void {
  const existing = db.prepare('SELECT id, train_number FROM trains WHERE id = ?').get(trainId) as
    | { id: string; train_number: string }
    | undefined;
  if (!existing) throw new Error('Train not found.');

  const activeBookings = db
    .prepare("SELECT COUNT(*) as cnt FROM bookings WHERE train_id = ? AND status IN ('CONFIRMED', 'WL', 'RAC')")
    .get(trainId) as { cnt: number };
  if (activeBookings.cnt > 0) {
    throw new Error('Cannot delete a train that has active confirmed/waitlisted bookings.');
  }

  db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);

  recordAuditLog(db, {
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'ADMIN_TRAIN_DELETED',
    targetType: 'TRAIN',
    targetId: trainId,
    metadata: { trainNumber: existing.train_number },
    ipAddress: actor.ipAddress,
  });
}

export function updatePricingRuleAdmin(
  db: DatabaseSync,
  coachType: CoachType,
  updates: Partial<PricingRule>,
  actor: { id: string; label: string; ipAddress?: string }
): Record<CoachType, PricingRule> {
  const rules = getPricingRulesMap(db);
  const current = rules[coachType];
  if (!current) throw new Error('Unknown coach type.');

  const baseFare = Number(updates.baseFare ?? current.baseFare);
  const perKmRate = Number(updates.perKmRate ?? current.perKmRate);
  const reservationFee = Number(updates.reservationFee ?? current.reservationFee);
  const gstPercent = Number(updates.gstPercent ?? current.gstPercent);

  if (
    !Number.isFinite(baseFare) ||
    baseFare < 0 ||
    !Number.isFinite(perKmRate) ||
    perKmRate < 0 ||
    !Number.isFinite(reservationFee) ||
    reservationFee < 0 ||
    !Number.isFinite(gstPercent) ||
    gstPercent < 0 ||
    gstPercent > 28
  ) {
    throw new Error('Invalid tariff values.');
  }

  db.prepare(
    `UPDATE pricing_config
     SET base_fare = ?, per_km_rate = ?, reservation_fee = ?, gst_percent = ?
     WHERE coach_type = ?`
  ).run(baseFare, perKmRate, reservationFee, gstPercent, coachType);

  recordAuditLog(db, {
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'PRICING_UPDATED',
    targetType: 'PRICING',
    targetId: coachType,
    metadata: { baseFare, perKmRate, reservationFee, gstPercent },
    ipAddress: actor.ipAddress,
  });

  return getPricingRulesMap(db);
}

export function listTransactionsAdmin(
  db: DatabaseSync,
  params: { page?: number; limit?: number }
): PaginatedResult<TransactionRecord> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(50, Math.max(1, Number(params.limit || 20)));
  const offset = (page - 1) * limit;

  const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM transactions').get() as { cnt: number };
  const rows = db
    .prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as Array<Record<string, unknown>>;

  return {
    items: rows.map((r) => ({
      id: String(r.id),
      pnr: String(r.pnr),
      userId: (r.user_id as string | null) ?? null,
      gateway: String(r.gateway),
      gatewayOrderId: (r.gateway_order_id as string | null) ?? null,
      gatewayPaymentId: (r.gateway_payment_id as string | null) ?? null,
      amount: Number(r.amount),
      currency: String(r.currency),
      status: String(r.status),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    })),
    total: totalRow.cnt,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalRow.cnt / limit)),
  };
}

export function listAuditLogsAdmin(
  db: DatabaseSync,
  params: { page?: number; limit?: number }
): PaginatedResult<AuditLogEntry> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(50, Math.max(1, Number(params.limit || 25)));
  const offset = (page - 1) * limit;

  const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM audit_logs').get() as { cnt: number };
  const rows = db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as Array<Record<string, unknown>>;

  return {
    items: rows.map((r) => ({
      id: String(r.id),
      actorId: (r.actor_id as string | null) ?? null,
      actorLabel: String(r.actor_label),
      action: String(r.action),
      targetType: String(r.target_type),
      targetId: (r.target_id as string | null) ?? null,
      metadata: r.metadata_json ? (JSON.parse(String(r.metadata_json)) as Record<string, unknown>) : {},
      ipAddress: String(r.ip_address ?? ''),
      createdAt: Number(r.created_at),
    })),
    total: totalRow.cnt,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalRow.cnt / limit)),
  };
}

export function broadcastSystemNotification(
  db: DatabaseSync,
  input: {
    type: NotificationItem['type'];
    titleEn: string;
    titleTe?: string;
    messageEn: string;
    messageTe?: string;
  },
  actor: { id: string; label: string; ipAddress?: string }
): NotificationItem {
  const titleEn = sanitizeText(input.titleEn, 140);
  const messageEn = sanitizeText(input.messageEn, 400);
  if (!titleEn || !messageEn) {
    throw new Error('Notification title and message are required.');
  }
  const titleTe = sanitizeText(input.titleTe || titleEn, 160);
  const messageTe = sanitizeText(input.messageTe || messageEn, 440);
  const id = `NTF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const now = Date.now();

  db.prepare(
    `INSERT INTO notifications (id, user_id, session_id, type, title_en, title_te, message_en, message_te, is_simulated, read, created_at)
     VALUES (?, NULL, 'DEMO-GLOBAL', ?, ?, ?, ?, ?, 0, 0, ?)`
  ).run(id, input.type, titleEn, titleTe, messageEn, messageTe, now);

  const item: NotificationItem = {
    id,
    type: input.type,
    titleEn,
    titleTe,
    messageEn,
    messageTe,
    isSimulated: false,
    read: false,
    createdAt: now,
  };

  recordAuditLog(db, {
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'ADMIN_BROADCAST_NOTIFICATION',
    targetType: 'NOTIFICATION',
    targetId: id,
    metadata: { titleEn },
    ipAddress: actor.ipAddress,
    nowMs: now,
  });

  broadcastGlobalEvent({ type: 'notification:new', notification: item });
  return item;
}

export function adminUpdateBookingRefund(
  db: DatabaseSync,
  pnr: string,
  nextStatus: 'PROCESSING' | 'REFUNDED',
  actor: { id: string; label: string; ipAddress?: string }
): BookingRecord {
  const existing = db.prepare('SELECT * FROM bookings WHERE pnr = ?').get(pnr) as
    | Record<string, unknown>
    | undefined;
  if (!existing) throw new Error('Booking not found.');
  if (existing.status !== 'CANCELLED') {
    throw new Error('Only cancelled bookings can be refunded.');
  }

  const now = Date.now();
  db.prepare('UPDATE bookings SET refund_status = ?, updated_at = ? WHERE pnr = ?').run(
    nextStatus,
    now,
    pnr
  );

  const notifId = `NTF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const targetUserId = (existing.user_id as string | null) ?? null;
  const targetSessionId = String(existing.session_id);

  db.prepare(
    `INSERT INTO notifications (id, user_id, session_id, type, title_en, title_te, message_en, message_te, is_simulated, read, created_at)
     VALUES (?, ?, ?, 'REFUND_UPDATE', ?, ?, ?, ?, 0, 0, ?)`
  ).run(
    notifId,
    targetUserId,
    targetSessionId,
    `Refund ${nextStatus}: PNR ${pnr}`,
    `రీఫండ్ ${nextStatus}: PNR ${pnr}`,
    `Your refund of INR ${existing.refund_amount} for PNR ${pnr} is now ${nextStatus}.`,
    `PNR ${pnr} కోసం ₹${existing.refund_amount} రీఫండ్ స్థితి ${nextStatus} కు మారింది.`,
    now
  );

  recordAuditLog(db, {
    actorId: actor.id,
    actorLabel: actor.label,
    action: 'ADMIN_REFUND_UPDATED',
    targetType: 'BOOKING',
    targetId: pnr,
    metadata: { nextStatus },
    ipAddress: actor.ipAddress,
    nowMs: now,
  });

  broadcastUserEvent(targetUserId, targetSessionId, {
    type: 'booking:updated',
    pnr,
    refundStatus: nextStatus,
  });

  const updated = listAllBookingsAdmin(db, { query: pnr, limit: 1 }).items[0];
  return updated;
}

export function exportSafeBackupSnapshot(db: DatabaseSync) {
  const stations = db.prepare('SELECT * FROM stations').all();
  const trains = db.prepare('SELECT * FROM trains').all();
  const coaches = db.prepare('SELECT * FROM coaches').all();
  const pricing = db.prepare('SELECT * FROM pricing_config').all();
  const appConfig = db.prepare('SELECT * FROM app_config').all();
  const users = db
    .prepare('SELECT id, mobile, name, email, age, gender, role, is_verified, is_active, created_at FROM users')
    .all();
  const bookings = db.prepare('SELECT * FROM bookings').all();
  const transactions = db.prepare('SELECT * FROM transactions').all();

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 2,
    counts: {
      stations: stations.length,
      trains: trains.length,
      coaches: coaches.length,
      users: users.length,
      bookings: bookings.length,
      transactions: transactions.length,
    },
    data: {
      stations,
      trains,
      coaches,
      pricing,
      appConfig,
      users,
      bookings,
      transactions,
    },
  };
}
