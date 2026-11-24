import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createDatabase } from './db';
import {
  bootstrapOrClaimAdmin,
  changePassword,
  deleteAccount,
  getAdminBootstrapStatus,
  getUserByToken,
  loginWithPassword,
  registerUser,
  requestEmailVerification,
  requestPasswordReset,
  resetPasswordWithCode,
  verifyEmailCode,
} from './authService';
import {
  adminUpdateUser,
  createTrainAdmin,
  getAdminAnalytics,
  listAllBookingsAdmin,
  listUsersAdmin,
  updateAppConfig,
  updatePricingRuleAdmin,
} from './adminService';
import { checkoutDemoBooking, cancelBooking, getCoachSeats, holdSeats, searchTrains } from './bookingService';
import { createApiRouter } from './routes/v1';

test('supports full user registration, login, email verification, password reset, and account deletion', async () => {
  const db = createDatabase(':memory:');

  // 1. Register a new user
  const reg = await registerUser(db, {
    name: 'Ananya Reddy',
    email: 'ananya@trainsynk.in',
    mobile: '9876501234',
    password: 'Password123',
    sessionId: 'VIS-TEST-1',
  });
  assert.ok(reg.token);
  assert.equal(reg.user.email, 'ananya@trainsynk.in');
  assert.equal(reg.user.role, 'customer');
  assert.equal(reg.user.isVerified, false);

  // 2. Verify token resolves user
  const resolved = getUserByToken(db, reg.token);
  assert.equal(resolved?.id, reg.user.id);

  // 3. Reject wrong password
  assert.throws(
    () =>
      loginWithPassword(db, {
        identifier: 'ananya@trainsynk.in',
        password: 'WrongPassword1',
      }),
    /Invalid email\/mobile or password/
  );

  // 4. Login with email & mobile works
  const loggedIn = loginWithPassword(db, {
    identifier: '9876501234',
    password: 'Password123',
  });
  assert.equal(loggedIn.user.id, reg.user.id);

  // 5. Email verification flow
  const verifyReq = await requestEmailVerification(db, reg.user.id);
  assert.ok(verifyReq.sandboxCode);
  const verifiedUser = verifyEmailCode(db, reg.user.id, verifyReq.sandboxCode!);
  assert.equal(verifiedUser.isVerified, true);

  // 6. Change password
  changePassword(db, reg.user.id, {
    currentPassword: 'Password123',
    newPassword: 'NewPassword456',
  });
  assert.throws(
    () =>
      loginWithPassword(db, {
        identifier: 'ananya@trainsynk.in',
        password: 'Password123',
      }),
    /Invalid/
  );

  // 7. Forgot password & reset revokes old sessions
  const resetReq = await requestPasswordReset(db, 'ananya@trainsynk.in');
  assert.ok(resetReq.sandboxResetCode);
  resetPasswordWithCode(db, {
    email: 'ananya@trainsynk.in',
    code: resetReq.sandboxResetCode!,
    newPassword: 'ResetPassword789',
  });
  assert.equal(getUserByToken(db, loggedIn.token), null);

  const afterReset = loginWithPassword(db, {
    identifier: 'ananya@trainsynk.in',
    password: 'ResetPassword789',
  });
  assert.equal(afterReset.user.id, reg.user.id);

  // 8. Account deletion requires correct password
  assert.throws(() => deleteAccount(db, reg.user.id, 'wrongpass1'), /Incorrect password/);
  deleteAccount(db, reg.user.id, 'ResetPassword789');
  assert.equal(getUserByToken(db, afterReset.token), null);
});

