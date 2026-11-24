import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'token',
  'authtoken',
  'authorization',
  'cookie',
  'otp',
  'secret',
  'passcode',
  'signature',
]);

export function redactSensitive(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSensitive(v);
      }
    }
    return out;
  }
  return value;
}

export interface SystemEventRecord {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  timestamp: number;
}

const recentEvents: SystemEventRecord[] = [];
let totalRequestsCount = 0;
let totalErrorsCount = 0;
const startTimeMs = Date.now();

function pushEvent(entry: Omit<SystemEventRecord, 'id' | 'timestamp'>): void {
  recentEvents.unshift({
    ...entry,
    id: `EVT-${crypto.randomUUID().slice(0, 8)}`,
    timestamp: Date.now(),
  });
  if (recentEvents.length > 100) {
    recentEvents.length = 100;
  }
}

export function trackHttpRequest(params: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}): void {
  totalRequestsCount += 1;
  if (params.statusCode >= 500) {
    totalErrorsCount += 1;
    pushEvent({
      level: 'ERROR',
      message: `HTTP ${params.statusCode} on ${params.method} ${params.path}`,
      method: params.method,
      path: params.path,
      statusCode: params.statusCode,
      durationMs: params.durationMs,
    });
  }
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  const safeMeta = meta ? redactSensitive(meta) : undefined;
  if (process.env.NODE_ENV !== 'test') {
    console.log(JSON.stringify({ level: 'INFO', message, ...(safeMeta ? { meta: safeMeta } : {}), ts: new Date().toISOString() }));
  }
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  const safeMeta = meta ? redactSensitive(meta) : undefined;
  pushEvent({ level: 'WARN', message });
  if (process.env.NODE_ENV !== 'test') {
    console.warn(JSON.stringify({ level: 'WARN', message, ...(safeMeta ? { meta: safeMeta } : {}), ts: new Date().toISOString() }));
  }
}

export function logError(message: string, err?: unknown, meta?: Record<string, unknown>): void {
  totalErrorsCount += 1;
  const errMsg = err instanceof Error ? err.message : String(err ?? '');
  pushEvent({ level: 'ERROR', message: errMsg ? `${message}: ${errMsg}` : message });
  const safeMeta = meta ? redactSensitive(meta) : undefined;
  if (process.env.NODE_ENV !== 'test') {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        message,
        error: errMsg || undefined,
        ...(safeMeta ? { meta: safeMeta } : {}),
        ts: new Date().toISOString(),
      })
    );
  }
}

export function getTelemetrySummary() {
  return {
    uptimeSeconds: Math.floor((Date.now() - startTimeMs) / 1000),
    totalRequests: totalRequestsCount,
    totalErrors: totalErrorsCount,
    recentEvents: recentEvents.slice(0, 50),
  };
}

export function recordAuditLog(
  db: DatabaseSync,
  input: {
    actorId: string | null;
    actorLabel: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    nowMs?: number;
  }
): void {
  try {
    const id = `AUD-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
    const safeMeta = redactSensitive(input.metadata ?? {});
    db.prepare(
      `INSERT INTO audit_logs (id, actor_id, actor_label, action, target_type, target_id, metadata_json, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.actorId,
      input.actorLabel,
      input.action,
      input.targetType,
      input.targetId ?? null,
      JSON.stringify(safeMeta),
      input.ipAddress ?? 'system',
      input.nowMs ?? Date.now()
    );
  } catch (err) {
    logError('Failed to write audit log', err);
  }
}
