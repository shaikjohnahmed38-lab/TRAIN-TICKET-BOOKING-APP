import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCoachSeatDefinitions, groupSeatsIntoBays } from './coachLayouts';
import type { SeatRecord } from '../types/railway';

test('generates correct seat counts for every supported coach template', () => {
  assert.equal(generateCoachSeatDefinitions('SL').length, 72);
  assert.equal(generateCoachSeatDefinitions('3A').length, 64);
  assert.equal(generateCoachSeatDefinitions('2A').length, 48);
  assert.equal(generateCoachSeatDefinitions('1A').length, 18);
  assert.equal(generateCoachSeatDefinitions('GS').length, 60);
});

test('groups 2A berths into 4 main + 2 side per bay without middle berths', () => {
  const defs = generateCoachSeatDefinitions('2A');
  assert.equal(defs.some((d) => d.berthType === 'MB'), false);

  const seats: SeatRecord[] = defs.map((d) => ({
    id: `seat-${d.seatNumber}`,
    coachId: 'coach-a1',
    trainId: 'train-1',
    journeyDate: '2026-11-25',
    seatNumber: d.seatNumber,
    berthType: d.berthType,
    bayNumber: d.bayNumber,
    status: 'AVAILABLE',
    heldBySession: null,
    holdExpiresAt: null,
    bookedPnr: null,
  }));

  const bays = groupSeatsIntoBays('2A', seats);
  assert.equal(bays.length, 8);
  assert.deepEqual(bays[0].mainLeft, [1, 2]);
  assert.deepEqual(bays[0].mainRight, [3, 4]);
  assert.deepEqual(bays[0].sideSeats, [5, 6]);
});

test('groups 1A into cabins and coupes with no side berths', () => {
  const defs = generateCoachSeatDefinitions('1A');
  const seats: SeatRecord[] = defs.map((d) => ({
    id: `seat-${d.seatNumber}`,
    coachId: 'coach-h1',
    trainId: 'train-1',
    journeyDate: '2026-11-25',
    seatNumber: d.seatNumber,
    berthType: d.berthType,
    bayNumber: d.bayNumber,
    status: 'AVAILABLE',
    heldBySession: null,
    holdExpiresAt: null,
    bookedPnr: null,
  }));

  const bays = groupSeatsIntoBays('1A', seats);
  assert.equal(bays.length, 5);
  assert.equal(bays[0].bayLabel, 'Cabin A');
  assert.equal(bays[1].bayLabel, 'Coupe B');
  assert.equal(bays[0].sideSeats.length, 0);
});
