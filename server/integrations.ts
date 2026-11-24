import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import type { IntegrationStatusMap } from '../src/types/railway';
import { logWarn } from './logger';
import { timingSafeEqualString } from './security';

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 2,
  timeoutMs = 8000
): Promise<globalThis.Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.status >= 500 && i + 1 < attempts) {
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (i + 1 < attempts) {
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('External request failed');
}

export function getIntegrationStatuses(dbPathLabel: string): IntegrationStatusMap {
  const smtpMissing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]?.trim());
  const twilioMissing = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'].filter(
    (k) => !process.env[k]?.trim()
  );
  const razorpayMissing = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].filter(
    (k) => !process.env[k]?.trim()
  );
  const railwayMissing = ['RAILWAY_API_BASE_URL', 'RAILWAY_API_KEY'].filter(
    (k) => !process.env[k]?.trim()
  );

  return {
    database: {
      key: 'database',
      label: 'Persistent SQLite Database',
      configured: true,
      provider: `SQLite WAL (${dbPathLabel})`,
      missingVars: [],
      description: 'Active transactional storage with schema migrations and foreign key integrity.',
    },
    realtime: {
      key: 'realtime',
      label: 'Real-Time WebSocket Engine',
      configured: true,
      provider: 'WebSocket (/ws) + SSE (/api/v1/events)',
      missingVars: [],
      description: 'Live multi-client coach seat holds, booking events, and instant notifications.',
    },
    smtpEmail: {
      key: 'smtpEmail',
      label: 'Transactional Email (SMTP)',
      configured: smtpMissing.length === 0,
      provider: 'Nodemailer SMTP',
      missingVars: smtpMissing,
      description:
        smtpMissing.length === 0
          ? 'Configured to send email verification, password reset, and ticket receipts.'
          : 'Requires SMTP credentials to send live emails; sandbox preview codes remain active until configured.',
    },
    twilioSms: {
      key: 'twilioSms',
      label: 'Mobile SMS OTP (Twilio)',
      configured: twilioMissing.length === 0,
      provider: 'Twilio REST API',
      missingVars: twilioMissing,
      description:
        twilioMissing.length === 0
          ? 'Configured to deliver live SMS OTP codes to Indian mobile numbers.'
          : 'Requires Twilio credentials for live SMS delivery; sandbox OTP testing works without SMS.',
    },
    razorpayPayments: {
      key: 'razorpayPayments',
      label: 'Payment Gateway (Razorpay)',
      configured: razorpayMissing.length === 0,
      provider: 'Razorpay Orders & Webhooks',
      missingVars: razorpayMissing,
      description:
        razorpayMissing.length === 0
          ? 'Configured for live Razorpay order creation, HMAC verification, and webhooks.'
          : 'Requires Razorpay API keys for real payments; Sandbox Checkout remains active for testing.',
    },
    officialRailwayApi: {
      key: 'officialRailwayApi',
      label: 'Official Railway Feed',
      configured: railwayMissing.length === 0,
      provider: 'External Railway REST Adapter',
      missingVars: railwayMissing,
      description:
        railwayMissing.length === 0
          ? 'Connected to external live running-status feed.'
          : 'Powered by local persistent AP & Telangana train schedule inventory until external API keys are provided.',
    },
  };
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean; mode: 'SMTP' | 'UNCONFIGURED'; error?: string }> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT || '587');
  const from = process.env.SMTP_FROM?.trim() || user || 'no-reply@trainsynk.in';

  if (!host || !user || !pass) {
    return { sent: false, mode: 'UNCONFIGURED' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { sent: true, mode: 'SMTP' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP delivery failed';
    logWarn('SMTP send failed', { to: params.to, error: message });
    return { sent: false, mode: 'SMTP', error: message };
  }
}

export async function sendSmsOtp(params: {
  mobile: string;
  code: string;
}): Promise<{ sent: boolean; mode: 'TWILIO' | 'UNCONFIGURED'; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();

  if (!sid || !token || !from) {
    return { sent: false, mode: 'UNCONFIGURED' };
  }

  try {
    const body = new URLSearchParams({
      To: `+91${params.mobile}`,
      From: from,
      Body: `Your TRAINSYNK verification code is ${params.code}. Valid for 5 minutes.`,
    });

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetchWithRetry(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
      2
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = (errJson as { message?: string }).message || `Twilio error (${res.status})`;
      logWarn('Twilio SMS error', { status: res.status, message: msg });
      return { sent: false, mode: 'TWILIO', error: msg };
    }

    return { sent: true, mode: 'TWILIO' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Twilio request failed';
    logWarn('Twilio SMS exception', { error: msg });
    return { sent: false, mode: 'TWILIO', error: msg };
  }
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

export async function createRazorpayOrder(params: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<
  | { configured: false }
  | { configured: true; orderId: string; amountPaise: number; currency: string; keyId: string }
> {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return { configured: false };
  }

  const amountPaise = Math.round(params.amountInr * 100);
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const res = await fetchWithRetry('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string };
  };

  if (!res.ok || !data.id) {
    throw new Error(data.error?.description || `Razorpay order creation failed (${res.status})`);
  }

  return {
    configured: true,
    orderId: data.id,
    amountPaise: data.amount ?? amountPaise,
    currency: data.currency ?? 'INR',
    keyId,
  };
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keySecret) return false;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');
  return timingSafeEqualString(expected, params.signature);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret || !signature) return false;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  return timingSafeEqualString(expected, signature);
}

export async function fetchOfficialTrainLiveStatus(trainNumber: string): Promise<{
  configured: boolean;
  trainNumber: string;
  liveStatus?: unknown;
  error?: string;
}> {
  const baseUrl = process.env.RAILWAY_API_BASE_URL?.trim();
  const apiKey = process.env.RAILWAY_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    return { configured: false, trainNumber };
  }

  try {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const res = await fetchWithRetry(
      `${cleanBase}/trains/${encodeURIComponent(trainNumber)}/status`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
        },
      },
      2
    );
    if (!res.ok) {
      return {
        configured: true,
        trainNumber,
        error: `External Railway API returned ${res.status}`,
      };
    }
    const liveStatus = await res.json();
    return { configured: true, trainNumber, liveStatus };
  } catch (err) {
    return {
      configured: true,
      trainNumber,
      error: err instanceof Error ? err.message : 'Live railway feed unavailable',
    };
  }
}
