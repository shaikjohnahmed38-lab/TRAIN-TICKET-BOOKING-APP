import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { ensureSeatsForCoachDate } from './db';
import { calculateDemoFare, calculateDemoRefund } from '../src/utils/fareCalculator';
import type {
  BookingRecord,
  BookingStatus,
  CoachSummary,
  CoachType,
  CustomerUser,
  NotificationItem,
  PassengerInput,
  PaymentMethod,
  PricingRule,
  SeatRecord,
  Station,
  TrainSearchResult,
  TrainStop,
} from '../src/types/railway';

export const HOLD_DURATION_MS = 15 * 60 * 1000;

export function releaseExpiredHolds(db: DatabaseSync, nowMs: number = Date.now()): number {
  const result = db
    .prepare(
      `UPDATE seats
       SET status = 'AVAILABLE', held_by_session = NULL, hold_expires_at = NULL
       WHERE status = 'HELD' AND hold_expires_at IS NOT NULL AND hold_expires_at <= ?`
    )
    .run(nowMs);
  return Number(result.changes ?? 0);
}

export function getPricingRulesMap(db: DatabaseSync): Record<CoachType, PricingRule> {
  const rows = db.prepare('SELECT * FROM pricing_config').all() as Array<{
    coach_type: CoachType;
    label_en: string;
    label_te: string;
    base_fare: number;
    per_km_rate: number;
    reservation_fee: number;
    gst_percent: number;
  }>;
  const map = {} as Record<CoachType, PricingRule>;
  for (const r of rows) {
    map[r.coach_type] = {
      coachType: r.coach_type,
      labelEn: r.label_en,
      labelTe: r.label_te,
      baseFare: r.base_fare,
      perKmRate: r.per_km_rate,
      reservationFee: r.reservation_fee,
      gstPercent: r.gst_percent,
    };
  }
  return map;
}

export function listStations(db: DatabaseSync): Station[] {
  const rows = db.prepare('SELECT code, name_en, name_te, city, state FROM stations ORDER BY name_en').all() as Array<{
    code: string;
    name_en: string;
    name_te: string;
    city: string;
    state: 'AP' | 'TS';
  }>;
  return rows.map((r) => ({
    code: r.code,
    nameEn: r.name_en,
    nameTe: r.name_te,
    city: r.city,
    state: r.state,
  }));
}

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function matchesTimeWindow(departureTime: string, timeWindow?: string): boolean {
  if (!timeWindow || timeWindow === 'ALL') return true;
  const [hourStr] = departureTime.split(':');
  const hour = Number(hourStr);
  if (timeWindow === 'MORNING') return hour >= 4 && hour < 12;
  if (timeWindow === 'AFTERNOON') return hour >= 12 && hour < 17;
  if (timeWindow === 'EVENING') return hour >= 17 && hour < 21;
  if (timeWindow === 'NIGHT') return hour >= 21 || hour < 4;
  return true;
}

