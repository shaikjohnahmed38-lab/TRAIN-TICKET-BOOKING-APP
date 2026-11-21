import type { CoachType, PricingRule } from '../types/railway';

export const DEFAULT_PRICING_RULES: Record<CoachType, PricingRule> = {
  '1A': {
    coachType: '1A',
    labelEn: 'AC First Class (1A)',
    labelTe: 'ఏసీ ఫస్ట్ క్లాస్ (1A)',
    baseFare: 680,
    perKmRate: 3.1,
    reservationFee: 60,
    gstPercent: 5,
  },
  '2A': {
    coachType: '2A',
    labelEn: 'AC 2 Tier (2A)',
    labelTe: 'ఏసీ 2 టైర్ (2A)',
    baseFare: 420,
    perKmRate: 1.95,
    reservationFee: 50,
    gstPercent: 5,
  },
  '3A': {
    coachType: '3A',
    labelEn: 'AC 3 Tier (3A)',
    labelTe: 'ఏసీ 3 టైర్ (3A)',
    baseFare: 280,
    perKmRate: 1.35,
    reservationFee: 40,
    gstPercent: 5,
  },
  SL: {
    coachType: 'SL',
    labelEn: 'Sleeper (SL)',
    labelTe: 'స్లీపర్ (SL)',
    baseFare: 120,
    perKmRate: 0.55,
    reservationFee: 20,
    gstPercent: 0,
  },
  GS: {
    coachType: 'GS',
    labelEn: 'General (GS)',
    labelTe: 'జనరల్ (GS)',
    baseFare: 60,
    perKmRate: 0.3,
    reservationFee: 10,
    gstPercent: 0,
  },
};

export interface FareBreakdown {
  baseTicketFare: number;
  reservationFee: number;
  gstAmount: number;
  farePerSeat: number;
  passengerCount: number;
  totalFare: number;
}

export function calculateDemoFare(
  coachType: CoachType,
  distanceKm: number,
  passengerCount: number,
  pricingRules: Record<CoachType, PricingRule> = DEFAULT_PRICING_RULES
): FareBreakdown {
  const rule = pricingRules[coachType] ?? DEFAULT_PRICING_RULES[coachType];
  const safeDistance = Math.max(50, distanceKm);
  const safePassengers = Math.max(0, passengerCount);

  const rawBase = Math.round((rule.baseFare + safeDistance * rule.perKmRate) / 5) * 5;
  const reservationFee = rule.reservationFee;
  const subtotal = rawBase + reservationFee;
  const gstAmount = Math.round((subtotal * rule.gstPercent) / 100);
  const farePerSeat = subtotal + gstAmount;

  return {
    baseTicketFare: rawBase,
    reservationFee,
    gstAmount,
    farePerSeat,
    passengerCount: safePassengers,
    totalFare: farePerSeat * safePassengers,
  };
}

export function calculateDemoRefund(totalFare: number, coachType: CoachType): {
  cancellationFee: number;
  refundAmount: number;
} {
  if (totalFare <= 0) {
    return { cancellationFee: 0, refundAmount: 0 };
  }
  const flatFeeMap: Record<CoachType, number> = {
    '1A': 240,
    '2A': 200,
    '3A': 180,
    SL: 120,
    GS: 30,
  };
  const fee = Math.min(totalFare, flatFeeMap[coachType] ?? 120);
  return {
    cancellationFee: fee,
    refundAmount: Math.max(0, totalFare - fee),
  };
}

export function formatHoldCountdown(holdExpiresAt: number | null, nowMs: number): {
  remainingSeconds: number;
  formatted: string;
  isExpired: boolean;
} {
  if (!holdExpiresAt) {
    return { remainingSeconds: 0, formatted: '00:00', isExpired: true };
  }
  const diffMs = Math.max(0, holdExpiresAt - nowMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return {
    remainingSeconds: totalSeconds,
    formatted: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    isExpired: diffMs <= 0,
  };
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}
