import React, { useState, useEffect } from 'react';
import { Notification } from '../types';
import { apiClient } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteAccepted?: () => void;
  onNotificationsChange?: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  onInviteAccepted,
  onNotificationsChange,
}) => {
  const { t } = useTranslation();
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    apiClient
      .getNotifications()
      .then((r) => setList(r.notifications))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const markRead = (n: Notification) => {
    if (n.read_at) return;
    apiClient.markNotificationRead(n.id).catch(() => {});
    setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
  };

  const handleAccept = async (n: Notification) => {
    if (n.type !== 'event_invite' || actingId != null) return;
    setActingId(n.id);
    try {
      await apiClient.acceptInvitation(n.related_id);
      setList((prev) => prev.filter((x) => x.id !== n.id));
      markRead(n);
      onInviteAccepted?.();
      onNotificationsChange?.();
    } catch (e) {
      console.error(e);
    } finally {
      setActingId(null);
    }
  };

  const handleDecline = async (n: Notification) => {
    if (n.type !== 'event_invite' || actingId != null) return;
    setActingId(n.id);
    try {
      await apiClient.declineInvitation(n.related_id);
      setList((prev) => prev.filter((x) => x.id !== n.id));
      markRead(n);
      onNotificationsChange?.();
    } catch (e) {
      console.error(e);
    } finally {
      setActingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-0 right-0 bottom-full mb-1 z-50">
      <div className="rounded-2xl border border-white/10 bg-card-bg shadow-xl overflow-hidden max-h-80 overflow-y-auto">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-white font-bold text-sm">{t('notifications')}</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white"
            aria-label={t('close')}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="p-2">
          {loading ? (
            <p className="text-gray-500 text-sm py-6 text-center">{t('loading')}</p>
          ) : list.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">{t('noNotifications')}</p>
          ) : (
            <ul className="space-y-1">
              {list.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl px-3 py-2.5 ${n.read_at ? 'bg-transparent' : 'bg-primary/10'}`}
                >
                  <p className="text-white text-sm font-medium">{n.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{n.body}</p>
                  {n.type === 'event_invite' && !n.read_at && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(n)}
                        disabled={actingId != null}
                        className="px-2 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        {actingId === n.id ? '処理中...' : '承諾'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(n)}
                        disabled={actingId != null}
                        className="px-2 py-1 rounded-lg bg-white/10 text-gray-300 text-xs font-bold hover:bg-white/20 disabled:opacity-50"
                      >
                        辞退
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