export function searchTrains(
  db: DatabaseSync,
  params: {
    fromCode: string;
    toCode: string;
    journeyDate: string;
    timeWindow?: string;
    nowMs?: number;
  }
): TrainSearchResult[] {
  releaseExpiredHolds(db, params.nowMs ?? Date.now());
  const pricingRules = getPricingRulesMap(db);
  const stations = new Map(listStations(db).map((s) => [s.code, s]));
  const fromUpper = params.fromCode.trim().toUpperCase();
  const toUpper = params.toCode.trim().toUpperCase();

  const trains = db.prepare('SELECT * FROM trains').all() as Array<{
    id: string;
    train_number: string;
    name_en: string;
    name_te: string;
    running_days_json: string;
    stops_json: string;
  }>;

  const getCoaches = db.prepare(
    'SELECT id, coach_code, coach_type, sort_order, total_seats FROM coaches WHERE train_id = ? ORDER BY sort_order ASC'
  );
  const getSeatStats = db.prepare(`
    SELECT status, COUNT(*) as cnt
    FROM seats
    WHERE coach_id = ? AND journey_date = ?
    GROUP BY status
  `);

  const results: TrainSearchResult[] = [];

  for (const t of trains) {
    const stops = JSON.parse(t.stops_json) as TrainStop[];
    const fromIdx = stops.findIndex((s) => s.stationCode === fromUpper);
    const toIdx = stops.findIndex((s) => s.stationCode === toUpper);
    if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) {
      continue;
    }

    const fromStop = stops[fromIdx];
    const toStop = stops[toIdx];
    const depTime = fromStop.departureTime ?? fromStop.arrivalTime ?? '00:00';
    const arrTime = toStop.arrivalTime ?? toStop.departureTime ?? '00:00';

    if (!matchesTimeWindow(depTime, params.timeWindow)) {
      continue;
    }

    const fromStation = stations.get(fromUpper);
    const toStation = stations.get(toUpper);
    if (!fromStation || !toStation) continue;

    const distanceKm = Math.max(60, toStop.distanceKm - fromStop.distanceKm);
    const depTotalMins = fromStop.dayOffset * 1440 + parseMinutes(depTime);
    const arrTotalMins = toStop.dayOffset * 1440 + parseMinutes(arrTime);
    const durationMinutes = Math.max(45, arrTotalMins - depTotalMins);

    const coachRows = getCoaches.all(t.id) as Array<{
      id: string;
      coach_code: string;
      coach_type: CoachType;
      sort_order: number;
      total_seats: number;
    }>;

    const coaches: CoachSummary[] = coachRows.map((c) => {
      ensureSeatsForCoachDate(db, t.id, c.id, c.coach_type, params.journeyDate);
      const stats = getSeatStats.all(c.id, params.journeyDate) as Array<{
        status: string;
        cnt: number;
      }>;
      const counts: Record<string, number> = {};
      for (const st of stats) {
        counts[st.status] = st.cnt;
      }
      const fare = calculateDemoFare(c.coach_type, distanceKm, 1, pricingRules).farePerSeat;
      return {
        id: c.id,
        coachCode: c.coach_code,
        coachType: c.coach_type,
        sortOrder: c.sort_order,
        totalSeats: c.total_seats,
        availableCount: counts.AVAILABLE ?? 0,
        bookedCount: counts.BOOKED ?? 0,
        waitingListCount: counts.WAITING_LIST ?? 0,
        heldCount: counts.HELD ?? 0,
        fare,
      };
    });

    results.push({
      id: t.id,
      trainNumber: t.train_number,
      nameEn: t.name_en,
      nameTe: t.name_te,
      fromStation,
      toStation,
      departureTime: depTime,
      arrivalTime: arrTime,
      durationMinutes,
      distanceKm,
      journeyDate: params.journeyDate,
      runningDays: JSON.parse(t.running_days_json) as string[],
      coaches,
    });
  }

  return results.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}

export function getCoachSeats(
  db: DatabaseSync,
  trainId: string,
  coachId: string,
  journeyDate: string,
  nowMs: number = Date.now()
): SeatRecord[] {
  releaseExpiredHolds(db, nowMs);
  const coach = db
    .prepare('SELECT id, train_id, coach_type FROM coaches WHERE id = ? AND train_id = ?')
    .get(coachId, trainId) as { id: string; train_id: string; coach_type: CoachType } | undefined;

  if (!coach) {
    throw new Error('Coach not found for train');
  }

  ensureSeatsForCoachDate(db, trainId, coachId, coach.coach_type, journeyDate);

  const rows = db
    .prepare(
      `SELECT id, coach_id, train_id, journey_date, seat_number, berth_type, bay_number,
              status, held_by_session, hold_expires_at, booked_pnr
       FROM seats
       WHERE coach_id = ? AND journey_date = ?
       ORDER BY seat_number ASC`
    )
    .all(coachId, journeyDate) as Array<{
    id: string;
    coach_id: string;
    train_id: string;
    journey_date: string;
    seat_number: number;
    berth_type: SeatRecord['berthType'];
    bay_number: number;
    status: SeatRecord['status'];
    held_by_session: string | null;
    hold_expires_at: number | null;
    booked_pnr: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    coachId: r.coach_id,
    trainId: r.train_id,
    journeyDate: r.journey_date,
    seatNumber: r.seat_number,
    berthType: r.berth_type,
    bayNumber: r.bay_number,
    status: r.status,
    heldBySession: r.held_by_session,
    holdExpiresAt: r.hold_expires_at,
    bookedPnr: r.booked_pnr,
  }));
}

