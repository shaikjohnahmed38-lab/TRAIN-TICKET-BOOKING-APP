export interface AppConfig {
  appNamePlaceholder: string;
  environmentBadge: string;
  demoDisclaimer: string;
  seatHoldDurationMinutes: number;
  maxSeatsPerBooking: number;
  futureModules: {
    adminDashboardReady: boolean;
    ownerDashboardReady: boolean;
    officialRailwayApiConnected: boolean;
  };
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  appNamePlaceholder: '[Your App Name]',
  environmentBadge: 'DEMO MVP · NOT OFFICIAL IRCTC',
  demoDisclaimer:
    'Demo booking application using simulated railway data, simulated OTP, and demo payments. Not valid for actual railway travel.',
  seatHoldDurationMinutes: 15,
  maxSeatsPerBooking: 6,
  futureModules: {
    adminDashboardReady: true,
    ownerDashboardReady: true,
    officialRailwayApiConnected: false,
  },
};
