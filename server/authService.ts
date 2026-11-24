import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { CustomerUser, UserRole, UserSessionInfo } from '../src/types/railway';
import { sendSmsOtp, sendTransactionalEmail } from './integrations';
import { recordAuditLog } from './logger';
import {
  generateSessionToken,
  hashPassword,
  hashToken,
  hashVerificationCode,
  isValidEmail,
  isValidIndianMobile,
  normalizeMobile,
  sanitizeText,
  timingSafeEqualString,
  verifyPassword,
  validatePasswordStrength,
} from './security';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFICATION_TTL_MS = 15 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;

interface DbUserRow {
  id: string;
  mobile: string;
  name: string;
  email: string;
  age: number | null;
  gender: CustomerUser['gender'];
  password_hash: string | null;
  role: UserRole;
  is_verified: number;
  is_active: number;
  created_at: number;
  last_login_at: number | null;
}

function mapUserRow(row: DbUserRow): CustomerUser {
  return {
    id: row.id,
    mobile: row.mobile,
    name: row.name,
    email: row.email,
    age: row.age,
    gender: row.gender,
    role: (row.role || 'customer') as UserRole,
    isVerified: Boolean(row.is_verified),
    isActive: row.is_active === undefined ? true : Boolean(row.is_active),
    hasPassword: Boolean(row.password_hash),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? null,
  };
}

function createSession(
  db: DatabaseSync,
  user: DbUserRow,
  meta: { userAgent?: string; ipAddress?: string; nowMs?: number }
): string {
  const now = meta.nowMs ?? Date.now();
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const sessionId = `SES-${crypto.randomUUID().slice(0, 12)}`;

  db.prepare(
    `INSERT INTO sessions (token, token_hash, user_id, mobile, user_agent, ip_address, created_at, expires_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`
  ).run(
    sessionId,
    tokenHash,
    user.id,
    user.mobile,
    sanitizeText(meta.userAgent ?? '', 200),
    sanitizeText(meta.ipAddress ?? '', 64),
    now,
    now + SESSION_TTL_MS
  );

  return rawToken;
}

function linkGuestSessionData(db: DatabaseSync, userId: string, sessionId?: string): void {
  if (!sessionId || sessionId === 'DEMO-GLOBAL') return;
  db.prepare(
    `UPDATE bookings SET user_id = ? WHERE session_id = ? AND user_id IS NULL`
  ).run(userId, sessionId);
  db.prepare(
    `UPDATE notifications SET user_id = ? WHERE session_id = ? AND user_id IS NULL`
  ).run(userId, sessionId);
}