export function holdSeats(
  db: DatabaseSync,
  params: {
    sessionId: string;
    trainId: string;
    coachId: string;
    journeyDate: string;
    seatNumbers: number[];
    allowWaitlist?: boolean;
    nowMs?: number;
  }
): { holdExpiresAt: number; seats: SeatRecord[] } {
  const now = params.nowMs ?? Date.now();
  if (!params.seatNumbers || params.seatNumbers.length === 0) {
    throw new Error('Select at least one seat to hold.');
  }
  if (params.seatNumbers.length > 6) {
    throw new Error('Maximum 6 seats can be held at a time.');
  }

  const coach = db
    .prepare('SELECT id, coach_type FROM coaches WHERE id = ? AND train_id = ?')
    .get(params.coachId, params.trainId) as { id: string; coach_type: CoachType } | undefined;
  if (!coach) {
    throw new Error('Selected coach was not found.');
  }
  ensureSeatsForCoachDate(db, params.trainId, params.coachId, coach.coach_type, params.journeyDate);

  const holdExpiresAt = now + HOLD_DURATION_MS;

  db.exec('BEGIN IMMEDIATE');
  try {
    releaseExpiredHolds(db, now);

    // Release any previous held seats owned by this session on this coach/date before applying new hold
    db.prepare(
      `UPDATE seats
       SET status = 'AVAILABLE', held_by_session = NULL, hold_expires_at = NULL
       WHERE coach_id = ? AND journey_date = ? AND status = 'HELD' AND held_by_session = ?`
    ).run(params.coachId, params.journeyDate, params.sessionId);

    const placeholders = params.seatNumbers.map(() => '?').join(',');
    const targetSeats = db
      .prepare(
        `SELECT seat_number, status, held_by_session
         FROM seats
         WHERE coach_id = ? AND journey_date = ? AND seat_number IN (${placeholders})`
      )
      .all(params.coachId, params.journeyDate, ...params.seatNumbers) as Array<{
      seat_number: number;
      status: string;
      held_by_session: string | null;
    }>;

    if (targetSeats.length !== params.seatNumbers.length) {
      throw new Error('One or more selected seat numbers do not exist in this coach.');
    }

    const conflicts: number[] = [];
    for (const s of targetSeats) {
      if (s.status === 'BOOKED') {
        conflicts.push(s.seat_number);
      } else if (s.status === 'HELD' && s.held_by_session !== params.sessionId) {
        conflicts.push(s.seat_number);
      } else if (s.status === 'WAITING_LIST' && !params.allowWaitlist) {
        conflicts.push(s.seat_number);
      }
    }

    if (conflicts.length > 0) {
      const err = new Error(
        `Seat(s) ${conflicts.join(', ')} are currently booked or held by another passenger.`
      ) as Error & { statusCode?: number };
      err.statusCode = 409;
      throw err;
    }

    const updateStmt = db.prepare(
      `UPDATE seats
       SET status = CASE WHEN status = 'WAITING_LIST' THEN 'WAITING_LIST' ELSE 'HELD' END,
           held_by_session = ?,
           hold_expires_at = ?
       WHERE coach_id = ? AND journey_date = ? AND seat_number IN (${placeholders})`
    );
    updateStmt.run(params.sessionId, holdExpiresAt, params.coachId, params.journeyDate, ...params.seatNumbers);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    holdExpiresAt,
    seats: getCoachSeats(db, params.trainId, params.coachId, params.journeyDate, now),
  };
}

export function releaseSeats(
  db: DatabaseSync,
  params: {
    sessionId: string;
    trainId: string;
    coachId: string;
    journeyDate: string;
    seatNumbers?: number[];
  }
): number {
  if (params.seatNumbers && params.seatNumbers.length > 0) {
    const placeholders = params.seatNumbers.map(() => '?').join(',');
    const res = db
      .prepare(
        `UPDATE seats
         SET status = CASE WHEN status = 'HELD' THEN 'AVAILABLE' ELSE status END,
             held_by_session = NULL,
             hold_expires_at = NULL
         WHERE coach_id = ? AND journey_date = ? AND held_by_session = ? AND seat_number IN (${placeholders})`
      )
      .run(params.coachId, params.journeyDate, params.sessionId, ...params.seatNumbers);
    return Number(res.changes ?? 0);
  }

  const res = db
    .prepare(
      `UPDATE seats
       SET status = CASE WHEN status = 'HELD' THEN 'AVAILABLE' ELSE status END,
           held_by_session = NULL,
           hold_expires_at = NULL
       WHERE coach_id = ? AND journey_date = ? AND held_by_session = ?`
    )
    .run(params.coachId, params.journeyDate, params.sessionId);
  return Number(res.changes ?? 0);
}

