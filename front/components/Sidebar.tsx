import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavItemType, Event, User } from '../types';
import { NotificationsPanel } from './NotificationsPanel';
import { apiClient } from '../services/api';
import EventSettingsModal from './EventSettingsModal';
import UserSettingsModal from './UserSettingsModal';
import { useTranslation } from '../hooks/useTranslation';

interface SidebarProps {
  activeTab: NavItemType;
  setActiveTab: (tab: NavItemType) => void;
  events: Event[];
  selectedEventId: number | null;
  onEventSelect: (eventId: number) => void;
  onCreateEventClick: () => void;
  user: User;
  onLogout: () => void;
  onInviteAccepted?: () => void;
  onEventUpdated?: (updatedEventId: number) => void;
  onEventDeleted?: (deletedId: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  events,
  selectedEventId,
  onEventSelect,
  onCreateEventClick,
  user,
  onLogout,
  onInviteAccepted,
  onEventUpdated,
  onEventDeleted,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsEventId, setSettingsEventId] = useState<number | null>(null);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const eventDropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const fetchUnreadCount = useCallback(() => {
    apiClient.getUnreadNotificationCount().then((r) => setUnreadCount(r.count)).catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current?.contains(e.target as Node)) return;
      setNotificationsOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) fetchUnreadCount();
  }, [notificationsOpen, fetchUnreadCount]);

  useEffect(() => {
    if (!eventDropdownOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (eventDropdownRef.current?.contains(e.target as Node)) return;
      setEventDropdownOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [eventDropdownOpen]);

  const useCompactEventSelect = events.length >= 2;
  const currentEvent = selectedEventId != null
    ? events.find((e) => e.id === selectedEventId)
    : events[0] ?? null;

  const navItems = [
    { type: NavItemType.DASHBOARD, label: t('dashboard'), icon: 'grid_view' },
    { type: NavItemType.CALENDAR, label: t('calendar'), icon: 'calendar_month' },
    { type: NavItemType.TASKS, label: t('tasks'), icon: 'assignment' },
    { type: NavItemType.BUDGET, label: t('budget'), icon: 'payments' },
    { type: NavItemType.TEAM, label: t('team'), icon: 'groups' },
    { type: NavItemType.CHAT, label: t('chat'), icon: 'forum' },
  ];

  return (
    <aside className="w-72 flex-shrink-0 bg-sidebar-bg border-r border-white/10 flex flex-col justify-between py-8">
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-8 mb-12">
          <div className="size-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-2xl">event_available</span>
          </div>
          <h1 className="text-white text-xl font-black tracking-tighter">EVENT MANAGER</h1>
        </div>
        
        <nav className="flex flex-col px-4 gap-1">
          {navItems.map((item) => (
            <button
              key={item.type}
              onClick={() => setActiveTab(item.type)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.type
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <p className={`text-sm ${activeTab === item.type ? 'font-bold' : 'font-medium'} tracking-wide`}>
                {item.label}
              </p>
            </button>
          ))}
        </nav>
        
        <div className="px-8 mt-10">
          <button
            onClick={onCreateEventClick}
            className="flex w-full items-center justify-center gap-2 rounded-xl h-14 bg-primary text-white text-base font-black shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:bg-accent-red transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>{t('createEvent')}</span>
          </button>
        </div>

        {/* イベント選択 */}
        {events.length > 0 && (
          <div className="px-4 mt-6">
            <p className="text-xs text-gray-500 font-bold mb-2 px-4">{t('eventSelect')}</p>
            {useCompactEventSelect ? (
              <div ref={eventDropdownRef} className="relative">
                <div
                  className={`flex items-center gap-1 w-full rounded-lg transition-all group bg-primary text-white`}
                >
                  <button
                    type="button"
                    onClick={() => setEventDropdownOpen((o) => !o)}
                    className="flex-1 min-w-0 text-left px-4 py-2 flex items-center gap-1"
                  >
                    <p className="text-sm font-medium truncate">
                      {currentEvent?.title ?? '—'}
                    </p>
                    <span className="text-sm font-medium shrink-0">…</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEventDropdownOpen(false);
                      if (currentEvent) setSettingsEventId(currentEvent.id);
                    }}
                    className="p-2 rounded-lg shrink-0 transition-colors hover:bg-white/20"
                    title={t('eventSettings')}
                    aria-label={t('eventSettings')}
                  >
                    <span className="material-symbols-outlined text-lg">settings</span>
                  </button>
                </div>
                {eventDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-white/10 bg-card-bg shadow-xl overflow-hidden max-h-64 overflow-y-auto"
                    style={{ backgroundColor: '#111113' }}
                  >
                    {events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          onEventSelect(event.id);
                          setEventDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                          selectedEventId === event.id
                            ? 'bg-primary/20 text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <p className="truncate">{event.title}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`flex items-center gap-1 w-full rounded-lg transition-all group ${
                      selectedEventId === event.id
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onEventSelect(event.id)}
                      className="flex-1 min-w-0 text-left px-4 py-2"
                    >
                      <p className="text-sm font-medium truncate">{event.title}</p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsEventId(event.id);
                      }}
                      className={`p-2 rounded-lg shrink-0 transition-colors ${
                        selectedEventId === event.id
                          ? 'hover:bg-white/20'
                          : 'hover:bg-white/10 text-gray-400 group-hover:text-white'
                      }`}
                      title={t('eventSettings')}
                      aria-label={t('eventSettings')}
                    >
                      <span className="material-symbols-outlined text-lg">settings</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <EventSettingsModal
          isOpen={settingsEventId != null}
          onClose={() => setSettingsEventId(null)}
          event={events.find((e) => e.id === settingsEventId!) ?? null}
          onUpdated={(id) => {
            onEventUpdated?.(id);
          }}
          onDeleted={(id) => {
            setSettingsEventId(null);
            onEventDeleted?.(id);
          }}
        />
      </div>
      
      <div className="flex flex-col gap-4 px-6 border-t border-white/5 pt-8">
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((o) => !o)}
            className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white transition-colors w-full"
          >
            <span className="relative inline-flex">
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <p className="text-sm font-medium">{t('notifications')}</p>
          </button>
          <NotificationsPanel
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            onInviteAccepted={onInviteAccepted}
            onNotificationsChange={fetchUnreadCount}
          />
        </div>

        <button
          type="button"
          onClick={() => setUserSettingsOpen(true)}
          className="mt-4 p-3 w-full bg-white/5 rounded-2xl flex items-center gap-3 text-left hover:bg-white/10 transition-colors cursor-pointer"
        >
          <div className="size-10 rounded-full border border-white/20 flex items-center justify-center bg-primary/20 overflow-hidden shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="material-symbols-outlined text-primary text-xl">person</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLogout();
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-white transition-colors shrink-0"
            title="ログアウト"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </button>

        <UserSettingsModal
          isOpen={userSettingsOpen}
          onClose={() => setUserSettingsOpen(false)}
        />
      </div>
    </aside>
  );
};

export default Sidebar;