export async function registerUser(
  db: DatabaseSync,
  input: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<{
  token: string;
  user: CustomerUser;
  verificationDelivery: { sent: boolean; mode: 'SMTP' | 'UNCONFIGURED'; sandboxCode?: string };
}> {
  const name = sanitizeText(input.name, 80);
  const email = sanitizeText(input.email, 180).toLowerCase();
  const mobile = normalizeMobile(input.mobile);

  if (name.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }
  if (!isValidEmail(email)) {
    throw new Error('Enter a valid email address.');
  }
  if (!isValidIndianMobile(mobile)) {
    throw new Error('Enter a valid 10-digit Indian mobile number starting with 6–9.');
  }
  const pwCheck = validatePasswordStrength(input.password);
  if (!pwCheck.valid) {
    throw new Error(pwCheck.message);
  }

  const existingEmail = db
    .prepare('SELECT id FROM users WHERE lower(email) = ?')
    .get(email) as { id: string } | undefined;
  if (existingEmail) {
    throw new Error('An account with this email already exists.');
  }

  const existingMobile = db
    .prepare('SELECT id, password_hash FROM users WHERE mobile = ?')
    .get(mobile) as { id: string; password_hash: string | null } | undefined;
  if (existingMobile) {
    throw new Error('An account with this mobile number already exists.');
  }

  const now = Date.now();
  const userId = `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const passwordHash = hashPassword(input.password);

  db.prepare(
    `INSERT INTO users (id, mobile, name, email, age, gender, password_hash, role, is_verified, is_active, created_at, updated_at, last_login_at)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, 'customer', 0, 1, ?, ?, ?)`
  ).run(userId, mobile, name, email, passwordHash, now, now, now);

  linkGuestSessionData(db, userId, input.sessionId);

  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(userId) as unknown as DbUserRow;
  const token = createSession(db, userRow, {
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    nowMs: now,
  });

  // Create email verification code
  const verifyCode = String(crypto.randomInt(100000, 999999));
  db.prepare(
    `INSERT INTO verification_tokens (id, user_id, target, purpose, code_hash, expires_at, used_at, created_at)
     VALUES (?, ?, ?, 'EMAIL_VERIFY', ?, ?, NULL, ?)`
  ).run(
    `VRF-${crypto.randomUUID().slice(0, 10)}`,
    userId,
    email,
    hashVerificationCode(verifyCode),
    now + VERIFICATION_TTL_MS,
    now
  );

  const emailRes = await sendTransactionalEmail({
    to: email,
    subject: 'Verify your TRAINSYNK account',
    text: `Welcome to TRAINSYNK, ${name}! Your verification code is ${verifyCode}. It expires in 15 minutes.`,
  });

  recordAuditLog(db, {
    actorId: userId,
    actorLabel: email,
    action: 'USER_REGISTERED',
    targetType: 'USER',
    targetId: userId,
    ipAddress: input.ipAddress,
    nowMs: now,
  });

  return {
    token,
    user: mapUserRow(userRow),
    verificationDelivery: {
      sent: emailRes.sent,
      mode: emailRes.mode,
      ...(emailRes.mode === 'UNCONFIGURED' ? { sandboxCode: verifyCode } : {}),
    },
  };
}

export function loginWithPassword(
  db: DatabaseSync,
  input: {
    identifier: string;
    password: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
  }
): { token: string; user: CustomerUser } {
  const rawId = sanitizeText(input.identifier, 180);
  if (!rawId || !input.password) {
    throw new Error('Email/mobile and password are required.');
  }

  let userRow: DbUserRow | undefined;
  if (rawId.includes('@')) {
    userRow = db
      .prepare('SELECT * FROM users WHERE lower(email) = ?')
      .get(rawId.toLowerCase()) as DbUserRow | undefined;
  } else {
    const mobile = normalizeMobile(rawId);
    userRow = db
      .prepare('SELECT * FROM users WHERE mobile = ?')
      .get(mobile) as DbUserRow | undefined;
  }

  if (!userRow || !verifyPassword(input.password, userRow.password_hash)) {
    throw new Error('Invalid email/mobile or password.');
  }
  if (!userRow.is_active) {
    throw new Error('This account has been suspended. Contact support.');
  }

  const now = Date.now();
  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(
    now,
    now,
    userRow.id
  );
  linkGuestSessionData(db, userRow.id, input.sessionId);

  const refreshed = db.prepare('SELECT * FROM users WHERE id = ?').get(userRow.id) as unknown as DbUserRow;
  const token = createSession(db, refreshed, {
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    nowMs: now,
  });

  recordAuditLog(db, {
    actorId: refreshed.id,
    actorLabel: refreshed.email || refreshed.mobile,
    action: 'USER_LOGIN_PASSWORD',
    targetType: 'USER',
    targetId: refreshed.id,
    ipAddress: input.ipAddress,
    nowMs: now,
  });

  return { token, user: mapUserRow(refreshed) };
}

export async function requestOtpLogin(
  db: DatabaseSync,
  mobileInput: string,
  nowMs: number = Date.now()
): Promise<{
  mobile: string;
  expiresInSeconds: number;
  deliveryMode: 'TWILIO' | 'SANDBOX';
  sandboxOtpPreview?: string;
}> {
  const clean = normalizeMobile(mobileInput);
  if (!isValidIndianMobile(clean)) {
    throw new Error('Enter a valid 10-digit Indian mobile number starting with 6–9.');
  }

  const otp = String(crypto.randomInt(100000, 999999));
  const expiresAt = nowMs + OTP_TTL_MS;

  db.prepare(
    `UPDATE verification_tokens SET used_at = ? WHERE target = ? AND purpose = 'LOGIN_OTP' AND used_at IS NULL`
  ).run(nowMs, clean, clean);

  db.prepare(
    `INSERT INTO verification_tokens (id, user_id, target, purpose, code_hash, expires_at, used_at, created_at)
     VALUES (?, NULL, ?, 'LOGIN_OTP', ?, ?, NULL, ?)`
  ).run(
    `OTP-${crypto.randomUUID().slice(0, 10)}`,
    clean,
    hashVerificationCode(otp),
    expiresAt,
    nowMs
  );

  // Also keep otp_challenges updated for legacy compatibility
  db.prepare('INSERT OR REPLACE INTO otp_challenges (mobile, otp_code, expires_at) VALUES (?, ?, ?)').run(
    clean,
    hashVerificationCode(otp),
    expiresAt
  );

  const smsRes = await sendSmsOtp({ mobile: clean, code: otp });
  if (smsRes.mode === 'TWILIO' && !smsRes.sent) {
    throw new Error(smsRes.error || 'Failed to send SMS OTP via Twilio.');
  }

  return {
    mobile: clean,
    expiresInSeconds: 300,
    deliveryMode: smsRes.mode === 'TWILIO' ? 'TWILIO' : 'SANDBOX',
    ...(smsRes.mode === 'UNCONFIGURED' ? { sandboxOtpPreview: otp } : {}),
  };
}

export function verifyOtpLogin(
  db: DatabaseSync,
  input: {
    mobile: string;
    otp: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    nowMs?: number;
  }
): { token: string; user: CustomerUser } {
  const now = input.nowMs ?? Date.now();
  const clean = normalizeMobile(input.mobile);
  const codeHash = hashVerificationCode(input.otp);

  const tokenRow = db
    .prepare(
      `SELECT id, code_hash, expires_at
       FROM verification_tokens
       WHERE target = ? AND purpose = 'LOGIN_OTP' AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(clean) as { id: string; code_hash: string; expires_at: number } | undefined;

  if (!tokenRow || !timingSafeEqualString(tokenRow.code_hash, codeHash) || tokenRow.expires_at < now) {
    throw new Error('Invalid or expired OTP. Please request a fresh code.');
  }

  db.prepare('UPDATE verification_tokens SET used_at = ? WHERE id = ?').run(now, tokenRow.id);
  db.prepare('DELETE FROM otp_challenges WHERE mobile = ?').run(clean);

  let userRow = db.prepare('SELECT * FROM users WHERE mobile = ?').get(clean) as DbUserRow | undefined;
  if (!userRow) {
    const newId = `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    db.prepare(
      `INSERT INTO users (id, mobile, name, email, age, gender, password_hash, role, is_verified, is_active, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, '', NULL, NULL, NULL, 'customer', 1, 1, ?, ?, ?)`
    ).run(newId, clean, `Traveller ${clean.slice(-4)}`, now, now, now);
    userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(newId) as unknown as DbUserRow;
  } else {
    if (!userRow.is_active) {
      throw new Error('This account has been suspended. Contact support.');
    }
    db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(
      now,
      now,
      userRow.id
    );
    userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userRow.id) as unknown as DbUserRow;
  }

  linkGuestSessionData(db, userRow.id, input.sessionId);

  const token = createSession(db, userRow, {
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    nowMs: now,
  });

  recordAuditLog(db, {
    actorId: userRow.id,
    actorLabel: userRow.email || userRow.mobile,
    action: 'USER_LOGIN_OTP',
    targetType: 'USER',
    targetId: userRow.id,
    ipAddress: input.ipAddress,
    nowMs: now,
  });

  return { token, user: mapUserRow(userRow) };
}

export async function requestEmailVerification(
  db: DatabaseSync,
  userId: string
): Promise<{ sent: boolean; mode: 'SMTP' | 'UNCONFIGURED'; sandboxCode?: string }> {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DbUserRow | undefined;
  if (!user || !user.email) {
    throw new Error('Add an email address to your profile first.');
  }
  const now = Date.now();
  const code = String(crypto.randomInt(100000, 999999));

  db.prepare(
    `UPDATE verification_tokens SET used_at = ? WHERE user_id = ? AND purpose = 'EMAIL_VERIFY' AND used_at IS NULL`
  ).run(now, userId);

  db.prepare(
    `INSERT INTO verification_tokens (id, user_id, target, purpose, code_hash, expires_at, used_at, created_at)
     VALUES (?, ?, ?, 'EMAIL_VERIFY', ?, ?, NULL, ?)`
  ).run(
    `VRF-${crypto.randomUUID().slice(0, 10)}`,
    userId,
    user.email.toLowerCase(),
    hashVerificationCode(code),
    now + VERIFICATION_TTL_MS,
    now
  );

  const res = await sendTransactionalEmail({
    to: user.email,
    subject: 'TRAINSYNK Email Verification Code',
    text: `Your TRAINSYNK email verification code is ${code}. Valid for 15 minutes.`,
  });

  return {
    sent: res.sent,
    mode: res.mode,
    ...(res.mode === 'UNCONFIGURED' ? { sandboxCode: code } : {}),
  };
}

export function verifyEmailCode(db: DatabaseSync, userId: string, code: string): CustomerUser {
  const now = Date.now();
  const codeHash = hashVerificationCode(code);
  const row = db
    .prepare(
      `SELECT id, code_hash, expires_at FROM verification_tokens
       WHERE user_id = ? AND purpose = 'EMAIL_VERIFY' AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(userId) as { id: string; code_hash: string; expires_at: number } | undefined;

  if (!row || !timingSafeEqualString(row.code_hash, codeHash) || row.expires_at < now) {
    throw new Error('Invalid or expired verification code.');
  }

  db.prepare('UPDATE verification_tokens SET used_at = ? WHERE id = ?').run(now, row.id);
  db.prepare('UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?').run(now, userId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as DbUserRow;
  return mapUserRow(updated);
}

export async function requestPasswordReset(
  db: DatabaseSync,
  emailInput: string
): Promise<{
  requested: boolean;
  deliveryMode: 'SMTP' | 'UNCONFIGURED';
  sandboxResetCode?: string;
}> {
  const email = sanitizeText(emailInput, 180).toLowerCase();
  if (!isValidEmail(email)) {
    throw new Error('Enter a valid email address.');
  }

  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email) as DbUserRow | undefined;
  if (!user) {
    // Do not leak account existence when SMTP is configured; in unconfigured sandbox explain clearly
    return { requested: true, deliveryMode: process.env.SMTP_HOST ? 'SMTP' : 'UNCONFIGURED' };
  }

  const now = Date.now();
  const code = String(crypto.randomInt(100000, 999999));

  db.prepare(
    `UPDATE verification_tokens SET used_at = ? WHERE user_id = ? AND purpose = 'PASSWORD_RESET' AND used_at IS NULL`
  ).run(now, user.id);

  db.prepare(
    `INSERT INTO verification_tokens (id, user_id, target, purpose, code_hash, expires_at, used_at, created_at)
     VALUES (?, ?, ?, 'PASSWORD_RESET', ?, ?, NULL, ?)`
  ).run(
    `RST-${crypto.randomUUID().slice(0, 10)}`,
    user.id,
    email,
    hashVerificationCode(code),
    now + VERIFICATION_TTL_MS,
    now
  );

  const emailRes = await sendTransactionalEmail({
    to: email,
    subject: 'TRAINSYNK Password Reset Code',
    text: `Use code ${code} to reset your TRAINSYNK password. This code expires in 15 minutes.`,
  });

  return {
    requested: true,
    deliveryMode: emailRes.mode,
    ...(emailRes.mode === 'UNCONFIGURED' ? { sandboxResetCode: code } : {}),
  };
}

export function resetPasswordWithCode(
  db: DatabaseSync,
  input: { email: string; code: string; newPassword: string; ipAddress?: string }
): void {
  const email = sanitizeText(input.email, 180).toLowerCase();
  if (!isValidEmail(email)) {
    throw new Error('Enter a valid email address.');
  }
  const pwCheck = validatePasswordStrength(input.newPassword);
  if (!pwCheck.valid) {
    throw new Error(pwCheck.message);
  }

  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email) as DbUserRow | undefined;
  if (!user) {
    throw new Error('Invalid reset code or email.');
  }

  const now = Date.now();
  const codeHash = hashVerificationCode(input.code);
  const row = db
    .prepare(
      `SELECT id, code_hash, expires_at FROM verification_tokens
       WHERE user_id = ? AND target = ? AND purpose = 'PASSWORD_RESET' AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(user.id, email) as { id: string; code_hash: string; expires_at: number } | undefined;

  if (!row || !timingSafeEqualString(row.code_hash, codeHash) || row.expires_at < now) {
    throw new Error('Invalid or expired password reset code.');
  }

  const newHash = hashPassword(input.newPassword);
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE verification_tokens SET used_at = ? WHERE id = ?').run(now, row.id);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      newHash,
      now,
      user.id
    );
    // Revoke all active sessions on password reset
    db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(
      now,
      user.id
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  recordAuditLog(db, {
    actorId: user.id,
    actorLabel: email,
    action: 'PASSWORD_RESET',
    targetType: 'USER',
    targetId: user.id,
    ipAddress: input.ipAddress,
    nowMs: now,
  });
}

export function changePassword(
  db: DatabaseSync,
  userId: string,
  input: { currentPassword?: string; newPassword: string; ipAddress?: string }
): void {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DbUserRow | undefined;
  if (!user) throw new Error('User not found.');

  if (user.password_hash) {
    if (!input.currentPassword || !verifyPassword(input.currentPassword, user.password_hash)) {
      throw new Error('Current password is incorrect.');
    }
  }

  const pwCheck = validatePasswordStrength(input.newPassword);
  if (!pwCheck.valid) {
    throw new Error(pwCheck.message);
  }

  const now = Date.now();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(input.newPassword),
    now,
    userId
  );

  recordAuditLog(db, {
    actorId: userId,
    actorLabel: user.email || user.mobile,
    action: 'PASSWORD_CHANGED',
    targetType: 'USER',
    targetId: userId,
    ipAddress: input.ipAddress,
    nowMs: now,
  });
}

export function getUserByToken(
  db: DatabaseSync,
  token: string | null | undefined,
  nowMs: number = Date.now()
): CustomerUser | null {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = db
    .prepare(
      `SELECT user_id, expires_at, revoked_at
       FROM sessions
       WHERE (token_hash = ? OR token = ?)
       LIMIT 1`
    )
    .get(tokenHash, token) as
    | { user_id: string; expires_at: number; revoked_at: number | null }
    | undefined;

  if (!session || session.revoked_at !== null || session.expires_at < nowMs) {
    return null;
  }

  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(session.user_id) as DbUserRow | undefined;

  if (!userRow || !userRow.is_active) return null;
  return mapUserRow(userRow);
}

export function listUserSessions(
  db: DatabaseSync,
  userId: string,
  currentToken: string | null
): UserSessionInfo[] {
  const now = Date.now();
  const currentHash = currentToken ? hashToken(currentToken) : null;
  const rows = db
    .prepare(
      `SELECT token, token_hash, user_agent, ip_address, created_at, expires_at
       FROM sessions
       WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC`
    )
    .all(userId, now) as Array<{
    token: string;
    token_hash: string | null;
    user_agent: string;
    ip_address: string;
    created_at: number;
    expires_at: number;
  }>;

  return rows.map((r) => ({
    id: r.token,
    userAgent: r.user_agent || 'Web Browser',
    ipAddress: r.ip_address || 'unknown',
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    isCurrent: Boolean(currentHash && (r.token_hash === currentHash || r.token === currentToken)),
  }));
}

export function revokeSessionById(db: DatabaseSync, userId: string, sessionId: string): void {
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE token = ? AND user_id = ?').run(
    Date.now(),
    sessionId,
    userId
  );
}

export function logoutToken(db: DatabaseSync, token: string | null): void {
  if (!token) return;
  const tokenHash = hashToken(token);
  db.prepare(
    'UPDATE sessions SET revoked_at = ? WHERE token_hash = ? OR token = ?'
  ).run(Date.now(), tokenHash, token);
}

export function updateUserProfile(
  db: DatabaseSync,
  userId: string,
  updates: {
    name: string;
    email: string;
    age: number | null;
    gender: CustomerUser['gender'];
  }
): CustomerUser {
  const name = sanitizeText(updates.name, 80);
  const email = sanitizeText(updates.email, 180).toLowerCase();
  if (name.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }
  if (email && !isValidEmail(email)) {
    throw new Error('Enter a valid email address.');
  }
  if (updates.age !== null && (!Number.isFinite(updates.age) || updates.age < 1 || updates.age > 115)) {
    throw new Error('Age must be between 1 and 115.');
  }

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DbUserRow | undefined;
  if (!existing) throw new Error('User not found.');

  if (email && email !== existing.email.toLowerCase()) {
    const conflict = db
      .prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?')
      .get(email, userId) as { id: string } | undefined;
    if (conflict) {
      throw new Error('That email address is already registered to another account.');
    }
  }

  const emailChanged = email !== existing.email.toLowerCase();
  const nextVerified = emailChanged ? 0 : existing.is_verified;

  db.prepare(
    `UPDATE users SET name = ?, email = ?, age = ?, gender = ?, is_verified = ?, updated_at = ? WHERE id = ?`
  ).run(name, email, updates.age, updates.gender, nextVerified, Date.now(), userId);

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as DbUserRow;
  return mapUserRow(row);
}

export function deleteAccount(
  db: DatabaseSync,
  userId: string,
  password: string,
  ipAddress?: string
): void {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DbUserRow | undefined;
  if (!user) throw new Error('User not found.');

  if (user.password_hash) {
    if (!password || !verifyPassword(password, user.password_hash)) {
      throw new Error('Incorrect password. Account deletion aborted.');
    }
  }

  const now = Date.now();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM passenger_profiles WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM verification_tokens WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
    // Anonymize bookings rather than breaking seat inventory history
    db.prepare('UPDATE bookings SET user_id = NULL WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  recordAuditLog(db, {
    actorId: null,
    actorLabel: user.email || user.mobile,
    action: 'USER_ACCOUNT_DELETED',
    targetType: 'USER',
    targetId: userId,
    ipAddress,
    nowMs: now,
  });
}

export function getAdminBootstrapStatus(db: DatabaseSync): {
  hasAdmin: boolean;
  requiresPasscode: boolean;
  canBootstrapFirstAdmin: boolean;
} {
  const adminCount = db
    .prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_active = 1")
    .get() as { cnt: number };
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  const hasAdmin = adminCount.cnt > 0;
  return {
    hasAdmin,
    requiresPasscode: Boolean(envPasscode),
    canBootstrapFirstAdmin: !hasAdmin && !envPasscode,
  };
}

export function bootstrapOrClaimAdmin(
  db: DatabaseSync,
  input: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    passcode?: string;
    userAgent?: string;
    ipAddress?: string;
  }
): { token: string; user: CustomerUser } {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  const adminCount = db
    .prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_active = 1")
    .get() as { cnt: number };

  if (envPasscode) {
    if (!input.passcode || !timingSafeEqualString(input.passcode, envPasscode)) {
      throw new Error('Invalid Admin Passcode.');
    }
  } else if (adminCount.cnt > 0) {
    throw new Error('Admin account is already claimed. Sign in with your Admin credentials.');
  }

  const name = sanitizeText(input.name, 80);
  const email = sanitizeText(input.email, 180).toLowerCase();
  const mobile = normalizeMobile(input.mobile);

  if (name.length < 2) throw new Error('Admin name must be at least 2 characters.');
  if (!isValidEmail(email)) throw new Error('Enter a valid admin email.');
  if (!isValidIndianMobile(mobile)) {
    throw new Error('Enter a valid 10-digit Indian mobile number starting with 6–9.');
  }
  const pwCheck = validatePasswordStrength(input.password);
  if (!pwCheck.valid) throw new Error(pwCheck.message);

  const now = Date.now();
  const passwordHash = hashPassword(input.password);

  const existing = db
    .prepare('SELECT * FROM users WHERE lower(email) = ? OR mobile = ?')
    .get(email, mobile) as DbUserRow | undefined;

  let adminId: string;
  if (existing) {
    // Only allow upgrading via valid envPasscode or when no admin exists yet
    adminId = existing.id;
    db.prepare(
      `UPDATE users
       SET name = ?, email = ?, mobile = ?, password_hash = ?, role = 'admin', is_verified = 1, is_active = 1, updated_at = ?, last_login_at = ?
       WHERE id = ?`
    ).run(name, email, mobile, passwordHash, now, now, adminId);
  } else {
    adminId = `ADM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    db.prepare(
      `INSERT INTO users (id, mobile, name, email, age, gender, password_hash, role, is_verified, is_active, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, 'admin', 1, 1, ?, ?, ?)`
    ).run(adminId, mobile, name, email, passwordHash, now, now, now);
  }

  const adminRow = db.prepare('SELECT * FROM users WHERE id = ?').get(adminId) as unknown as DbUserRow;
  const token = createSession(db, adminRow, {
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    nowMs: now,
  });

  recordAuditLog(db, {
    actorId: adminId,
    actorLabel: email,
    action: 'ADMIN_BOOTSTRAP_CLAIMED',
    targetType: 'USER',
    targetId: adminId,
    ipAddress: input.ipAddress,
    nowMs: now,
  });

  return { token, user: mapUserRow(adminRow) };
}