function generateDemoPnr(): string {
  const digits = Math.floor(10000000 + Math.random() * 89999999);
  return `DM${digits}`;
}

export function createNotification(
  db: DatabaseSync,
  input: {
    userId: string | null;
    sessionId: string | null;
    type: NotificationItem['type'];
    titleEn: string;
    titleTe: string;
    messageEn: string;
    messageTe: string;
    nowMs?: number;
  }
): void {
  const id = `NTF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  db.prepare(
    `INSERT INTO notifications (
      id, user_id, session_id, type, title_en, title_te, message_en, message_te, is_simulated, read, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`
  ).run(
    id,
    input.userId,
    input.sessionId,
    input.type,
    input.titleEn,
    input.titleTe,
    input.messageEn,
    input.messageTe,
    input.nowMs ?? Date.now()
  );
}

export function checkoutDemoBooking(
  db: DatabaseSync,
  params: {
    userId: string | null;
    sessionId: string;
    trainId: string;
    coachId: string;
    fromCode: string;
    toCode: string;
    journeyDate: string;
    seatNumbers: number[];
    passengers: PassengerInput[];
    paymentMethod: PaymentMethod;
    outcome: 'SUCCESS' | 'PENDING' | 'FAILED';
    existingPnr?: string;
    nowMs?: number;
  }
): { booking: BookingRecord; message: string } {
  const now = params.nowMs ?? Date.now();
  releaseExpiredHolds(db, now);

  if (!params.passengers || params.passengers.length !== params.seatNumbers.length) {
    throw new Error('Passenger details count must match selected seats.');
  }
  for (const p of params.passengers) {
    const ageNum = Number(p.age);
    if (!p.fullName.trim() || !Number.isFinite(ageNum) || ageNum < 1 || ageNum > 115) {
      throw new Error(`Invalid passenger details for seat ${p.seatNumber}.`);
    }
  }

  const train = db
    .prepare('SELECT id, train_number, name_en, name_te, stops_json FROM trains WHERE id = ?')
    .get(params.trainId) as
    | {
        id: string;
        train_number: string;
        name_en: string;
        name_te: string;
        stops_json: string;
      }
    | undefined;
  const coach = db
    .prepare('SELECT id, coach_code, coach_type FROM coaches WHERE id = ? AND train_id = ?')
    .get(params.coachId, params.trainId) as
    | { id: string; coach_code: string; coach_type: CoachType }
    | undefined;

  if (!train || !coach) {
    throw new Error('Train or coach not found.');
  }

  const stops = JSON.parse(train.stops_json) as TrainStop[];
  const fromStop = stops.find((s) => s.stationCode === params.fromCode);
  const toStop = stops.find((s) => s.stationCode === params.toCode);
  if (!fromStop || !toStop) {
    throw new Error('Invalid route stations for selected train.');
  }

  const stations = new Map(listStations(db).map((s) => [s.code, s]));
  const fromStation = stations.get(params.fromCode);
  const toStation = stations.get(params.toCode);
  const distanceKm = Math.max(60, toStop.distanceKm - fromStop.distanceKm);
  const pricingRules = getPricingRulesMap(db);
  const fare = calculateDemoFare(coach.coach_type, distanceKm, params.seatNumbers.length, pricingRules);

  const placeholders = params.seatNumbers.map(() => '?').join(',');
  let bookingRecord!: BookingRecord;

  db.exec('BEGIN IMMEDIATE');
  try {
    const seatRows = db
      .prepare(
        `SELECT seat_number, status, held_by_session, hold_expires_at
         FROM seats
         WHERE coach_id = ? AND journey_date = ? AND seat_number IN (${placeholders})`
      )
      .all(params.coachId, params.journeyDate, ...params.seatNumbers) as Array<{
      seat_number: number;
      status: string;
      held_by_session: string | null;
      hold_expires_at: number | null;
    }>;

    if (seatRows.length !== params.seatNumbers.length) {
      throw new Error('Selected seats not found.');
    }

    for (const s of seatRows) {
      if (s.status === 'BOOKED') {
        const err = new Error(`Seat ${s.seat_number} is already booked.`) as Error & { statusCode?: number };
        err.statusCode = 409;
        throw err;
      }
      if (s.status === 'HELD' && s.held_by_session !== params.sessionId) {
        const err = new Error(`Seat ${s.seat_number} is currently held by another customer.`) as Error & {
          statusCode?: number;
        };
        err.statusCode = 409;
        throw err;
      }
    }

    const hasWaitlistSeat = seatRows.some((s) => s.status === 'WAITING_LIST');
    const holdExpiry =
      seatRows[0]?.hold_expires_at && seatRows[0].hold_expires_at > now
        ? seatRows[0].hold_expires_at
        : now + HOLD_DURATION_MS;

    const pnr = params.existingPnr ?? generateDemoPnr();
    let bookingStatus: BookingStatus = 'CONFIRMED';
    let paymentStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'SUCCESS';

    if (params.outcome === 'FAILED') {
      bookingStatus = 'PAYMENT_FAILED';
      paymentStatus = 'FAILED';
      // Keep temporary hold active until expiry so user can retry!
      db.prepare(
        `UPDATE seats
         SET status = CASE WHEN status = 'WAITING_LIST' THEN 'WAITING_LIST' ELSE 'HELD' END,
             held_by_session = ?,
             hold_expires_at = ?
         WHERE coach_id = ? AND journey_date = ? AND seat_number IN (${placeholders})`
      ).run(params.sessionId, holdExpiry, params.coachId, params.journeyDate, ...params.seatNumbers);
    } else if (params.outcome === 'PENDING') {
      bookingStatus = 'PAYMENT_PENDING';
      paymentStatus = 'PENDING';
      db.prepare(
        `UPDATE seats
         SET status = CASE WHEN status = 'WAITING_LIST' THEN 'WAITING_LIST' ELSE 'HELD' END,
             held_by_session = ?,
             hold_expires_at = ?
         WHERE coach_id = ? AND journey_date = ? AND seat_number IN (${placeholders})`
      ).run(params.sessionId, holdExpiry, params.coachId, params.journeyDate, ...params.seatNumbers);
    } else {
      bookingStatus = hasWaitlistSeat ? 'WL' : 'CONFIRMED';
      paymentStatus = 'SUCCESS';
      db.prepare(
        `UPDATE seats
         SET status = CASE WHEN status = 'WAITING_LIST' THEN 'WAITING_LIST' ELSE 'BOOKED' END,
             held_by_session = NULL,
             hold_expires_at = NULL,
             booked_pnr = ?
         WHERE coach_id = ? AND journey_date = ? AND seat_number IN (${placeholders})`
      ).run(pnr, params.coachId, params.journeyDate, ...params.seatNumbers);
    }

    const depTime = fromStop.departureTime ?? fromStop.arrivalTime ?? '00:00';
    const arrTime = toStop.arrivalTime ?? toStop.departureTime ?? '00:00';

    db.prepare(
      `INSERT OR REPLACE INTO bookings (
        pnr, user_id, session_id, train_id, train_number, train_name_en, train_name_te,
        from_code, from_name_en, to_code, to_name_en, departure_time, arrival_time, journey_date,
        coach_id, coach_code, coach_type, seat_numbers_json, passengers_json, status,
        payment_method, payment_status, fare_per_seat, total_fare, hold_expires_at,
        refund_status, refund_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NOT_APPLICABLE', 0, ?, ?)`
    ).run(
      pnr,
      params.userId,
      params.sessionId,
      train.id,
      train.train_number,
      train.name_en,
      train.name_te,
      params.fromCode,
      fromStation?.nameEn ?? params.fromCode,
      params.toCode,
      toStation?.nameEn ?? params.toCode,
      depTime,
      arrTime,
      params.journeyDate,
      coach.id,
      coach.coach_code,
      coach.coach_type,
      JSON.stringify(params.seatNumbers),
      JSON.stringify(params.passengers),
      bookingStatus,
      params.paymentMethod,
      paymentStatus,
      fare.farePerSeat,
      fare.totalFare,
      params.outcome === 'SUCCESS' ? null : holdExpiry,
      now,
      now
    );

    if (params.outcome === 'SUCCESS') {
      createNotification(db, {
        userId: params.userId,
        sessionId: params.sessionId,
        type: 'BOOKING_CONFIRMED',
        titleEn: `Demo Booking ${bookingStatus}: PNR ${pnr}`,
        titleTe: `డెమో బుకింగ్ ${bookingStatus}: PNR ${pnr}`,
        messageEn: `Simulated ${train.train_number} ${train.name_en} (${coach.coach_code}, Seats ${params.seatNumbers.join(', ')}) booked via ${params.paymentMethod}.`,
        messageTe: `${train.train_number} ${train.name_te} (${coach.coach_code}, సీట్లు ${params.seatNumbers.join(', ')}) డెమో బుకింగ్ పూర్తయింది.`,
        nowMs: now,
      });
    } else if (params.outcome === 'FAILED') {
      createNotification(db, {
        userId: params.userId,
        sessionId: params.sessionId,
        type: 'PAYMENT_FAILED',
        titleEn: `Demo Payment Failed: PNR ${pnr}`,
        titleTe: `డెమో చెల్లింపు విఫలం: PNR ${pnr}`,
        messageEn: `Simulated payment failed. Seats ${params.seatNumbers.join(', ')} remain held until the 15-minute timer expires.`,
        messageTe: `నమూనా చెల్లింపు విఫలమైంది. 15 నిమిషాల వరకు సీట్లు హోల్డ్‌లో ఉంటాయి.`,
        nowMs: now,
      });
    }

    db.exec('COMMIT');

    bookingRecord = getBookingByPnr(db, pnr)!;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    booking: bookingRecord,
    message:
      params.outcome === 'SUCCESS'
        ? 'Demo booking confirmed'
        : params.outcome === 'PENDING'
        ? 'Demo payment pending'
        : 'Demo payment failed',
  };
}

