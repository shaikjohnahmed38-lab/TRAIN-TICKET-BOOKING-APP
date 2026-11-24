export type Language = 'en' | 'te';

export type CoachType = '1A' | '2A' | '3A' | 'SL' | 'GS';

export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'WAITING_LIST' | 'HELD';

export type BerthType = 'LB' | 'MB' | 'UB' | 'SL' | 'SU' | 'WS' | 'MS' | 'AS';

export type BookingStatus =
  | 'CONFIRMED'
  | 'RAC'
  | 'WL'
  | 'CANCELLED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_FAILED';

export type PaymentMethod = 'UPI' | 'PHONEPE' | 'GPAY' | 'CARD' | 'RAZORPAY';

export type RefundStatus = 'NOT_APPLICABLE' | 'INITIATED' | 'PROCESSING' | 'REFUNDED';

export type UserRole = 'customer' | 'operator' | 'admin';

export interface Station {
  code: string;
  nameEn: string;
  nameTe: string;
  city: string;
  state: 'AP' | 'TS';
}

export interface TrainStop {
  stationCode: string;
  arrivalTime: string | null;
  departureTime: string | null;
  distanceKm: number;
  dayOffset: number;
  platform: string;
}

export interface CoachSummary {
  id: string;
  coachCode: string;
  coachType: CoachType;
  sortOrder: number;
  totalSeats: number;
  availableCount: number;
  bookedCount: number;
  waitingListCount: number;
  heldCount: number;
  fare: number;
}

export interface TrainSearchResult {
  id: string;
  trainNumber: string;
  nameEn: string;
  nameTe: string;
  fromStation: Station;
  toStation: Station;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  distanceKm: number;
  journeyDate: string;
  runningDays: string[];
  coaches: CoachSummary[];
}

export interface SeatRecord {
  id: string;
  coachId: string;
  trainId: string;
  journeyDate: string;
  seatNumber: number;
  berthType: BerthType;
  bayNumber: number;
  status: SeatStatus;
  heldBySession: string | null;
  holdExpiresAt: number | null;
  bookedPnr: string | null;
}

export interface PricingRule {
  coachType: CoachType;
  labelEn: string;
  labelTe: string;
  baseFare: number;
  perKmRate: number;
  reservationFee: number;
  gstPercent: number;
}

export interface PassengerInput {
  seatNumber: number;
  berthType: BerthType;
  fullName: string;
  age: string;
  gender: 'Male' | 'Female' | 'Other';
}

export interface SavedPassenger {
  id: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  berthPreference: string | null;
  createdAt: number;
}

export interface BookingRecord {
  pnr: string;
  userId: string | null;
  sessionId: string;
  trainId: string;
  trainNumber: string;
  trainNameEn: string;
  trainNameTe: string;
  fromCode: string;
  fromNameEn: string;
  toCode: string;
  toNameEn: string;
  departureTime: string;
  arrivalTime: string;
  journeyDate: string;
  coachId: string;
  coachCode: string;
  coachType: CoachType;
  seatNumbers: number[];
  passengers: PassengerInput[];
  status: BookingStatus;
  paymentMethod: PaymentMethod | null;
  paymentStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
  farePerSeat: number;
  totalFare: number;
  holdExpiresAt: number | null;
  refundStatus: RefundStatus;
  refundAmount: number;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerUser {
  id: string;
  mobile: string;
  name: string;
  email: string;
  age: number | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  role?: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  hasPassword?: boolean;
  createdAt?: number;
  lastLoginAt?: number | null;
}

export interface UserSessionInfo {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: number;
  expiresAt: number;
  isCurrent: boolean;
}

export interface NotificationItem {
  id: string;
  type:
    | 'BOOKING_CONFIRMED'
    | 'PAYMENT_SUCCESS'
    | 'PAYMENT_FAILED'
    | 'TICKET_CANCELLED'
    | 'REFUND_UPDATE'
    | 'TRAIN_DELAY'
    | 'PLATFORM_CHANGE'
    | 'JOURNEY_REMINDER'
    | 'SYSTEM_ALERT';
  titleEn: string;
  titleTe: string;
  messageEn: string;
  messageTe: string;
  isSimulated: boolean;
  read: boolean;
  createdAt: number;
}

export interface IntegrationItemStatus {
  key: string;
  label: string;
  configured: boolean;
  provider: string;
  missingVars: string[];
  description: string;
}

export interface IntegrationStatusMap {
  database: IntegrationItemStatus;
  realtime: IntegrationItemStatus;
  smtpEmail: IntegrationItemStatus;
  twilioSms: IntegrationItemStatus;
  razorpayPayments: IntegrationItemStatus;
  officialRailwayApi: IntegrationItemStatus;
}

export interface AppConfigRecord {
  appName: string;
  supportEmail: string;
  holdDurationMinutes: number;
  maxSeatsPerBooking: number;
  maintenanceMode: boolean;
}

export interface TransactionRecord {
  id: string;
  pnr: string;
  userId: string | null;
  gateway: string;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string;
  createdAt: number;
}

export interface AdminAnalytics {
  totalRevenue: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  pendingRefunds: number;
  totalUsers: number;
  verifiedUsers: number;
  activeHolds: number;
  totalTrains: number;
  classBreakdown: Array<{
    coachType: CoachType;
    bookings: number;
    revenue: number;
  }>;
  topRoutes: Array<{
    route: string;
    bookings: number;
    revenue: number;
  }>;
}

export interface AdminTrainRecord {
  id: string;
  trainNumber: string;
  nameEn: string;
  nameTe: string;
  runningDays: string[];
  stops: TrainStop[];
  coaches: Array<{
    id: string;
    coachCode: string;
    coachType: CoachType;
    sortOrder: number;
    totalSeats: number;
  }>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type AppScreen =
  | 'home'
  | 'search'
  | 'results'
  | 'train-map'
  | 'booking-flow'
  | 'confirmation'
  | 'my-bookings'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'admin';
