export type RealtimeEvent =
  | {
      type: 'coach_update';
      trainId: string;
      coachId: string;
      journeyDate: string;
      action: string;
      seatNumbers?: number[];
      timestamp: number;
    }
  | {
      type: 'notification:new';
      notification: unknown;
      timestamp: number;
    }
  | {
      type: 'booking:created' | 'booking:updated';
      pnr: string;
      status?: string;
      timestamp: number;
    }
  | {
      type: 'config_updated';
      config: unknown;
      timestamp: number;
    }
  | {
      type: 'holds_expired';
      count: number;
      timestamp: number;
    };

type Listener = (event: RealtimeEvent) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private currentCoachSub: { trainId: string; coachId: string; journeyDate: string } | null = null;
  private currentAuth: { token: string | null; sessionId: string } | null = null;
  private disposed = false;

  connect(sessionId: string, token: string | null): void {
    this.disposed = false;
    this.currentAuth = { token, sessionId };
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'auth', token, sessionId }));
      }
      return;
    }
    this.openSocket();
  }

  private openSocket(): void {
    if (this.disposed || typeof window === 'undefined') return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempt = 0;
        if (this.currentAuth) {
          ws.send(
            JSON.stringify({
              type: 'auth',
              token: this.currentAuth.token,
              sessionId: this.currentAuth.sessionId,
            })
          );
        }
        if (this.currentCoachSub) {
          ws.send(
            JSON.stringify({
              type: 'subscribe_coach',
              ...this.currentCoachSub,
            })
          );
        }
      };

      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(String(evt.data)) as RealtimeEvent;
          if (parsed && parsed.type) {
            for (const fn of this.listeners) {
              fn(parsed);
            }
          }
        } catch {
          // Ignore invalid payloads
        }
      };

      ws.onclose = () => {
        this.ws = null;
        if (!this.disposed) {
          const delay = Math.min(10_000, 1000 * Math.pow(1.5, this.reconnectAttempt));
          this.reconnectAttempt += 1;
          this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay);
        }
      };

      ws.onerror = () => {
        // Closed handler handles reconnect cleanly
      };
    } catch {
      // Ignore connection setup error
    }
  }

  subscribeCoach(trainId: string, coachId: string, journeyDate: string): void {
    this.currentCoachSub = { trainId, coachId, journeyDate };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'subscribe_coach',
          trainId,
          coachId,
          journeyDate,
        })
      );
    }
  }

  unsubscribeCoach(): void {
    this.currentCoachSub = null;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe_coach' }));
    }
  }

  onEvent(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  disconnect(): void {
    this.disposed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}

export const realtimeClient = new RealtimeClient();
