import type { BerthType, CoachType, SeatRecord } from '../types/railway';

export interface CoachBaySlot {
  seatNumber: number;
  berthType: BerthType;
  position: 'main-left' | 'main-right' | 'side' | 'bench-top' | 'bench-bottom';
  rowIndex: number;
  colIndex: number;
}

export interface CoachBayLayout {
  bayNumber: number;
  bayLabel: string;
  mainLeft: number[];
  mainRight: number[];
  sideSeats: number[];
}

export interface CoachTemplateMeta {
  coachType: CoachType;
  titleEn: string;
  titleTe: string;
  totalSeats: number;
  baysCount: number;
  aisleLabelEn: string;
  aisleLabelTe: string;
  layoutKind: '3-tier' | '2-tier' | '1a-cabin' | 'general-bench';
}

export const COACH_TEMPLATES: Record<CoachType, CoachTemplateMeta> = {
  SL: {
    coachType: 'SL',
    titleEn: 'Sleeper Class (SL)',
    titleTe: 'స్లీపర్ క్లాస్ (SL)',
    totalSeats: 72,
    baysCount: 9,
    aisleLabelEn: 'WALKING AISLE',
    aisleLabelTe: 'నడిచే దారి (AISLE)',
    layoutKind: '3-tier',
  },
  '3A': {
    coachType: '3A',
    titleEn: 'AC 3 Tier (3A)',
    titleTe: 'ఏసీ 3 టైర్ (3A)',
    totalSeats: 64,
    baysCount: 8,
    aisleLabelEn: 'AC WALKING AISLE',
    aisleLabelTe: 'ఏసీ నడిచే దారి',
    layoutKind: '3-tier',
  },
  '2A': {
    coachType: '2A',
    titleEn: 'AC 2 Tier (2A)',
    titleTe: 'ఏసీ 2 టైర్ (2A)',
    totalSeats: 48,
    baysCount: 8,
    aisleLabelEn: 'CURTAINED AISLE',
    aisleLabelTe: 'నడిచే దారి (2A)',
    layoutKind: '2-tier',
  },
  '1A': {
    coachType: '1A',
    titleEn: 'AC First Class (1A)',
    titleTe: 'ఏసీ ఫస్ట్ క్లాస్ (1A)',
    totalSeats: 18,
    baysCount: 5,
    aisleLabelEn: 'PRIVATE CORRIDOR',
    aisleLabelTe: 'ప్రైవేట్ కారిడార్',
    layoutKind: '1a-cabin',
  },
  GS: {
    coachType: 'GS',
    titleEn: 'General Sitting (GS)',
    titleTe: 'జనరల్ సిట్టింగ్ (GS)',
    totalSeats: 60,
    baysCount: 6,
    aisleLabelEn: 'CENTRAL WALKWAY',
    aisleLabelTe: 'మధ్య నడిచే దారి',
    layoutKind: 'general-bench',
  },
};

export interface SeatSeedDefinition {
  seatNumber: number;
  berthType: BerthType;
  bayNumber: number;
}

export function generateCoachSeatDefinitions(coachType: CoachType): SeatSeedDefinition[] {
  const defs: SeatSeedDefinition[] = [];

  if (coachType === 'SL' || coachType === '3A') {
    const bays = coachType === 'SL' ? 9 : 8;
    const mainBerths: BerthType[] = ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'];
    for (let bay = 1; bay <= bays; bay++) {
      const base = (bay - 1) * 8;
      for (let i = 0; i < 8; i++) {
        defs.push({
          seatNumber: base + i + 1,
          berthType: mainBerths[i],
          bayNumber: bay,
        });
      }
    }
    return defs;
  }

  if (coachType === '2A') {
    const bays = 8;
    const berths: BerthType[] = ['LB', 'UB', 'LB', 'UB', 'SL', 'SU'];
    for (let bay = 1; bay <= bays; bay++) {
      const base = (bay - 1) * 6;
      for (let i = 0; i < 6; i++) {
        defs.push({
          seatNumber: base + i + 1,
          berthType: berths[i],
          bayNumber: bay,
        });
      }
    }
    return defs;
  }

  if (coachType === '1A') {
    // Cabins A (4), B (2), C (4), D (4), E (4) = 18 berths
    const cabinSizes = [4, 2, 4, 4, 4];
    let seatNum = 1;
    cabinSizes.forEach((size, idx) => {
      const bay = idx + 1;
      for (let i = 0; i < size; i++) {
        defs.push({
          seatNumber: seatNum++,
          berthType: i % 2 === 0 ? 'LB' : 'UB',
          bayNumber: bay,
        });
      }
    });
    return defs;
  }

  // GS (General Bench): 6 bays x 10 seats (3+2 facing benches) = 60 seats
  for (let bay = 1; bay <= 6; bay++) {
    const base = (bay - 1) * 10;
    const benchTypes: BerthType[] = ['WS', 'MS', 'AS', 'WS', 'AS', 'WS', 'MS', 'AS', 'WS', 'AS'];
    for (let i = 0; i < 10; i++) {
      defs.push({
        seatNumber: base + i + 1,
        berthType: benchTypes[i],
        bayNumber: bay,
      });
    }
  }
  return defs;
}

export function groupSeatsIntoBays(
  coachType: CoachType,
  seats: SeatRecord[]
): CoachBayLayout[] {
  const byBay = new Map<number, SeatRecord[]>();
  for (const seat of seats) {
    const list = byBay.get(seat.bayNumber) ?? [];
    list.push(seat);
    byBay.set(seat.bayNumber, list);
  }

  const bayNumbers = Array.from(byBay.keys()).sort((a, b) => a - b);

  return bayNumbers.map((bayNumber) => {
    const baySeats = (byBay.get(bayNumber) ?? []).sort((a, b) => a.seatNumber - b.seatNumber);

    if (coachType === 'SL' || coachType === '3A') {
      return {
        bayNumber,
        bayLabel: `Bay ${bayNumber}`,
        mainLeft: baySeats.slice(0, 3).map((s) => s.seatNumber),
        mainRight: baySeats.slice(3, 6).map((s) => s.seatNumber),
        sideSeats: baySeats.slice(6, 8).map((s) => s.seatNumber),
      };
    }

    if (coachType === '2A') {
      return {
        bayNumber,
        bayLabel: `Bay ${bayNumber}`,
        mainLeft: baySeats.slice(0, 2).map((s) => s.seatNumber),
        mainRight: baySeats.slice(2, 4).map((s) => s.seatNumber),
        sideSeats: baySeats.slice(4, 6).map((s) => s.seatNumber),
      };
    }

    if (coachType === '1A') {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const isCoupe = baySeats.length === 2;
      const half = Math.ceil(baySeats.length / 2);
      return {
        bayNumber,
        bayLabel: `${isCoupe ? 'Coupe' : 'Cabin'} ${letters[bayNumber - 1] ?? bayNumber}`,
        mainLeft: baySeats.slice(0, half).map((s) => s.seatNumber),
        mainRight: baySeats.slice(half).map((s) => s.seatNumber),
        sideSeats: [],
      };
    }

    // GS: 3-seater top row (facing pairs) + 2-seater bottom row across central walkway
    return {
      bayNumber,
      bayLabel: `Zone ${bayNumber}`,
      mainLeft: baySeats.slice(0, 3).map((s) => s.seatNumber),
      mainRight: baySeats.slice(5, 8).map((s) => s.seatNumber),
      sideSeats: [...baySeats.slice(3, 5), ...baySeats.slice(8, 10)].map((s) => s.seatNumber),
    };
  });
}
