import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Database,
  Download,
  Lock,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Ticket,
  Trash2,
  TrainFront,
  Users,
} from 'lucide-react';
import { railwayAdapter } from '../services/railwayAdapter';
import type {
  AdminAnalytics,
  AdminTrainRecord,
  AppConfigRecord,
  AuditLogEntry,
  BookingRecord,
  CoachType,
  CustomerUser,
  IntegrationStatusMap,
  PaginatedResult,
  PricingRule,
  TransactionRecord,
  UserRole,
} from '../types/railway';

interface AdminDashboardScreenProps {
  user: CustomerUser | null;
  authToken: string | null;
  pricingRules: Record<CoachType, PricingRule>;
  onAuthSuccess: (token: string, user: CustomerUser) => Promise<void>;
  onPricingUpdated: (rules: Record<CoachType, PricingRule>) => void;
  onConfigUpdated: (config: AppConfigRecord) => void;
  onBackHome: () => void;
}

type AdminTab = 'overview' | 'bookings' | 'trains' | 'users' | 'ledger' | 'config';

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  user,
  authToken,
  pricingRules,
  onAuthSuccess,
  onPricingUpdated,
  onConfigUpdated,
  onBackHome,
}) => {
  const isAuthorized = user && (user.role === 'admin' || user.role === 'operator');

  // Bootstrap / Login state
  const [bootstrapStatus, setBootstrapStatus] = useState<{
    hasAdmin: boolean;
    requiresPasscode: boolean;
    canBootstrapFirstAdmin: boolean;
  } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'bootstrap'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [bName, setBName] = useState('');
  const [bEmail, setBEmail] = useState('');
  const [bMobile, setBMobile] = useState('');
  const [bPassword, setBPassword] = useState('');
  const [bPasscode, setBPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const [overview, setOverview] = useState<{
    analytics: AdminAnalytics;
    integrations: IntegrationStatusMap;
    realtime: { connectedWebSockets: number; connectedSseStreams: number; activeCoachRooms: number };
    telemetry: {
      uptimeSeconds: number;
      totalRequests: number;
      totalErrors: number;
      recentEvents: Array<{ id: string; level: string; message: string; timestamp: number }>;
    };
    config: AppConfigRecord;
  } | null>(null);

  // Bookings tab
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingFilterStatus, setBookingFilterStatus] = useState('ALL');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingsData, setBookingsData] = useState<PaginatedResult<BookingRecord> | null>(null);

  // Trains tab
  const [trains, setTrains] = useState<AdminTrainRecord[]>([]);
  const [newTrainNo, setNewTrainNo] = useState('');
  const [newTrainNameEn, setNewTrainNameEn] = useState('');
  const [newTrainNameTe, setNewTrainNameTe] = useState('');
  const [newTrainCoaches, setNewTrainCoaches] = useState('A1:2A, B1:3A, S1:SL, GS1:GS');
  const [newTrainFrom, setNewTrainFrom] = useState('SC');
  const [newTrainDep, setNewTrainDep] = useState('07:30');
  const [newTrainTo, setNewTrainTo] = useState('BZA');
  const [newTrainArr, setNewTrainArr] = useState('13:15');
  const [newTrainDist, setNewTrainDist] = useState('350');

  // Users tab
  const [usersData, setUsersData] = useState<PaginatedResult<CustomerUser> | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);

  // Ledger tab
  const [txData, setTxData] = useState<PaginatedResult<TransactionRecord> | null>(null);
  const [auditData, setAuditData] = useState<PaginatedResult<AuditLogEntry> | null>(null);

  // Config & Broadcast tab
  const [cfgAppName, setCfgAppName] = useState('');
  const [cfgSupportEmail, setCfgSupportEmail] = useState('');
  const [cfgHoldMin, setCfgHoldMin] = useState('15');
  const [cfgMaxSeats, setCfgMaxSeats] = useState('6');
  const [cfgMaintenance, setCfgMaintenance] = useState(false);

  const [bcastTitle, setBcastTitle] = useState('');
  const [bcastMessage, setBcastMessage] = useState('');
  const [bcastType, setBcastType] = useState<'SYSTEM_ALERT' | 'TRAIN_DELAY' | 'PLATFORM_CHANGE'>(
    'SYSTEM_ALERT'
  );

  useEffect(() => {
    if (isAuthorized) return;
    railwayAdapter
      .getAdminBootstrapStatus()
      .then((status) => {
        setBootstrapStatus(status);
        if (status.canBootstrapFirstAdmin && !status.hasAdmin) {
          setAuthMode('bootstrap');
        }
      })
      .catch(() => {});
  }, [isAuthorized]);

  const loadOverview = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const ov = await railwayAdapter.getAdminOverview(authToken);
      setOverview(ov);
      setCfgAppName(ov.config.appName);
      setCfgSupportEmail(ov.config.supportEmail);
      setCfgHoldMin(String(ov.config.holdDurationMinutes));
      setCfgMaxSeats(String(ov.config.maxSeatsPerBooking));
      setCfgMaintenance(ov.config.maintenanceMode);
    } catch (err) {
      setActionErr((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, authToken]);

  const loadBookings = useCallback(async () => {
    if (!isAuthorized) return;
    const data = await railwayAdapter.listAdminBookings(
      { page: bookingsPage, limit: 10, status: bookingFilterStatus, q: bookingSearch },
      authToken
    );
    setBookingsData(data);
  }, [isAuthorized, bookingsPage, bookingFilterStatus, bookingSearch, authToken]);

  const loadTrains = useCallback(async () => {
    if (!isAuthorized) return;
    const list = await railwayAdapter.listAdminTrains(authToken);
    setTrains(list);
  }, [isAuthorized, authToken]);

  const loadUsers = useCallback(async () => {
    if (!isAuthorized || user?.role !== 'admin') return;
    const data = await railwayAdapter.listAdminUsers(
      { page: usersPage, limit: 10, q: userSearch },
      authToken
    );
    setUsersData(data);
  }, [isAuthorized, user?.role, usersPage, userSearch, authToken]);

  const loadLedger = useCallback(async () => {
    if (!isAuthorized) return;
    const tx = await railwayAdapter.listAdminTransactions({ page: 1, limit: 20 }, authToken);
    setTxData(tx);
    if (user?.role === 'admin') {
      const logs = await railwayAdapter.listAdminAuditLogs({ page: 1, limit: 25 }, authToken);
      setAuditData(logs);
    }
  }, [isAuthorized, user?.role, authToken]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab === 'overview') loadOverview();
    if (activeTab === 'bookings') loadBookings();
    if (activeTab === 'trains') loadTrains();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'ledger') loadLedger();
    if (activeTab === 'config' && !overview) loadOverview();
  }, [activeTab, isAuthorized, loadOverview, loadBookings, loadTrains, loadUsers, loadLedger, overview]);

  if (!isAuthorized) {
    return (
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 pb-24">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">TRAINSYNK Admin Portal</h1>
              <p className="text-xs text-slate-600">
                Role-protected operations, fleet management, analytics, and audit console.
              </p>
            </div>
          </div>

          {user && user.role === 'customer' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Signed in as customer ({user.email || user.mobile}). Sign in with an Admin/Operator
              account or claim admin access below if eligible.
            </div>
          )}

          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg ${
                authMode === 'login' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Admin Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('bootstrap');
                setAuthError(null);
              }}
              data-testid="admin-bootstrap-tab"
              className={`py-2 text-xs font-semibold rounded-lg ${
                authMode === 'bootstrap' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              {bootstrapStatus?.hasAdmin ? 'Claim Admin (Passcode)' : 'First-Run Admin Setup'}
            </button>
          </div>

          {authMode === 'login' ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError(null);
                setAuthBusy(true);
                try {
                  const res = await railwayAdapter.loginWithPassword({
                    identifier: loginIdentifier,
                    password: loginPassword,
                    sessionId: 'ADMIN-PORTAL',
                  });
                  if (res.user.role !== 'admin' && res.user.role !== 'operator') {
                    throw new Error('This account does not have admin or operator permissions.');
                  }
                  await onAuthSuccess(res.token, res.user);
                } catch (err) {
                  setAuthError((err as Error).message);
                } finally {
                  setAuthBusy(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="adm-id" className="block text-xs font-semibold text-slate-600 mb-1">
                  Admin Email or Mobile
                </label>
                <input
                  id="adm-id"
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="adm-pw" className="block text-xs font-semibold text-slate-600 mb-1">
                  Password
                </label>
                <input
                  id="adm-pw"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <button
                type="submit"
                disabled={authBusy}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold"
              >
                {authBusy ? 'Signing In...' : 'Sign In to Admin Portal'}
              </button>
            </form>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError(null);
                setAuthBusy(true);
                try {
                  const res = await railwayAdapter.bootstrapAdmin({
                    name: bName,
                    email: bEmail,
                    mobile: bMobile,
                    password: bPassword,
                    passcode: bPasscode || undefined,
                  });
                  await onAuthSuccess(res.token, res.user);
                } catch (err) {
                  setAuthError((err as Error).message);
                } finally {
                  setAuthBusy(false);
                }
              }}
              className="space-y-3.5"
            >
              {bootstrapStatus?.hasAdmin && !bootstrapStatus.requiresPasscode ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    An administrator account is already provisioned. Sign in with your admin
                    credentials or configure <code className="font-mono-tabular">ADMIN_PASSCODE</code>.
                  </span>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    required
                    placeholder="Admin Full Name"
                    value={bName}
                    onChange={(e) => setBName(e.target.value)}
                    className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-xl"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Admin Email"
                    value={bEmail}
                    onChange={(e) => setBEmail(e.target.value)}
                    className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-xl"
                  />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-Digit Mobile"
                    value={bMobile}
                    onChange={(e) => setBMobile(e.target.value)}
                    className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-xl font-mono-tabular"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Strong Password (8+ chars, letters & numbers)"
                    value={bPassword}
                    onChange={(e) => setBPassword(e.target.value)}
                    className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-xl"
                  />
                  {bootstrapStatus?.requiresPasscode && (
                    <input
                      type="password"
                      required
                      placeholder="Server ADMIN_PASSCODE"
                      value={bPasscode}
                      onChange={(e) => setBPasscode(e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-xl font-mono-tabular"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={authBusy}
                    data-testid="bootstrap-admin-submit"
                    className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold"
                  >
                    {authBusy ? 'Provisioning...' : 'Create Admin Account'}
                  </button>
                </>
              )}
            </form>
          )}

          {authError && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={onBackHome}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back to Train Search
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 space-y-6">
      {/* Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-700" />
            <span>TRAINSYNK Operations Console</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Signed in as {user.name} ({user.role?.toUpperCase()})
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (activeTab === 'overview') loadOverview();
            if (activeTab === 'bookings') loadBookings();
            if (activeTab === 'trains') loadTrains();
            if (activeTab === 'users') loadUsers();
            if (activeTab === 'ledger') loadLedger();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
        {(
          [
            { id: 'overview', label: 'Overview & Telemetry', icon: BarChart3 },
            { id: 'bookings', label: 'Bookings & Refunds', icon: Ticket },
            { id: 'trains', label: 'Trains & Tariffs', icon: TrainFront },
            ...(user.role === 'admin'
              ? [{ id: 'users', label: 'Users & Roles', icon: Users } as const]
              : []),
            { id: 'ledger', label: 'Transactions & Logs', icon: Database },
            { id: 'config', label: 'Config & Broadcast', icon: Settings },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as AdminTab);
                setActionMsg(null);
                setActionErr(null);
              }}
              data-testid={`admin-tab-${tab.id}`}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
          {actionMsg}
        </div>
      )}
      {actionErr && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          {actionErr}
        </div>
      )}

      {/* TAB 1: OVERVIEW & TELEMETRY */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Revenue', val: `₹${overview.analytics.totalRevenue.toFixed(0)}` },
              { label: 'Total Bookings', val: String(overview.analytics.totalBookings) },
              { label: 'Confirmed', val: String(overview.analytics.confirmedBookings) },
              { label: 'Active Holds', val: String(overview.analytics.activeHolds) },
              { label: 'Pending Refunds', val: String(overview.analytics.pendingRefunds) },
              { label: 'Users / Trains', val: `${overview.analytics.totalUsers} / ${overview.analytics.totalTrains}` },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">{kpi.label}</div>
                <div className="font-mono-tabular text-xl font-bold text-slate-900 mt-1">
                  {kpi.val}
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Class Revenue Breakdown</h2>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2">Class</th>
                    <th className="py-2">Bookings</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-tabular">
                  {overview.analytics.classBreakdown.map((row) => (
                    <tr key={row.coachType}>
                      <td className="py-2 font-bold text-slate-900">{row.coachType}</td>
                      <td className="py-2">{row.bookings}</td>
                      <td className="py-2 text-right font-semibold">₹{row.revenue.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-700" />
                <span>Server Telemetry &amp; Real-Time Socket Pool</span>
              </h2>
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono-tabular">
                <div>
                  <div className="text-slate-500">Uptime</div>
                  <div className="font-bold text-slate-900">{overview.telemetry.uptimeSeconds}s</div>
                </div>
                <div>
                  <div className="text-slate-500">Requests / Errors</div>
                  <div className="font-bold text-slate-900">
                    {overview.telemetry.totalRequests} / {overview.telemetry.totalErrors}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">WS / SSE Clients</div>
                  <div className="font-bold text-slate-900">
                    {overview.realtime.connectedWebSockets} / {overview.realtime.connectedSseStreams}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto text-xs font-mono-tabular">
                {overview.telemetry.recentEvents.slice(0, 8).map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between gap-2 text-slate-600 border-b border-slate-100 pb-1">
                    <span className="truncate">
                      <strong className={ev.level === 'error' ? 'text-red-700' : 'text-blue-700'}>
                        [{ev.level.toUpperCase()}]
                      </strong>{' '}
                      {ev.message}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(ev.timestamp).toLocaleTimeString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS & REFUNDS */}
      {activeTab === 'bookings' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={bookingSearch}
                onChange={(e) => {
                  setBookingSearch(e.target.value);
                  setBookingsPage(1);
                }}
                placeholder="Search PNR, train #, or station..."
                className="h-9 px-3 text-xs border border-slate-300 rounded-lg w-56"
              />
              <select
                value={bookingFilterStatus}
                onChange={(e) => {
                  setBookingFilterStatus(e.target.value);
                  setBookingsPage(1);
                }}
                className="h-9 px-3 text-xs border border-slate-300 rounded-lg"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="WL">Waiting List</option>
                <option value="PAYMENT_PENDING">Payment Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <span className="text-xs font-mono-tabular text-slate-500">
              {bookingsData?.total ?? 0} total bookings
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">PNR</th>
                  <th className="py-2 px-3">Train &amp; Route</th>
                  <th className="py-2 px-3">Date / Coach</th>
                  <th className="py-2 px-3">Fare</th>
                  <th className="py-2 px-3">Status / Refund</th>
                  <th className="py-2 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookingsData?.items.map((b) => (
                  <tr key={b.pnr}>
                    <td className="py-2.5 pr-3 font-mono-tabular font-bold text-blue-700">{b.pnr}</td>
                    <td className="py-2.5 px-3">
                      #{b.trainNumber} · {b.fromCode}→{b.toCode}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular">
                      {b.journeyDate} · {b.coachCode} ({b.seatNumbers.join(',')})
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular font-semibold">₹{b.totalFare}</td>
                    <td className="py-2.5 px-3 font-mono-tabular">
                      <div>{b.status}</div>
                      {b.refundStatus !== 'NOT_APPLICABLE' && (
                        <div className="text-[11px] text-slate-500">
                          Refund: {b.refundStatus} (₹{b.refundAmount})
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right space-x-1.5 whitespace-nowrap">
                      {b.status === 'CANCELLED' && b.refundStatus !== 'REFUNDED' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await railwayAdapter.adminUpdateRefund(
                              b.pnr,
                              b.refundStatus === 'INITIATED' ? 'PROCESSING' : 'REFUNDED',
                              authToken
                            );
                            await loadBookings();
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded"
                        >
                          {b.refundStatus === 'INITIATED' ? 'Mark Processing' : 'Complete Refund'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bookingsData && bookingsData.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                disabled={bookingsPage <= 1}
                onClick={() => setBookingsPage((p) => p - 1)}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40"
              >
                Prev
              </button>
              <span className="font-mono-tabular">
                Page {bookingsData.page} / {bookingsData.totalPages}
              </span>
              <button
                type="button"
                disabled={bookingsPage >= bookingsData.totalPages}
                onClick={() => setBookingsPage((p) => p + 1)}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: TRAINS & TARIFFS */}
      {activeTab === 'trains' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Active Fleet &amp; Formations ({trains.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3">Train</th>
                    <th className="py-2 px-3">Route</th>
                    <th className="py-2 px-3">Coaches</th>
                    {user.role === 'admin' && <th className="py-2 pl-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trains.map((tr) => (
                    <tr key={tr.id}>
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">
                        <span className="font-mono-tabular text-blue-700">#{tr.trainNumber}</span> ·{' '}
                        {tr.nameEn}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-slate-600">
                        {tr.stops.map((s) => s.stationCode).join(' → ')}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-slate-600">
                        {tr.coaches.map((c) => `${c.coachCode}(${c.coachType})`).join(', ')}
                      </td>
                      {user.role === 'admin' && (
                        <td className="py-2.5 pl-3 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              setActionErr(null);
                              try {
                                await railwayAdapter.deleteAdminTrain(tr.id, authToken);
                                await loadTrains();
                              } catch (err) {
                                setActionErr((err as Error).message);
                              }
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            aria-label={`Delete train ${tr.trainNumber}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {user.role === 'admin' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setActionErr(null);
                  setActionMsg(null);
                  try {
                    const coaches = newTrainCoaches
                      .split(',')
                      .map((part) => {
                        const [code, type] = part.trim().split(':');
                        return {
                          code: (code || '').trim().toUpperCase(),
                          type: ((type || 'SL').trim().toUpperCase() as CoachType),
                        };
                      })
                      .filter((c) => c.code);
                    await railwayAdapter.createAdminTrain(
                      {
                        trainNumber: newTrainNo,
                        nameEn: newTrainNameEn,
                        nameTe: newTrainNameTe || newTrainNameEn,
                        coaches,
                        stops: [
                          {
                            stationCode: newTrainFrom.toUpperCase(),
                            arrivalTime: null,
                            departureTime: newTrainDep,
                            distanceKm: 0,
                            dayOffset: 0,
                            platform: '1',
                          },
                          {
                            stationCode: newTrainTo.toUpperCase(),
                            arrivalTime: newTrainArr,
                            departureTime: null,
                            distanceKm: Number(newTrainDist) || 250,
                            dayOffset: 0,
                            platform: '2',
                          },
                        ],
                      },
                      authToken
                    );
                    setActionMsg(`Train #${newTrainNo} added to active schedule.`);
                    setNewTrainNo('');
                    setNewTrainNameEn('');
                    setNewTrainNameTe('');
                    await loadTrains();
                  } catch (err) {
                    setActionErr((err as Error).message);
                  }
                }}
                className="pt-4 border-t border-slate-200 grid sm:grid-cols-4 gap-2.5"
              >
                <input
                  type="text"
                  required
                  placeholder="Train # (e.g. 12799)"
                  value={newTrainNo}
                  onChange={(e) => setNewTrainNo(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                />
                <input
                  type="text"
                  required
                  placeholder="Train Name (EN)"
                  value={newTrainNameEn}
                  onChange={(e) => setNewTrainNameEn(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Train Name (TE, optional)"
                  value={newTrainNameTe}
                  onChange={(e) => setNewTrainNameTe(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  placeholder="Coaches e.g. A1:2A, S1:SL"
                  value={newTrainCoaches}
                  onChange={(e) => setNewTrainCoaches(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                />
                <input
                  type="text"
                  required
                  placeholder="From Code (SC)"
                  value={newTrainFrom}
                  onChange={(e) => setNewTrainFrom(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                />
                <input
                  type="text"
                  required
                  placeholder="Dep HH:MM"
                  value={newTrainDep}
                  onChange={(e) => setNewTrainDep(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                />
                <input
                  type="text"
                  required
                  placeholder="To Code (BZA)"
                  value={newTrainTo}
                  onChange={(e) => setNewTrainTo(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Arr HH:MM"
                    value={newTrainArr}
                    onChange={(e) => setNewTrainArr(e.target.value)}
                    className="w-24 h-9 px-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Km"
                    value={newTrainDist}
                    onChange={(e) => setNewTrainDist(e.target.value)}
                    className="w-20 h-9 px-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                  <button
                    type="submit"
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Train
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Tariffs Editor */}
          {user.role === 'admin' && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Coach Pricing Tariffs</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-4">Class</th>
                      <th className="py-2 px-3">Base Fare (₹)</th>
                      <th className="py-2 px-3">Per Km (₹)</th>
                      <th className="py-2 px-3">Res. Fee (₹)</th>
                      <th className="py-2 pl-3 text-right">Save</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(['1A', '2A', '3A', 'SL', 'GS'] as CoachType[]).map((ct) => {
                      const rule = pricingRules[ct];
                      if (!rule) return null;
                      return (
                        <AdminTariffRow
                          key={ct}
                          rule={rule}
                          onSave={async (updates) => {
                            const updated = await railwayAdapter.updatePricingRule(
                              ct,
                              updates,
                              authToken
                            );
                            onPricingUpdated(updated);
                            setActionMsg(`Saved ${ct} pricing rule.`);
                          }}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 4: USERS & ROLES */}
      {activeTab === 'users' && user.role === 'admin' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setUsersPage(1);
              }}
              placeholder="Search user name, email, or mobile..."
              className="h-9 px-3 text-xs border border-slate-300 rounded-lg w-64"
            />
            <span className="text-xs font-mono-tabular text-slate-500">
              {usersData?.total ?? 0} registered users
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Name &amp; Contact</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Verified</th>
                  <th className="py-2 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersData?.items.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="font-mono-tabular text-slate-500">
                        +91 {u.mobile} {u.email ? `· ${u.email}` : ''}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role ?? 'customer'}
                        disabled={u.id === user.id}
                        onChange={async (e) => {
                          await railwayAdapter.adminUpdateUser(
                            u.id,
                            { role: e.target.value as UserRole },
                            authToken
                          );
                          await loadUsers();
                        }}
                        className="h-8 px-2 border border-slate-300 rounded text-xs"
                      >
                        <option value="customer">customer</option>
                        <option value="operator">operator</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={async () => {
                          await railwayAdapter.adminUpdateUser(
                            u.id,
                            { isVerified: !u.isVerified },
                            authToken
                          );
                          await loadUsers();
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-semibold ${
                          u.isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.isVerified ? 'Verified' : 'Unverified'}
                      </button>
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <button
                        type="button"
                        disabled={u.id === user.id}
                        onClick={async () => {
                          await railwayAdapter.adminUpdateUser(
                            u.id,
                            { isActive: !(u.isActive !== false) },
                            authToken
                          );
                          await loadUsers();
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold disabled:opacity-40 ${
                          u.isActive !== false
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {u.isActive !== false ? 'Active' : 'Suspended'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: TRANSACTIONS & AUDIT LOGS + BACKUP */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Payment Transactions</h2>
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={async () => {
                    const snapshot = await railwayAdapter.exportAdminBackup(authToken);
                    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `trainsynk-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON Backup</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono-tabular">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3">PNR</th>
                    <th className="py-2 px-3">Gateway</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 pl-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txData?.items.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2 pr-3 font-bold text-blue-700">{tx.pnr}</td>
                      <td className="py-2 px-3">{tx.gateway}</td>
                      <td className="py-2 px-3">₹{tx.amount.toFixed(2)}</td>
                      <td className="py-2 px-3">{tx.status}</td>
                      <td className="py-2 pl-3 text-right text-slate-500">
                        {new Date(tx.createdAt).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {user.role === 'admin' && auditData && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Security &amp; Operations Audit Trail</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono-tabular">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3">Action</th>
                      <th className="py-2 px-3">Actor</th>
                      <th className="py-2 px-3">Target</th>
                      <th className="py-2 pl-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditData.items.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2 pr-3 font-bold text-slate-900">{log.action}</td>
                        <td className="py-2 px-3">{log.actorLabel}</td>
                        <td className="py-2 px-3">
                          {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                        </td>
                        <td className="py-2 pl-3 text-right text-slate-500">
                          {new Date(log.createdAt).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 6: SYSTEM CONFIG & LIVE BROADCAST */}
      {activeTab === 'config' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Persistent System Configuration</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionErr(null);
                setActionMsg(null);
                try {
                  const updated = await railwayAdapter.updateAppConfig(
                    {
                      appName: cfgAppName,
                      supportEmail: cfgSupportEmail,
                      holdDurationMinutes: Number(cfgHoldMin),
                      maxSeatsPerBooking: Number(cfgMaxSeats),
                      maintenanceMode: cfgMaintenance,
                    },
                    authToken
                  );
                  onConfigUpdated(updated);
                  setActionMsg('Configuration saved and broadcast to connected clients.');
                } catch (err) {
                  setActionErr((err as Error).message);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">App Name</label>
                <input
                  type="text"
                  value={cfgAppName}
                  onChange={(e) => setCfgAppName(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Support Email</label>
                <input
                  type="email"
                  value={cfgSupportEmail}
                  onChange={(e) => setCfgSupportEmail(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Hold Duration (Min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={cfgHoldMin}
                    onChange={(e) => setCfgHoldMin(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Max Seats / Booking
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={cfgMaxSeats}
                    onChange={(e) => setCfgMaxSeats(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={cfgMaintenance}
                  onChange={(e) => setCfgMaintenance(e.target.checked)}
                />
                <span>Enable Maintenance Mode Notice</span>
              </label>
              <button
                type="submit"
                disabled={user.role !== 'admin'}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg"
              >
                Save Configuration
              </button>
            </form>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-700" />
              <span>Real-Time Operator Broadcast</span>
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionErr(null);
                setActionMsg(null);
                try {
                  await railwayAdapter.broadcastNotification(
                    {
                      type: bcastType,
                      titleEn: bcastTitle,
                      messageEn: bcastMessage,
                    },
                    authToken
                  );
                  setBcastTitle('');
                  setBcastMessage('');
                  setActionMsg('Live alert broadcast sent over WebSocket & SSE.');
                } catch (err) {
                  setActionErr((err as Error).message);
                }
              }}
              className="space-y-3"
            >
              <select
                value={bcastType}
                onChange={(e) =>
                  setBcastType(
                    e.target.value as 'SYSTEM_ALERT' | 'TRAIN_DELAY' | 'PLATFORM_CHANGE'
                  )
                }
                className="w-full h-9 px-3 text-xs border border-slate-300 rounded-lg"
              >
                <option value="SYSTEM_ALERT">System Alert</option>
                <option value="TRAIN_DELAY">Train Delay Notice</option>
                <option value="PLATFORM_CHANGE">Platform Change</option>
              </select>
              <input
                type="text"
                required
                placeholder="Alert Title"
                value={bcastTitle}
                onChange={(e) => setBcastTitle(e.target.value)}
                className="w-full h-9 px-3 text-xs border border-slate-300 rounded-lg"
              />
              <textarea
                required
                rows={3}
                placeholder="Broadcast message to all connected passengers..."
                value={bcastMessage}
                onChange={(e) => setBcastMessage(e.target.value)}
                className="w-full p-3 text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Broadcast Alert
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
};

const AdminTariffRow: React.FC<{
  rule: PricingRule;
  onSave: (updates: Partial<PricingRule>) => Promise<void>;
}> = ({ rule, onSave }) => {
  const [baseFare, setBaseFare] = useState(String(rule.baseFare));
  const [perKmRate, setPerKmRate] = useState(String(rule.perKmRate));
  const [reservationFee, setReservationFee] = useState(String(rule.reservationFee));
  const [saving, setSaving] = useState(false);

  return (
    <tr>
      <td className="py-2 pr-4 font-mono-tabular font-bold text-slate-900">
        {rule.coachType} · <span className="font-sans font-normal text-slate-600">{rule.labelEn}</span>
      </td>
      <td className="py-2 px-3">
        <input
          type="number"
          value={baseFare}
          onChange={(e) => setBaseFare(e.target.value)}
          className="w-20 h-8 px-2 border border-slate-300 rounded font-mono-tabular"
        />
      </td>
      <td className="py-2 px-3">
        <input
          type="number"
          step="0.05"
          value={perKmRate}
          onChange={(e) => setPerKmRate(e.target.value)}
          className="w-20 h-8 px-2 border border-slate-300 rounded font-mono-tabular"
        />
      </td>
      <td className="py-2 px-3">
        <input
          type="number"
          value={reservationFee}
          onChange={(e) => setReservationFee(e.target.value)}
          className="w-20 h-8 px-2 border border-slate-300 rounded font-mono-tabular"
        />
      </td>
      <td className="py-2 pl-3 text-right">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                baseFare: Number(baseFare),
                perKmRate: Number(perKmRate),
                reservationFee: Number(reservationFee),
              });
            } finally {
              setSaving(false);
            }
          }}
          className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded"
        >
          {saving ? '...' : 'Save'}
        </button>
      </td>
    </tr>
  );
};
