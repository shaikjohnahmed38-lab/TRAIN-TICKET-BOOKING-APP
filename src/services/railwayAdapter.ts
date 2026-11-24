import type {
  AdminAnalytics,
  AdminTrainRecord,
  AppConfigRecord,
  AuditLogEntry,
  BookingRecord,
  CoachType,
  CustomerUser,
  IntegrationStatusMap,
  NotificationItem,
  PaginatedResult,
  PassengerInput,
  PaymentMethod,
  PricingRule,
  SavedPassenger,
  SeatRecord,
  Station,
  TrainSearchResult,
  TrainStop,
  TransactionRecord,
  UserRole,
  UserSessionInfo,
} from '../types/railway';

export interface RailwayProviderAdapter {
  readonly providerMode: 'TRAINSYNK_SQLITE' | 'OFFICIAL_RAILWAY_API';
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
    'X-Requested-With': 'TRAINSYNK',
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

export class TrainSynkApiAdapter implements RailwayProviderAdapter {
  public readonly providerMode = 'TRAINSYNK_SQLITE' as const;

  async getAppConfig(): Promise<AppConfigRecord> {
    return apiFetch('/api/v1/config');
  }

  async getIntegrationStatuses(): Promise<IntegrationStatusMap> {
    return apiFetch('/api/v1/integrations/status');
  }

  async listStations(): Promise<Station[]> {
    return apiFetch('/api/v1/stations');
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
    return apiFetch(`/api/v1/trains/search?${query.toString()}`);
  }

  async getTrainLiveStatus(trainNumber: string): Promise<{
    configured: boolean;
    trainNumber: string;
    liveStatus?: unknown;
    error?: string;
  }> {
    return apiFetch(`/api/v1/trains/${encodeURIComponent(trainNumber)}/live-status`);
  }

  async getCoachSeats(params: {
    trainId: string;
    coachId: string;
    journeyDate: string;
  }): Promise<SeatRecord[]> {
    const query = new URLSearchParams({ date: params.journeyDate });
    return apiFetch(
      `/api/v1/trains/${encodeURIComponent(params.trainId)}/coaches/${encodeURIComponent(
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
    return apiFetch('/api/v1/holds', {
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
    return apiFetch('/api/v1/holds/release', {
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
    return apiFetch('/api/v1/bookings/checkout', {
      method: 'POST',
      authToken,
      body: JSON.stringify(params),
    });
  }

  async createRazorpayOrder(
    pnr: string,
    authToken: string | null
  ): Promise<{ orderId: string; amountPaise: number; currency: string; keyId: string }> {
    return apiFetch('/api/v1/payments/razorpay/order', {
      method: 'POST',
      authToken,
      body: JSON.stringify({ pnr }),
    });
  }

  async verifyRazorpayPayment(
    params: {
      pnr: string;
      orderId: string;
      paymentId: string;
      signature: string;
      sessionId: string;
    },
    authToken: string | null
  ): Promise<{ booking: BookingRecord }> {
    return apiFetch('/api/v1/payments/razorpay/verify', {
      method: 'POST',
      authToken,
      body: JSON.stringify(params),
    });
  }

  async listBookings(
    params: { sessionId: string },
    authToken: string | null
  ): Promise<BookingRecord[]> {
    return apiFetch(`/api/v1/bookings?sessionId=${encodeURIComponent(params.sessionId)}`, {
      authToken,
    });
  }

  async cancelBooking(
    pnr: string,
    sessionId: string,
    authToken: string | null
  ): Promise<BookingRecord> {
    return apiFetch(`/api/v1/bookings/${encodeURIComponent(pnr)}/cancel`, {
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
    return apiFetch(`/api/v1/bookings/${encodeURIComponent(pnr)}/refund-advance`, {
      method: 'POST',
      authToken,
      body: JSON.stringify({ sessionId }),
    });
  }

  async listNotifications(
    sessionId: string,
    authToken: string | null
  ): Promise<NotificationItem[]> {
    return apiFetch(`/api/v1/notifications?sessionId=${encodeURIComponent(sessionId)}`, {
      authToken,
    });
  }

  async markNotificationsRead(
    sessionId: string,
    authToken: string | null
  ): Promise<{ ok: boolean }> {
    return apiFetch('/api/v1/notifications/read-all', {
      method: 'POST',
      authToken,
      body: JSON.stringify({ sessionId }),
    });
  }

  // --- Saved Co-Travellers ---
  async listSavedPassengers(authToken: string | null): Promise<SavedPassenger[]> {
    return apiFetch('/api/v1/passengers', { authToken });
  }

  async addSavedPassenger(
    params: {
      fullName: string;
      age: number;
      gender: 'Male' | 'Female' | 'Other';
      berthPreference?: string;
    },
    authToken: string | null
  ): Promise<SavedPassenger> {
    return apiFetch('/api/v1/passengers', {
      method: 'POST',
      authToken,
      body: JSON.stringify(params),
    });
  }

  async deleteSavedPassenger(id: string, authToken: string | null): Promise<{ ok: boolean }> {
    return apiFetch(`/api/v1/passengers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      authToken,
    });
  }

