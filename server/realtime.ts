import type { Server as HttpServer } from 'node:http';
import type { Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import type { DatabaseSync } from 'node:sqlite';
import { getUserByToken } from './authService';

interface ClientMeta {
  ws: WebSocket;
  coachRoom: string | null;
  userId: string | null;
  sessionId: string | null;
}

interface SseClient {
  res: Response;
  userId: string | null;
  sessionId: string | null;
}

const clients = new Set<ClientMeta>();
const sseClients = new Set<SseClient>();
let wssInstance: WebSocketServer | null = null;

export function makeCoachRoomKey(trainId: string, coachId: string, journeyDate: string): string {
  return `coach:${trainId}:${coachId}:${journeyDate}`;
}

export function initRealtimeServer(httpServer: HttpServer, db: DatabaseSync): void {
  if (wssInstance) return;

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wssInstance = wss;

  wss.on('connection', (ws) => {
    const meta: ClientMeta = {
      ws,
      coachRoom: null,
      userId: null,
      sessionId: null,
    };
    clients.add(meta);

    ws.send(
      JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
      })
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          trainId?: string;
          coachId?: string;
          journeyDate?: string;
          token?: string | null;
          sessionId?: string | null;
        };

        if (msg.type === 'auth') {
          meta.sessionId = msg.sessionId ? String(msg.sessionId) : null;
          if (msg.token) {
            const user = getUserByToken(db, String(msg.token));
            meta.userId = user?.id ?? null;
          } else {
            meta.userId = null;
          }
        } else if (
          msg.type === 'subscribe_coach' &&
          msg.trainId &&
          msg.coachId &&
          msg.journeyDate
        ) {
          meta.coachRoom = makeCoachRoomKey(
            String(msg.trainId),
            String(msg.coachId),
            String(msg.journeyDate)
          );
          ws.send(
            JSON.stringify({
              type: 'subscribed_coach',
              room: meta.coachRoom,
              timestamp: Date.now(),
            })
          );
        } else if (msg.type === 'unsubscribe_coach') {
          meta.coachRoom = null;
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // Ignore malformed WS payloads
      }
    });

    ws.on('close', () => {
      clients.delete(meta);
    });
  });

  // Periodic heartbeat to prune dead sockets
  const hb = setInterval(() => {
    for (const c of clients) {
      if (c.ws.readyState !== WebSocket.OPEN) {
        clients.delete(c);
      }
    }
  }, 30_000);
  hb.unref();
}

export function registerSseClient(res: Response, userId: string | null, sessionId: string | null): () => void {
  const client: SseClient = { res, userId, sessionId };
  sseClients.add(client);
  return () => {
    sseClients.delete(client);
  };
}

export function broadcastCoachUpdate(
  trainId: string,
  coachId: string,
  journeyDate: string,
  event: {
    action: 'SEATS_HELD' | 'SEATS_RELEASED' | 'SEATS_BOOKED' | 'SEATS_CANCELLED' | 'HOLDS_EXPIRED';
    seatNumbers?: number[];
  }
): void {
  const room = makeCoachRoomKey(trainId, coachId, journeyDate);
  const payload = JSON.stringify({
    type: 'coach_update',
    trainId,
    coachId,
    journeyDate,
    ...event,
    timestamp: Date.now(),
  });

  for (const c of clients) {
    if (c.coachRoom === room && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(payload);
    }
  }
}

export function broadcastUserEvent(
  userId: string | null,
  sessionId: string | null,
  event: Record<string, unknown>
): void {
  const payload = JSON.stringify({
    ...event,
    timestamp: Date.now(),
  });

  for (const c of clients) {
    if (c.ws.readyState !== WebSocket.OPEN) continue;
    const matchesUser = userId && c.userId === userId;
    const matchesSession = sessionId && c.sessionId === sessionId;
    if (matchesUser || matchesSession) {
      c.ws.send(payload);
    }
  }

  for (const sse of sseClients) {
    const matchesUser = userId && sse.userId === userId;
    const matchesSession = sessionId && sse.sessionId === sessionId;
    if (matchesUser || matchesSession) {
      sse.res.write(`data: ${payload}\n\n`);
    }
  }
}

export function broadcastGlobalEvent(event: Record<string, unknown>): void {
  const payload = JSON.stringify({
    ...event,
    timestamp: Date.now(),
  });
  for (const c of clients) {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(payload);
    }
  }
  for (const sse of sseClients) {
    sse.res.write(`data: ${payload}\n\n`);
  }
}

export function getRealtimeStats() {
  const rooms = new Set<string>();
  let openWs = 0;
  for (const c of clients) {
    if (c.ws.readyState === WebSocket.OPEN) {
      openWs += 1;
      if (c.coachRoom) rooms.add(c.coachRoom);
    }
  }
  return {
    connectedWebSockets: openWs,
    connectedSseStreams: sseClients.size,
    activeCoachRooms: rooms.size,
  };
}