test('enforces booking ownership checks and protects admin bootstrap & analytics', async () => {
  const db = createDatabase(':memory:');
  const regA = await registerUser(db, {
    name: 'User Alpha',
    email: 'alpha@trainsynk.in',
    mobile: '9876543211',
    password: 'Password123',
  });
  const regB = await registerUser(db, {
    name: 'User Beta',
    email: 'beta@trainsynk.in',
    mobile: '9876543212',
    password: 'Password123',
  });

  const journeyDate = '2026-12-10';
  const trains = searchTrains(db, { fromCode: 'SC', toCode: 'VSKP', journeyDate });
  const train = trains[0];
  const coach = train.coaches[0];
  const seats = getCoachSeats(db, train.id, coach.id, journeyDate);
  const avail = seats.find((s) => s.status === 'AVAILABLE')!;

  holdSeats(db, {
    sessionId: 'sess-A',
    trainId: train.id,
    coachId: coach.id,
    journeyDate,
    seatNumbers: [avail.seatNumber],
  });

  const booked = checkoutDemoBooking(db, {
    userId: regA.user.id,
    sessionId: 'sess-A',
    trainId: train.id,
    coachId: coach.id,
    fromCode: 'SC',
    toCode: 'VSKP',
    journeyDate,
    seatNumbers: [avail.seatNumber],
    passengers: [
      {
        seatNumber: avail.seatNumber,
        berthType: avail.berthType,
        fullName: 'User Alpha',
        age: '29',
        gender: 'Male',
      },
    ],
    paymentMethod: 'UPI',
    outcome: 'SUCCESS',
  });

  // User Beta cannot cancel User Alpha's ticket
  assert.throws(
    () => cancelBooking(db, booked.booking.pnr, regB.user.id, 'sess-B', Date.now(), 'customer'),
    /permission/
  );

  // Admin bootstrap status & first-run claim
  const bootStatus1 = getAdminBootstrapStatus(db);
  assert.equal(bootStatus1.hasAdmin, false);
  assert.equal(bootStatus1.canBootstrapFirstAdmin, true);

  const admin = bootstrapOrClaimAdmin(db, {
    name: 'Super Admin',
    email: 'admin@trainsynk.in',
    mobile: '9988776655',
    password: 'AdminPassword123',
  });
  assert.equal(admin.user.role, 'admin');

  // Bootstrap locks once claimed
  const bootStatus2 = getAdminBootstrapStatus(db);
  assert.equal(bootStatus2.hasAdmin, true);
  assert.equal(bootStatus2.canBootstrapFirstAdmin, false);

  assert.throws(
    () =>
      bootstrapOrClaimAdmin(db, {
        name: 'Rogue Admin',
        email: 'rogue@trainsynk.in',
        mobile: '9988776644',
        password: 'AdminPassword123',
      }),
    /already claimed/
  );

  // Admin analytics & CRUD reflect real DB state
  const analytics = getAdminAnalytics(db);
  assert.equal(analytics.confirmedBookings, 1);
  assert.ok(analytics.totalRevenue > 0);
  assert.equal(analytics.totalUsers, 3);

  const allBookings = listAllBookingsAdmin(db, { page: 1, limit: 10 });
  assert.equal(allBookings.total, 1);

  const usersList = listUsersAdmin(db, { page: 1, limit: 10 });
  assert.equal(usersList.total, 3);

  const updatedBeta = adminUpdateUser(
    db,
    regB.user.id,
    { role: 'operator', isActive: true },
    { id: admin.user.id, label: admin.user.email }
  );
  assert.equal(updatedBeta.role, 'operator');

  const newTrain = createTrainAdmin(
    db,
    {
      trainNumber: '12799',
      nameEn: 'Amaravati Express',
      coaches: [
        { code: 'S1', type: 'SL' },
        { code: 'B1', type: '3A' },
      ],
      stops: [
        { stationCode: 'SC', arrivalTime: null, departureTime: '06:00', distanceKm: 0, dayOffset: 0, platform: '1' },
        { stationCode: 'BZA', arrivalTime: '11:30', departureTime: null, distanceKm: 350, dayOffset: 0, platform: '2' },
      ],
    },
    { id: admin.user.id, label: admin.user.email }
  );
  assert.equal(newTrain.trainNumber, '12799');

  const updatedConfig = updateAppConfig(
    db,
    { appName: 'TRAINSYNK PRO', maxSeatsPerBooking: 5 },
    { id: admin.user.id, label: admin.user.email }
  );
  assert.equal(updatedConfig.appName, 'TRAINSYNK PRO');
  assert.equal(updatedConfig.maxSeatsPerBooking, 5);

  const updatedPricing = updatePricingRuleAdmin(
    db,
    '3A',
    { baseFare: 300 },
    { id: admin.user.id, label: admin.user.email }
  );
  assert.equal(updatedPricing['3A'].baseFare, 300);
});

test('API v1 routes enforce auth, RBAC, and return consistent JSON', async () => {
  const db = createDatabase(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api/v1', createApiRouter(db));

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;

  try {
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = (await healthRes.json()) as { ok: boolean; appName: string };
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.appName, 'TRAINSYNK');

    // Unauthenticated admin access must return 401
    const unauthAdmin = await fetch(`${baseUrl}/admin/overview`);
    assert.equal(unauthAdmin.status, 401);

    // Register normal customer
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kavya Sharma',
        email: 'kavya@trainsynk.in',
        mobile: '9848012345',
        password: 'Password123',
      }),
    });
    assert.equal(regRes.status, 201);
    const regJson = (await regRes.json()) as { token: string; user: { id: string } };
    assert.ok(regJson.token);

    // Normal customer hitting admin endpoint must return 403
    const forbiddenAdmin = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${regJson.token}` },
    });
    assert.equal(forbiddenAdmin.status, 403);

    // Bootstrap first admin and query overview
    const bootRes = await fetch(`${baseUrl}/admin/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Root Admin',
        email: 'root@trainsynk.in',
        mobile: '9848099999',
        password: 'AdminPassword123',
      }),
    });
    assert.equal(bootRes.status, 201);
    const bootJson = (await bootRes.json()) as { token: string };

    const adminRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${bootJson.token}` },
    });
    assert.equal(adminRes.status, 200);
    const overview = (await adminRes.json()) as { analytics: { totalUsers: number } };
    assert.equal(overview.analytics.totalUsers, 2);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