  // --- Full Auth API ---
  async registerAccount(params: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    sessionId: string;
  }): Promise<{
    token: string;
    user: CustomerUser;
    verificationDelivery: { sent: boolean; mode: 'SMTP' | 'UNCONFIGURED'; sandboxCode?: string };
  }> {
    return apiFetch('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async loginWithPassword(params: {
    identifier: string;
    password: string;
    sessionId: string;
  }): Promise<{ token: string; user: CustomerUser }> {
    return apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async requestDemoOtp(mobile: string): Promise<{
    mobile: string;
    demoOtpHint?: string;
    sandboxOtpPreview?: string;
    deliveryMode: 'TWILIO' | 'SANDBOX';
    expiresInSeconds: number;
    disclaimer: string;
  }> {
    return apiFetch('/api/v1/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });
  }

  async verifyDemoOtp(params: {
    mobile: string;
    otp: string;
    sessionId: string;
  }): Promise<{ token: string; user: CustomerUser }> {
    return apiFetch('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async requestEmailVerification(authToken: string | null): Promise<{
    sent: boolean;
    mode: 'SMTP' | 'UNCONFIGURED';
    sandboxCode?: string;
  }> {
    return apiFetch('/api/v1/auth/verify-email/request', {
      method: 'POST',
      authToken,
    });
  }

  async confirmEmailVerification(
    code: string,
    authToken: string | null
  ): Promise<{ user: CustomerUser }> {
    return apiFetch('/api/v1/auth/verify-email/confirm', {
      method: 'POST',
      authToken,
      body: JSON.stringify({ code }),
    });
  }

  async requestPasswordReset(email: string): Promise<{
    requested: boolean;
    deliveryMode: 'SMTP' | 'UNCONFIGURED';
    sandboxResetCode?: string;
  }> {
    return apiFetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(params: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<{ ok: boolean }> {
    return apiFetch('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getCurrentUser(authToken: string | null): Promise<{ user: CustomerUser | null }> {
    return apiFetch('/api/v1/auth/me', { authToken });
  }

  async updateProfile(
    params: {
      name: string;
      email: string;
      age: number | null;
      gender: 'Male' | 'Female' | 'Other' | null;
    },
    authToken: string | null
  ): Promise<{ user: CustomerUser }> {
    return apiFetch('/api/v1/auth/profile', {
      method: 'PUT',
      authToken,
      body: JSON.stringify(params),
    });
  }

  async changePassword(
    params: { currentPassword?: string; newPassword: string },
    authToken: string | null
  ): Promise<{ ok: boolean }> {
    return apiFetch('/api/v1/auth/change-password', {
      method: 'POST',
      authToken,
      body: JSON.stringify(params),
    });
  }

  async listSessions(authToken: string | null): Promise<UserSessionInfo[]> {
    return apiFetch('/api/v1/auth/sessions', { authToken });
  }

  async revokeSession(sessionId: string, authToken: string | null): Promise<{ ok: boolean }> {
    return apiFetch(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      authToken,
    });
  }

  async deleteAccount(password: string, authToken: string | null): Promise<{ ok: boolean }> {
    return apiFetch('/api/v1/auth/account', {
      method: 'DELETE',
      authToken,
      body: JSON.stringify({ password }),
    });
  }

  async logout(authToken: string | null): Promise<{ ok: boolean }> {
    return apiFetch('/api/v1/auth/logout', {
      method: 'POST',
      authToken,
    });
  }

  async getPricingRules(): Promise<Record<CoachType, PricingRule>> {
    return apiFetch('/api/v1/pricing');
  }

  // --- Admin Portal API ---
  async getAdminBootstrapStatus(): Promise<{
    hasAdmin: boolean;
    requiresPasscode: boolean;
    canBootstrapFirstAdmin: boolean;
  }> {
    return apiFetch('/api/v1/admin/bootstrap-status');
  }

  async bootstrapAdmin(params: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    passcode?: string;
  }): Promise<{ token: string; user: CustomerUser }> {
    return apiFetch('/api/v1/admin/bootstrap', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getAdminOverview(authToken: string | null): Promise<{
    analytics: AdminAnalytics;
    integrations: IntegrationStatusMap;
    realtime: { connectedWebSockets: number; connectedSseStreams: number; activeCoachRooms: number };
    telemetry: {
      uptimeSeconds: number;
      totalRequests: number;
      totalErrors: number;
      recentEvents: Array<{
        id: string;
        level: string;
        message: string;
        timestamp: number;
      }>;
    };
    config: AppConfigRecord;
  }> {
    return apiFetch('/api/v1/admin/overview', { authToken });
  }

  async listAdminBookings(
    params: { page?: number; limit?: number; status?: string; q?: string },
    authToken: string | null
  ): Promise<PaginatedResult<BookingRecord>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    if (params.q) query.set('q', params.q);
    return apiFetch(`/api/v1/admin/bookings?${query.toString()}`, { authToken });
  }

  async adminUpdateRefund(
    pnr: string,
    status: 'PROCESSING' | 'REFUNDED',
    authToken: string | null
  ): Promise<BookingRecord> {
    return apiFetch(`/api/v1/admin/bookings/${encodeURIComponent(pnr)}/refund`, {
      method: 'POST',
      authToken,
      body: JSON.stringify({ status }),
    });
  }

  async listAdminUsers(
    params: { page?: number; limit?: number; q?: string },
    authToken: string | null
  ): Promise<PaginatedResult<CustomerUser>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.q) query.set('q', params.q);
    return apiFetch(`/api/v1/admin/users?${query.toString()}`, { authToken });
  }

  async adminUpdateUser(
    userId: string,
    updates: { role?: UserRole; isActive?: boolean; isVerified?: boolean },
    authToken: string | null
  ): Promise<{ user: CustomerUser }> {
    return apiFetch(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      authToken,
      body: JSON.stringify(updates),
    });
  }

  async listAdminTrains(authToken: string | null): Promise<AdminTrainRecord[]> {
    return apiFetch('/api/v1/admin/trains', { authToken });
  }

  async createAdminTrain(
    params: {
      trainNumber: string;
      nameEn: string;
      nameTe?: string;
      coaches: Array<{ code: string; type: CoachType }>;
      stops: TrainStop[];
    },
    authToken: string | null
  ): Promise<AdminTrainRecord> {
    return apiFetch('/api/v1/admin/trains', {
      method: 'POST',
      authToken,
      body: JSON.stringify(params),
    });
  }

  async deleteAdminTrain(trainId: string, authToken: string | null): Promise<{ ok: boolean }> {
    return apiFetch(`/api/v1/admin/trains/${encodeURIComponent(trainId)}`, {
      method: 'DELETE',
      authToken,
    });
  }

  async updatePricingRule(
    coachType: CoachType,
    rule: Partial<PricingRule>,
    authToken: string | null = null
  ): Promise<Record<CoachType, PricingRule>> {
    return apiFetch(`/api/v1/admin/pricing/${encodeURIComponent(coachType)}`, {
      method: 'PUT',
      authToken,
      body: JSON.stringify(rule),
    });
  }

  async updateAppConfig(
    updates: Partial<AppConfigRecord>,
    authToken: string | null
  ): Promise<AppConfigRecord> {
    return apiFetch('/api/v1/admin/config', {
      method: 'PUT',
      authToken,
      body: JSON.stringify(updates),
    });
  }

  async broadcastNotification(
    params: {
      type: NotificationItem['type'];
      titleEn: string;
      titleTe?: string;
      messageEn: string;
      messageTe?: string;
    },
    authToken: string | null
  ): Promise<NotificationItem> {
    return apiFetch('/api/v1/admin/notifications/broadcast', {
      method: 'POST',
      authToken,
      body: JSON.stringify(params),
    });
  }

  async listAdminTransactions(
    params: { page?: number; limit?: number },
    authToken: string | null
  ): Promise<PaginatedResult<TransactionRecord>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return apiFetch(`/api/v1/admin/transactions?${query.toString()}`, { authToken });
  }

  async listAdminAuditLogs(
    params: { page?: number; limit?: number },
    authToken: string | null
  ): Promise<PaginatedResult<AuditLogEntry>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return apiFetch(`/api/v1/admin/audit-logs?${query.toString()}`, { authToken });
  }

  async exportAdminBackup(authToken: string | null): Promise<Record<string, unknown>> {
    return apiFetch('/api/v1/admin/backup', { authToken });
  }
}

export const railwayAdapter = new TrainSynkApiAdapter();
