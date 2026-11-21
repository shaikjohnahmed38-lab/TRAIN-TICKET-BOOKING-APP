import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDemoFare,
  calculateDemoRefund,
  formatDuration,
  formatHoldCountdown,
} from './fareCalculator';

test('calculates distinct fares across coach classes for the same distance', () => {
  const sl = calculateDemoFare('SL', 600, 2);
  const ac3 = calculateDemoFare('3A', 600, 2);
  const ac2 = calculateDemoFare('2A', 600, 2);
  const ac1 = calculateDemoFare('1A', 600, 2);
  const gs = calculateDemoFare('GS', 600, 2);

  assert.ok(gs.farePerSeat < sl.farePerSeat);
  assert.ok(sl.farePerSeat < ac3.farePerSeat);
  assert.ok(ac3.farePerSeat < ac2.farePerSeat);
  assert.ok(ac2.farePerSeat < ac1.farePerSeat);
  assert.equal(ac3.totalFare, ac3.farePerSeat * 2);
});

test('calculates refund with coach-specific cancellation fee', () => {
  const res = calculateDemoRefund(1200, '3A');
  assert.equal(res.cancellationFee, 180);
  assert.equal(res.refundAmount, 1020);
});

test('formats 15-minute hold countdown and detects expiry accurately', () => {
  const now = 1_700_000_000_000;
  const active = formatHoldCountdown(now + 15 * 60 * 1000, now);
  assert.equal(active.formatted, '15:00');
  assert.equal(active.isExpired, false);

  const expired = formatHoldCountdown(now - 5000, now);
  assert.equal(expired.formatted, '00:00');
  assert.equal(expired.isExpired, true);
});

test('formats train duration in hours and minutes', () => {
  assert.equal(formatDuration(515), '8h 35m');
  assert.equal(formatDuration(125), '2h 05m');
});