function mapBookingRow(r: Record<string, unknown>): BookingRecord {
  return {
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
    seatNumbers: JSON.parse(String(r.seat_numbers_json)) as number[],
    passengers: JSON.parse(String(r.passengers_json)) as PassengerInput[],
    status: r.status as BookingStatus,
    paymentMethod: (r.payment_method as PaymentMethod | null) ?? null,
    paymentStatus: r.payment_status as BookingRecord['paymentStatus'],
    farePerSeat: Number(r.fare_per_seat),
    totalFare: Number(r.total_fare),
    holdExpiresAt: r.hold_expires_at !== null ? Number(r.hold_expires_at) : null,
    refundStatus: r.refund_status as BookingRecord['refundStatus'],
    refundAmount: Number(r.refund_amount),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export function getBookingByPnr(db: DatabaseSync, pnr: string): BookingRecord | null {
  const row = db.prepare('SELECT * FROM bookings WHERE pnr = ?').get(pnr) as
    | Record<string, unknown>
    | undefined;
  return row ? mapBookingRow(row) : null;
}

export function listBookings(
  db: DatabaseSync,
  userId: string | null,
  sessionId: string
): BookingRecord[] {
  const rows = userId
    ? (db
        .prepare(
          `SELECT * FROM bookings
           WHERE user_id = ? OR session_id = ? OR session_id = 'DEMO-GLOBAL'
           ORDER BY created_at DESC`
        )
        .all(userId, sessionId) as Array<Record<string, unknown>>)
    : (db
        .prepare(
          `SELECT * FROM bookings
           WHERE session_id = ? OR session_id = 'DEMO-GLOBAL'
           ORDER BY created_at DESC`
        )
        .all(sessionId) as Array<Record<string, unknown>>);

  return rows.map(mapBookingRow);
}

export function cancelBooking(
  db: DatabaseSync,
  pnr: string,
  userId: string | null,
  sessionId: string,
  nowMs: number = Date.now()
): BookingRecord {
  const existing = getBookingByPnr(db, pnr);
  if (!existing) {
    throw new Error('Booking not found.');
  }
  if (existing.status === 'CANCELLED') {
    return existing;
  }

  const refund =
    existing.paymentStatus === 'SUCCESS'
      ? calculateDemoRefund(existing.totalFare, existing.coachType)
      : { cancellationFee: 0, refundAmount: 0 };
  const refundStatus = existing.paymentStatus === 'SUCCESS' ? 'INITIATED' : 'NOT_APPLICABLE';

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `UPDATE bookings
       SET status = 'CANCELLED',
           refund_status = ?,
           refund_amount = ?,
           updated_at = ?
       WHERE pnr = ?`
    ).run(refundStatus, refund.refundAmount, nowMs, pnr);

    const placeholders = existing.seatNumbers.map(() => '?').join(',');
    db.prepare(
      `UPDATE seats
       SET status = 'AVAILABLE',
           held_by_session = NULL,
           hold_expires_at = NULL,
           booked_pnr = NULL
       WHERE coach_id = ? AND journey_date = ? AND seat_number IN (${placeholders})`
    ).run(existing.coachId, existing.journeyDate, ...existing.seatNumbers);

    createNotification(db, {
      userId,
      sessionId,
      type: 'TICKET_CANCELLED',
      titleEn: `Demo Ticket Cancelled: PNR ${pnr}`,
      titleTe: `డెమో టికెట్ రద్దు చేయబడింది: PNR ${pnr}`,
      messageEn: `Seats ${existing.seatNumbers.join(', ')} in ${existing.coachCode} released. Simulated refund: INR ${refund.refundAmount}.`,
      messageTe: `${existing.coachCode} లో సీట్లు ${existing.seatNumbers.join(', ')} విడుదలయ్యాయి. నమూనా రీఫండ్: ₹${refund.refundAmount}.`,
      nowMs,
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getBookingByPnr(db, pnr)!;
}

export function advanceRefundSimulation(
  db: DatabaseSync,
  pnr: string,
  userId: string | null,
  sessionId: string,
  nowMs: number = Date.now()
): BookingRecord {
  const existing = getBookingByPnr(db, pnr);
  if (!existing) throw new Error('Booking not found.');
  if (existing.status !== 'CANCELLED') throw new Error('Only cancelled bookings have refunds.');

  const nextStatus =
    existing.refundStatus === 'INITIATED'
      ? 'PROCESSING'
      : existing.refundStatus === 'PROCESSING'
      ? 'REFUNDED'
      : existing.refundStatus;

  db.prepare('UPDATE bookings SET refund_status = ?, updated_at = ? WHERE pnr = ?').run(
    nextStatus,
    nowMs,
    pnr
  );

  if (nextStatus !== existing.refundStatus) {
    createNotification(db, {
      userId,
      sessionId,
      type: 'REFUND_UPDATE',
      titleEn: `Simulated Refund ${nextStatus}: PNR ${pnr}`,
      titleTe: `నమూనా రీఫండ్ ${nextStatus}: PNR ${pnr}`,
      messageEn: `Demo refund of INR ${existing.refundAmount} updated to ${nextStatus}.`,
      messageTe: `₹${existing.refundAmount} నమూనా రీఫండ్ స్థితి ${nextStatus} కు మారింది.`,
      nowMs,
    });
  }

  return getBookingByPnr(db, pnr)!;
}

export function listNotifications(
  db: DatabaseSync,
  userId: string | null,
  sessionId: string
): NotificationItem[] {
  const rows = userId
    ? (db
        .prepare(
          `SELECT * FROM notifications
           WHERE user_id = ? OR session_id = ? OR session_id = 'DEMO-GLOBAL'
           ORDER BY created_at DESC LIMIT 40`
        )
        .all(userId, sessionId) as Array<Record<string, unknown>>)
    : (db
        .prepare(
          `SELECT * FROM notifications
           WHERE session_id = ? OR session_id = 'DEMO-GLOBAL'
           ORDER BY created_at DESC LIMIT 40`
        )
        .all(sessionId) as Array<Record<string, unknown>>);

  return rows.map((r) => ({
    id: String(r.id),
    type: r.type as NotificationItem['type'],
    titleEn: String(r.title_en),
    titleTe: String(r.title_te),
    messageEn: String(r.message_en),
    messageTe: String(r.message_te),
    isSimulated: Boolean(r.is_simulated),
    read: Boolean(r.read),
    createdAt: Number(r.created_at),
  }));
}

export function markAllNotificationsRead(
  db: DatabaseSync,
  userId: string | null,
  sessionId: string
): void {
  if (userId) {
    db.prepare(
      `UPDATE notifications SET read = 1 WHERE user_id = ? OR session_id = ? OR session_id = 'DEMO-GLOBAL'`
    ).run(userId, sessionId);
  } else {
    db.prepare(
      `UPDATE notifications SET read = 1 WHERE session_id = ? OR session_id = 'DEMO-GLOBAL'`
    ).run(sessionId);
  }
}

export function requestDemoOtp(db: DatabaseSync, mobile: string, nowMs: number = Date.now()): {
  mobile: string;
  demoOtpHint: string;
  expiresInSeconds: number;
} {
  const clean = mobile.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(clean)) {
    throw new Error('Enter a valid 10-digit Indian mobile number starting with 6–9.');
  }
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = nowMs + 5 * 60 * 1000;
  db.prepare('INSERT OR REPLACE INTO otp_challenges (mobile, otp_code, expires_at) VALUES (?, ?, ?)').run(
    clean,
    otp,
    expiresAt
  );
  return {
    mobile: clean,
    demoOtpHint: otp,
    expiresInSeconds: 300,
  };
}

export function verifyDemoOtp(
  db: DatabaseSync,
  mobile: string,
  otp: string,
  nowMs: number = Date.now()
): { token: string; user: CustomerUser } {
  const clean = mobile.replace(/\D/g, '');
  const challenge = db
    .prepare('SELECT mobile, otp_code, expires_at FROM otp_challenges WHERE mobile = ?')
    .get(clean) as { mobile: string; otp_code: string; expires_at: number } | undefined;

  if (!challenge || challenge.otp_code !== otp.trim() || challenge.expires_at < nowMs) {
    throw new Error('Invalid or expired Demo OTP. Request a fresh Demo OTP.');
  }

  db.prepare('DELETE FROM otp_challenges WHERE mobile = ?').run(clean);

  let userRow = db
    .prepare('SELECT id, mobile, name, email, age, gender FROM users WHERE mobile = ?')
    .get(clean) as
    | {
        id: string;
        mobile: string;
        name: string;
        email: string;
        age: number | null;
        gender: CustomerUser['gender'];
      }
    | undefined;

  if (!userRow) {
    const newId = `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    db.prepare(
      'INSERT INTO users (id, mobile, name, email, age, gender, created_at) VALUES (?, ?, ?, ?, NULL, NULL, ?)'
    ).run(newId, clean, `Traveller ${clean.slice(-4)}`, '', nowMs);
    userRow = {
      id: newId,
      mobile: clean,
      name: `Traveller ${clean.slice(-4)}`,
      email: '',
      age: null,
      gender: null,
    };
  }

  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, mobile, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(
    token,
    userRow.id,
    userRow.mobile,
    nowMs,
    nowMs + 7 * 86400_000
  );

  return {
    token,
    user: {
      id: userRow.id,
      mobile: userRow.mobile,
      name: userRow.name,
      email: userRow.email,
      age: userRow.age,
      gender: userRow.gender,
    },
  };
}

export function getUserByToken(
  db: DatabaseSync,
  token: string | null | undefined,
  nowMs: number = Date.now()
): CustomerUser | null {
  if (!token) return null;
  const session = db
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?')
    .get(token) as { user_id: string; expires_at: number } | undefined;
  if (!session || session.expires_at < nowMs) return null;

  const userRow = db
    .prepare('SELECT id, mobile, name, email, age, gender FROM users WHERE id = ?')
    .get(session.user_id) as
    | {
        id: string;
        mobile: string;
        name: string;
        email: string;
        age: number | null;
        gender: CustomerUser['gender'];
      }
    | undefined;

  return userRow ?? null;
}

export function updateUserProfile(
  db: DatabaseSync,
  userId: string,
  updates: {
    name: string;
    email: string;
    age: number | null;
    gender: CustomerUser['gender'];
  }
): CustomerUser {
  if (!updates.name.trim()) {
    throw new Error('Customer name cannot be empty.');
  }
  db.prepare('UPDATE users SET name = ?, email = ?, age = ?, gender = ? WHERE id = ?').run(
    updates.name.trim(),
    updates.email.trim(),
    updates.age,
    updates.gender,
    userId
  );
  const row = db
    .prepare('SELECT id, mobile, name, email, age, gender FROM users WHERE id = ?')
    .get(userId) as unknown as CustomerUser;
  return row;
}
