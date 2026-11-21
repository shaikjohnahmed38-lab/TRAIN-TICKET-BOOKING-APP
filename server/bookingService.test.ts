import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from './db';
import {
  cancelBooking,
  checkoutDemoBooking,
  getCoachSeats,
  HOLD_DURATION_MS,
  holdSeats,
  releaseExpiredHolds,
  searchTrains,
} from './bookingService';

test('prevents two sessions from holding or booking the same seat simultaneously', () => {
  const db = createDatabase(':memory:');
  const journeyDate = '2026-12-01';
  const trains = searchTrains(db, {
    fromCode: 'SC',
    toCode: 'VSKP',
    journeyDate,
  });
  assert.ok(trains.length > 0);
  const train = trains[0];
  const coach = train.coaches.find((c) => c.coachType === '3A') ?? train.coaches[0];
  const seats = getCoachSeats(db, train.id, coach.id, journeyDate);
  const available = seats.find((s) => s.status === 'AVAILABLE');
  assert.ok(available);

  const now = 1_700_000_000_000;
  holdSeats(db, {
    sessionId: 'sess-alpha',
    trainId: train.id,
    coachId: coach.id,
    journeyDate,
    seatNumbers: [available.seatNumber],
    nowMs: now,
  });

  assert.throws(
    () =>
      holdSeats(db, {
        sessionId: 'sess-beta',
        trainId: train.id,
        coachId: coach.id,
        journeyDate,
        seatNumbers: [available.seatNumber],
        nowMs: now + 60_000,
      }),
    /currently booked or held/
  );
});

test('releases held seats automatically after 15 minutes and handles failed/confirmed payment + cancellation', () => {
  const db = createDatabase(':memory:');
  const journeyDate = '2026-12-02';
  const trains = searchTrains(db, { fromCode: 'SC', toCode: 'TPTY', journeyDate });
  const train = trains[0];
  const coach = train.coaches[0];
  const seats = getCoachSeats(db, train.id, coach.id, journeyDate);
  const freeSeats = seats.filter((s) => s.status === 'AVAILABLE').slice(0, 2);
  assert.equal(freeSeats.length, 2);

  const t0 = 1_700_000_000_000;
  holdSeats(db, {
    sessionId: 'sess-user-1',
    trainId: train.id,
    coachId: coach.id,
    journeyDate,
    seatNumbers: [freeSeats[0].seatNumber],
    nowMs: t0,
  });

  // Expiry sweep after 15m + 1s releases the seat
  const released = releaseExpiredHolds(db, t0 + HOLD_DURATION_MS + 1000);
  assert.equal(released, 1);

  // Re-hold two seats, fail payment (seats remain held), then succeed, then cancel
  const t1 = t0 + HOLD_DURATION_MS + 5000;
  holdSeats(db, {
    sessionId: 'sess-user-1',
    trainId: train.id,
    coachId: coach.id,
    journeyDate,
    seatNumbers: freeSeats.map((s) => s.seatNumber),
    nowMs: t1,
  });

  const failed = checkoutDemoBooking(db, {
    userId: null,
    sessionId: 'sess-user-1',
    trainId: train.id,
    coachId: coach.id,
    fromCode: 'SC',
    toCode: 'TPTY',
    journeyDate,
    seatNumbers: freeSeats.map((s) => s.seatNumber),
    passengers: freeSeats.map((s, i) => ({
      seatNumber: s.seatNumber,
      berthType: s.berthType,
      fullName: `Passenger ${i + 1}`,
      age: '28',
      gender: 'Male',
    })),
    paymentMethod: 'UPI',
    outcome: 'FAILED',
    nowMs: t1 + 1000,
  });
  assert.equal(failed.booking.status, 'PAYMENT_FAILED');

  const confirmed = checkoutDemoBooking(db, {
    userId: null,
    sessionId: 'sess-user-1',
    trainId: train.id,
    coachId: coach.id,
    fromCode: 'SC',
    toCode: 'TPTY',
    journeyDate,
    seatNumbers: freeSeats.map((s) => s.seatNumber),
    passengers: freeSeats.map((s, i) => ({
      seatNumber: s.seatNumber,
      berthType: s.berthType,
      fullName: `Passenger ${i + 1}`,
      age: '28',
      gender: 'Male',
    })),
    paymentMethod: 'GPAY',
    outcome: 'SUCCESS',
    existingPnr: failed.booking.pnr,
    nowMs: t1 + 5000,
  });
  assert.equal(confirmed.booking.status, 'CONFIRMED');

  const seatsAfterBook = getCoachSeats(db, train.id, coach.id, journeyDate, t1 + 6000);
  for (const fs of freeSeats) {
    const updated = seatsAfterBook.find((s) => s.seatNumber === fs.seatNumber);
    assert.equal(updated?.status, 'BOOKED');
  }

  const cancelled = cancelBooking(db, confirmed.booking.pnr, null, 'sess-user-1', t1 + 10000);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.refundStatus, 'INITIATED');

  const seatsAfterCancel = getCoachSeats(db, train.id, coach.id, journeyDate, t1 + 11000);
  for (const fs of freeSeats) {
    const updated = seatsAfterCancel.find((s) => s.seatNumber === fs.seatNumber);
    assert.equal(updated?.status, 'AVAILABLE');
  }
});
