import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message, MessageReaction } from '../types';

const WS_BASE = (() => {
  const u = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return u.replace(/^http/, 'ws');
})();

type WsEnvelope = {
  type: string;
  message?: Message;
  error?: string;
  payload?: Record<string, unknown>;
};

export type TypingPayload = { user_id: number; user_name: string; typing: boolean };
export type ReactionPayload = MessageReaction | { action: string; message_id: number; user_id: number; emoji: string };

const MAX_RECONNECT_DELAY_MS = 30_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;

export function useChatWebSocket(token: string | null) {
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const channelIdRef = useRef<number | null>(null);
  const onMessageRef = useRef<((m: Message) => void) | null>(null);
  const onMessageUpdatedRef = useRef<((m: Message) => void) | null>(null);
  const onMessageDeletedRef = useRef<((messageId: number) => void) | null>(null);
  const onReactionRef = useRef<((p: ReactionPayload) => void) | null>(null);
  const onTypingRef = useRef<((p: TypingPayload) => void) | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const connect = useCallback(() => {
    if (!tokenRef.current) return;
    const url = `${WS_BASE}/api/ws?token=${encodeURIComponent(tokenRef.current)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setLastError(null);
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
      const ch = channelIdRef.current;
      if (ch != null) {
        ws.send(JSON.stringify({ type: 'join', channel_id: ch }));
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!tokenRef.current) return;
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(
        MAX_RECONNECT_DELAY_MS,
        delay * 2
      );
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      setLastError('WebSocket エラー');
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as WsEnvelope;
        if (data.type === 'message' && data.message && onMessageRef.current) {
          onMessageRef.current(data.message);
        } else if (data.type === 'message_updated' && data.payload && onMessageUpdatedRef.current) {
          onMessageUpdatedRef.current(data.payload as unknown as Message);
        } else if (data.type === 'message_deleted' && data.payload && onMessageDeletedRef.current) {
          const p = data.payload as { message_id?: number };
          if (typeof p.message_id === 'number') onMessageDeletedRef.current(p.message_id);
        } else if (data.type === 'reaction' && data.payload && onReactionRef.current) {
          onReactionRef.current(data.payload as unknown as ReactionPayload);
        } else if (data.type === 'typing' && data.payload && onTypingRef.current) {
          onTypingRef.current(data.payload as unknown as TypingPayload);
        }
        if (data.type === 'error' && data.error) {
          setLastError(data.error);
        }
      } catch {
        setLastError('メッセージの解析に失敗しました');
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    channelIdRef.current = null;
  }, []);

  useEffect(() => {
    if (token) connect();
    else disconnect();
    return disconnect;
  }, [token, connect, disconnect]);

  const join = useCallback((channelId: number) => {
    channelIdRef.current = channelId;
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'join', channel_id: channelId }));
    }
  }, []);

  const leave = useCallback((channelId: number) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'leave', channel_id: channelId }));
    }
    if (channelIdRef.current === channelId) {
      channelIdRef.current = null;
    }
  }, []);

  const subscribeMessages = useCallback((cb: (m: Message) => void) => {
    onMessageRef.current = cb;
  }, []);
  const subscribeMessageUpdated = useCallback((cb: (m: Message) => void) => {
    onMessageUpdatedRef.current = cb;
  }, []);
  const subscribeMessageDeleted = useCallback((cb: (messageId: number) => void) => {
    onMessageDeletedRef.current = cb;
  }, []);
  const subscribeReaction = useCallback((cb: (p: ReactionPayload) => void) => {
    onReactionRef.current = cb;
  }, []);
  const subscribeTyping = useCallback((cb: (p: TypingPayload) => void) => {
    onTypingRef.current = cb;
  }, []);

  const sendTyping = useCallback((channelId: number, userName: string, isTyping: boolean) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: isTyping ? 'typing' : 'typing_stop',
        channel_id: channelId,
        user_name: userName,
      }));
    }
  }, []);

  return {
    connected,
    lastError,
    join,
    leave,
    subscribeMessages,
    subscribeMessageUpdated,
    subscribeMessageDeleted,
    subscribeReaction,
    subscribeTyping,
    sendTyping,
  };
}
