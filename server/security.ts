import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.startsWith('scrypt:')) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, hexHash] = parts;
  try {
    const expected = Buffer.from(hexHash, 'hex');
    const actual = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashVerificationCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isValidEmail(email: string): boolean {
  const clean = email.trim();
  if (!clean || clean.length > 180) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
}

export function isValidIndianMobile(mobile: string): boolean {
  const clean = mobile.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(clean);
}

export function normalizeMobile(mobile: string): string {
  return mobile.replace(/\D/g, '').slice(-10);
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (typeof password !== 'string' || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters.' };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one letter and one number.',
    };
  }
  return { valid: true };
}

export function sanitizeText(value: unknown, maxLen = 160): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Security headers middleware compatible with embedded AI Studio iframe previews.
 * Intentionally omits X-Frame-Options so iframe preview works while enforcing nosniff,
 * strict referrer policy, and HTTPS transport protection when served over TLS.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/**
 * In-memory sliding window rate limiter keyed by route prefix + client IP.
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}) {
  const buckets = new Map<string, number[]>();

  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [key, timestamps] of buckets.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) {
        buckets.delete(key);
      } else {
        buckets.set(key, fresh);
      }
    }
  }, Math.max(30_000, options.windowMs));
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }
    const ip = getClientIp(req);
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    const cutoff = now - options.windowMs;
    const timestamps = (buckets.get(key) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((timestamps[0] + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    timestamps.push(now);
    buckets.set(key, timestamps);
    next();
  };
}

/**
 * CSRF protection for cookie-authenticated mutations.
 * Verifies either Authorization Bearer header, custom X-Requested-With header,
 * or same-host Origin/Referer on mutating requests.
 */
export function verifyCsrfOriginMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  // Webhook endpoint uses its own cryptographic signature verification
  if (req.path.startsWith('/webhooks/')) {
    next();
    return;
  }

  // Bearer token auth is inherently immune to CSRF
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  // Requests without a session cookie don't carry cookie credentials
  if (!req.headers.cookie || !req.headers.cookie.includes('trainsynk_session')) {
    next();
    return;
  }

  if (req.headers['x-requested-with'] === 'TRAINSYNK') {
    next();
    return;
  }

  const hostHeader = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  const matchesHost = (urlCandidate: string | undefined): boolean => {
    if (!urlCandidate || !hostHeader) return false;
    try {
      const parsed = new URL(urlCandidate);
      return parsed.host.toLowerCase() === hostHeader;
    } catch {
      return false;
    }
  };

  if (matchesHost(originHeader) || matchesHost(refererHeader)) {
    next();
    return;
  }

  res.status(403).json({
    error: 'Cross-origin request rejected. Include a valid Origin or Bearer token.',
  });
}
