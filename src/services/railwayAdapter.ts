import type {
  BookingRecord,
  CoachType,
  CustomerUser,
  NotificationItem,
  PassengerInput,
  PaymentMethod,
  PricingRule,
  SeatRecord,
  Station,
  TrainSearchResult,
} from '../types/railway';

export interface RailwayProviderAdapter {
  readonly providerMode: 'DEMO_LOCAL_SQLITE' | 'OFFICIAL_RAILWAY_API';
  listStations(): Promise<Station[]>;
  searchTrains(params: {
    fromCode: string;
    toCode: string;
    journeyDate: string;
    timeWindow?: string;
  }): Promise<TrainSearchResult[]>;
  getCoachSeats(params: {
    trainId: string;
    coachId: string;
    journeyDate: string;
  }): Promise<SeatRecord[]>;
}

async function apiFetch<T>(
  url: string,
  options: RequestInit & { authToken?: string | null } = {}
): Promise<T> {
  const { authToken, headers, ...rest } = options;
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (authToken) {
    mergedHeaders.Authorization = `Bearer ${authToken}`;
  }
  const response = await fetch(url, {
    ...rest,
    headers: mergedHeaders,
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  return data as T;
}

export class DemoRailwayAdapter implements RailwayProviderAdapter {
  public readonly providerMode = 'DEMO_LOCAL_SQLITE' as const;

  async listStations(): Promise<Station[]> {
    return apiFetch<Station[]>('/api/stations');
  }

  async searchTrains(params: {
    fromCode: string;
    toCode: string;
    journeyDate: string;
    timeWindow?: string;
  }): Promise<TrainSearchResult[]> {
    const query = new URLSearchParams({
      from: params.fromCode,
      to: params.toCode,
      date: params.journeyDate,
    });
    if (params.timeWindow && params.timeWindow !== 'ALL') {
      query.set('timeWindow', params.timeWindow);
    }
    return apiFetch<TrainSearchResult[]>(`/api/trains/search?${query.toString()}`);
  }

  async getCoachSeats(params: {
    trainId: string;
    coachId: string;
    journeyDate: string;
  }): Promise<SeatRecord[]> {
    const query = new URLSearchParams({
      date: params.journeyDate,
    });
    return apiFetch<SeatRecord[]>(
      `/api/trains/${encodeURIComponent(params.trainId)}/coaches/${encodeURIComponent(
        params.coachId
      )}/seats?${query.toString()}`
    );
  }

  async holdSeats(params: {
    sessionId: string;
    trainId: string;
    coachId: string;
    journeyDate: string;
    seatNumbers: number[];
    allowWaitlist?: boolean;
  }): Promise<{ holdExpiresAt: number; seats: SeatRecord[] }> {
    return apiFetch('/api/holds', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async releaseHold(params: {
    sessionId: string;
    trainId: string;
    coachId: string;
    journeyDate: string;
    seatNumbers?: number[];
  }): Promise<{ releasedCount: number }> {
    return apiFetch('/api/holds/release', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async createBookingAndSimulatePayment(
    params: {
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
    },
    authToken: string | null
  ): Promise<{ booking: BookingRecord; message: string }> {
    return apiFetch('/api/bookings/checkout', {
      method: 'POST',
      authToken,
      body: JSON.stringify(params),
    });
  }

  async listBookings(
    params: { sessionId: string },
    authToken: string | null
  ): Promise<BookingRecord[]> {
    return apiFetch(`/api/bookings?sessionId=${encodeURIComponent(params.sessionId)}`, {
      authToken,
    });
  }

  async cancelBooking(
    pnr: string,
    sessionId: string,
    authToken: string | null
  ): Promise<BookingRecord> {
    return apiFetch(`/api/bookings/${encodeURIComponent(pnr)}/cancel`, {
      method: 'POST',
      authToken,
      body: JSON.stringify({ sessionId }),
    });
  }

  async advanceRefundSimulation(
    pnr: string,
    sessionId: string,
    authToken: string | null
  ): Promise<BookingRecord> {
    return apiFetch(`/api/bookings/${encodeURIComponent(pnr)}/refund-advance`, {
      method: 'POST',
      authToken,
      body: JSON.stringify({ sessionId }),
    });
  }

  async listNotifications(
    sessionId: string,
    authToken: string | null
  ): Promise<NotificationItem[]> {
    return apiFetch(`/api/notifications?sessionId=${encodeURIComponent(sessionId)}`, {
      authToken,
    });
  }

  async markNotificationsRead(
    sessionId: string,
    authToken: string | null
  ): Promise<{ ok: boolean }> {
    return apiFetch('/api/notifications/read-all', {
      method: 'POST',
      authToken,
      body: JSON.stringify({ sessionId }),
    });
  }

  async requestDemoOtp(mobile: string): Promise<{
    mobile: string;
    demoOtpHint: string;
    expiresInSeconds: number;
    disclaimer: string;
  }> {
    return apiFetch('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });
  }

  async verifyDemoOtp(params: {
    mobile: string;
    otp: string;
    sessionId: string;
  }): Promise<{ token: string; user: CustomerUser }> {
    return apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getCurrentUser(authToken: string | null): Promise<{ user: CustomerUser | null }> {
    return apiFetch('/api/auth/me', { authToken });
  }

  async updateProfile(
    params: { name: string; email: string; age: number | null; gender: 'Male' | 'Female' | 'Other' | null },
    authToken: string | null
  ): Promise<{ user: CustomerUser }> {
    return apiFetch('/api/auth/profile', {
      method: 'PUT',
      authToken,
      body: JSON.stringify(params),
    });
  }

  async logout(authToken: string | null): Promise<{ ok: boolean }> {
    return apiFetch('/api/auth/logout', {
      method: 'POST',
      authToken,
    });
  }

  async getPricingRules(): Promise<Record<CoachType, PricingRule>> {
    return apiFetch('/api/pricing');
  }

  async updatePricingRule(
    coachType: CoachType,
    rule: Partial<PricingRule>
  ): Promise<Record<CoachType, PricingRule>> {
    return apiFetch(`/api/pricing/${encodeURIComponent(coachType)}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }
}

export const railwayAdapter = new DemoRailwayAdapter();
