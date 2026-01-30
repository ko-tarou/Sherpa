import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = (() => {
  const u = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return u.replace(/^http/, 'ws');
})();

const MAX_RECONNECT_DELAY_MS = 30_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;

export function useCalendarWebSocket(eventId: number | null, token: string | null, onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const tokenRef = useRef(token);
  const eventIdRef = useRef(eventId);
  tokenRef.current = token;
  eventIdRef.current = eventId;

  const connect = useCallback(() => {
    if (!tokenRef.current || eventIdRef.current == null) return;

    const url = `${WS_BASE}/api/ws?token=${encodeURIComponent(tokenRef.current)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
      const eid = eventIdRef.current;
      if (eid != null) {
        ws.send(JSON.stringify({ type: 'join_calendar', event_id: eid }));
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!tokenRef.current || eventIdRef.current == null) return;
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(MAX_RECONNECT_DELAY_MS, delay * 2);
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string };
        if (data.type === 'calendar_update' && onUpdateRef.current) {
          onUpdateRef.current();
        }
      } catch {
        // ignore parse errors
      }
    };
  }, []);

  useEffect(() => {
    if (!token || eventId == null) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        if (eventId != null) {
          try {
            wsRef.current.send(JSON.stringify({ type: 'leave_calendar', event_id: eventId }));
          } catch {
            // ignore
          }
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'leave_calendar', event_id: eventId }));
        } catch {
          // ignore
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, eventId, connect]);
}
