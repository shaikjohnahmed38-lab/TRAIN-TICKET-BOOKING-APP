export interface AppConfig {
  appNamePlaceholder: string;
  supportEmail: string;
  environmentBadge: string;
  demoDisclaimer: string;
  seatHoldDurationMinutes: number;
  maxSeatsPerBooking: number;
  maintenanceMode: boolean;
  futureModules: {
    adminDashboardReady: boolean;
    ownerDashboardReady: boolean;
    officialRailwayApiConnected: boolean;
  };
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  appNamePlaceholder: 'TRAINSYNK',
  supportEmail: 'support@trainsynk.in',
  environmentBadge: 'TRAINSYNK · REAL-TIME RESERVATION ENGINE',
  demoDisclaimer:
    'TRAINSYNK reservation platform with persistent SQLite storage, live WebSocket seat locks, and configurable payment/SMS/email gateways.',
  seatHoldDurationMinutes: 15,
  maxSeatsPerBooking: 6,
  maintenanceMode: false,
  futureModules: {
    adminDashboardReady: true,
    ownerDashboardReady: true,
    officialRailwayApiConnected: false,
  },
};
