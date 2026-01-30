import React, { useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import DashboardSkeleton from './components/DashboardSkeleton';
import TasksPageSkeleton from './components/TasksPageSkeleton';
import BudgetPageSkeleton from './components/BudgetPageSkeleton';
import TeamPageSkeleton from './components/TeamPageSkeleton';
import ChatPageSkeleton from './components/ChatPageSkeleton';
import TasksPage from './pages/TasksPage';
import BudgetPage from './pages/BudgetPage';
import TeamPage from './pages/TeamPage';
import ChatPage from './pages/ChatPage';
import CreateEventChatPage from './pages/CreateEventChatPage';
import CreateUserPage from './pages/CreateUserPage';
import { NavItemType } from './types';
import { useUser } from './hooks/useUser';
import { useEvents, useEvent } from './hooks/useEvents';
import { usePath } from './hooks/usePath';
import { eventPath, slugToTab, tabToSlug, TAB_SLUGS } from './routes';

function NoEventsView({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-gray-500 mb-4">イベントがありません</p>
        <button onClick={onCreateClick} className="px-4 py-2 bg-primary text-white rounded-lg">
          新規イベントを作成
        </button>
      </div>
    </div>
  );
}

function EventLayout({
  events,
  eventsError,
  user,
  setShowCreateEventChat,
  reloadEvents,
  logout,
  onInviteAccepted,
  parsed,
  navigateToEvent,
  replace,
}: {
  events: { id: number }[];
  eventsError: boolean;
  user: { id: number; name: string; email: string; avatar_url?: string };
  setShowCreateEventChat: (v: boolean) => void;
  reloadEvents: () => void;
  logout: () => void;
  onInviteAccepted: () => void;
  parsed: { eventId: number | null; tab: string | null };
  navigateToEvent: (eventId: number, tab?: NavItemType) => void;
  replace: (path: string) => void;
}) {
  const selectedEventId = parsed.eventId != null && !Number.isNaN(parsed.eventId) ? parsed.eventId : null;
  const activeTab = useMemo(() => {
    if (!parsed.tab) return NavItemType.DASHBOARD;
    const t = slugToTab(parsed.tab);
    return t ?? NavItemType.DASHBOARD;
  }, [parsed.tab]);

  const setActiveTab = (tab: NavItemType) => {
    if (selectedEventId == null || !events.some((e) => e.id === selectedEventId)) return;
    navigateToEvent(selectedEventId, tab);
  };

  const onEventSelect = (id: number) => {
    const slug =
      parsed.tab && TAB_SLUGS.includes(parsed.tab as (typeof TAB_SLUGS)[number])
        ? parsed.tab
        : tabToSlug(NavItemType.DASHBOARD);
    navigateToEvent(id, slugToTab(slug) ?? undefined);
  };

  const onEventDeleted = (deletedId: number) => {
    reloadEvents();
    if (selectedEventId === deletedId) {
      const rest = events.filter((e) => e.id !== deletedId);
      if (rest.length > 0) replace(eventPath(rest[0].id, NavItemType.DASHBOARD));
      else replace('/event');
    }
  };

  const reloadEventRef = useRef<(() => void) | null>(null);
  const onEventUpdated = (updatedEventId: number) => {
    reloadEvents();
    if (updatedEventId === selectedEventId) reloadEventRef.current?.();
  };

  return (
    <div className="flex h-screen overflow-hidden text-gray-100 font-display" style={{ backgroundColor: '#0A0A0B', color: '#f3f4f6' }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        events={events}
        selectedEventId={selectedEventId}
        onEventSelect={onEventSelect}
        onCreateEventClick={() => setShowCreateEventChat(true)}
        user={user}
        onLogout={logout}
        onInviteAccepted={onInviteAccepted}
        onEventUpdated={onEventUpdated}
        onEventDeleted={onEventDeleted}
      />
      <main className="flex-1 overflow-y-auto">
        <EventMainContent
          events={events}
          eventsError={eventsError}
          user={user}
          reloadEvents={reloadEvents}
          reloadEventRef={reloadEventRef}
          parsed={parsed}
          replace={replace}
          onCreateClick={() => setShowCreateEventChat(true)}
        />
      </main>
    </div>
  );
}

function EventMainContent({
  events,
  eventsError,
  user,
  reloadEvents,
  reloadEventRef,
  parsed,
  replace,
  onCreateClick,
}: {
  events: { id: number }[];
  eventsError: boolean;
  user: { id: number; name: string; email: string; avatar_url?: string };
  reloadEvents: () => void;
  reloadEventRef: React.MutableRefObject<(() => void) | null>;
  parsed: { eventId: number | null; tab: string | null };
  replace: (path: string) => void;
  onCreateClick: () => void;
}) {
  const validEventId = useMemo(() => {
    if (parsed.eventId == null || Number.isNaN(parsed.eventId)) return null;
    const exists = events.some((e) => e.id === parsed.eventId!);
    return exists ? parsed.eventId : null;
  }, [events, parsed.eventId]);

  const activeTab = useMemo(() => {
    if (!parsed.tab) return NavItemType.DASHBOARD;
    const t = slugToTab(parsed.tab);
    return t ?? NavItemType.DASHBOARD;
  }, [parsed.tab]);

  const { event, loading: eventLoading, reload: reloadEvent } = useEvent(validEventId);

  useEffect(() => {
    reloadEventRef.current = reloadEvent;
    return () => {
      reloadEventRef.current = null;
    };
  }, [reloadEventRef, reloadEvent]);

  useEffect(() => {
    if (events.length === 0) return;
    const invalidTab = parsed.tab != null && !TAB_SLUGS.includes(parsed.tab as (typeof TAB_SLUGS)[number]);
    if (validEventId == null && parsed.eventId != null) {
      replace(eventPath(events[0].id, NavItemType.DASHBOARD));
      return;
    }
    if (validEventId != null && invalidTab) {
      replace(eventPath(validEventId, NavItemType.DASHBOARD));
    }
  }, [events, validEventId, parsed.eventId, parsed.tab, replace]);

  if (eventsError && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-400 font-bold text-lg mb-2">サーバーにアクセスできません</p>
          <p className="text-gray-500 text-sm mb-4">通信環境を確認してから、再試行してください。</p>
          <button
            type="button"
            onClick={() => reloadEvents()}
            className="px-4 py-2 bg-primary text-white rounded-xl font-bold hover:opacity-90"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }
  if (events.length === 0) return <NoEventsView onCreateClick={onCreateClick} />;
  if (parsed.eventId == null) {
    replace(eventPath(events[0].id, NavItemType.DASHBOARD));
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">リダイレクト中...</div>
      </div>
    );
  }
  if (validEventId == null) {
    replace(eventPath(events[0].id, NavItemType.DASHBOARD));
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">リダイレクト中...</div>
      </div>
    );
  }
  if (eventLoading || !event) {
    if (activeTab === NavItemType.DASHBOARD) {
      return <DashboardSkeleton />;
    }
    if (activeTab === NavItemType.TASKS) {
      return <TasksPageSkeleton />;
    }
    if (activeTab === NavItemType.BUDGET) {
      return <BudgetPageSkeleton />;
    }
    if (activeTab === NavItemType.TEAM) {
      return <TeamPageSkeleton />;
    }
    if (activeTab === NavItemType.CHAT) {
      return <ChatPageSkeleton />;
    }
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  switch (activeTab) {
    case NavItemType.DASHBOARD:
      return (
        <DashboardPage
          event={event}
          onViewAllTasks={() => replace(eventPath(validEventId!, NavItemType.TASKS))}
        />
      );
    case NavItemType.TASKS:
      return <TasksPage eventId={validEventId} />;
    case NavItemType.BUDGET:
      return <BudgetPage eventId={validEventId} event={event} onBudgetsChange={reloadEvent} />;
    case NavItemType.TEAM:
      return <TeamPage eventId={validEventId} event={event} user={user} />;
    case NavItemType.CHAT:
      return <ChatPage eventId={validEventId} event={event} user={user} />;
    default:
      return (
        <DashboardPage
          event={event}
          onViewAllTasks={() => replace(eventPath(validEventId!, NavItemType.TASKS))}
        />
      );
  }
}

const App: React.FC = () => {
  const [showCreateEventChat, setShowCreateEventChat] = React.useState(false);
  const { user, login, logout, loading: userLoading } = useUser();
  const { events, loading: eventsLoading, error: eventsError, reload: reloadEvents } = useEvents(user?.id ?? null);
  const { pathname, parsed, replace, navigateToEvent } = usePath();

  useEffect(() => {
    if (!user) return;
    const p = pathname.replace(/^\//, '').split('/').filter(Boolean);
    if (p[0] !== 'event') {
      replace('/event');
      return;
    }
    if (p.length === 1 && events.length > 0) {
      replace(eventPath(events[0].id, NavItemType.DASHBOARD));
      return;
    }
    if (p.length === 2 && events.some((e) => e.id === parseInt(p[1], 10))) {
      replace(eventPath(parseInt(p[1], 10), NavItemType.DASHBOARD));
    }
  }, [user, pathname, events, replace]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#0A0A0B', color: '#f3f4f6' }}>
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <CreateUserPage
        onLogin={async (token) => {
          await login(token);
        }}
      />
    );
  }

  const isEventRoute = pathname.startsWith('/event');
  const loadingScreen = (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#0A0A0B', color: '#f3f4f6' }}>
      <div className="text-gray-500">読み込み中...</div>
    </div>
  );
  const redirectScreen = (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#0A0A0B', color: '#f3f4f6' }}>
      <div className="text-gray-500">リダイレクト中...</div>
    </div>
  );

  return (
    <>
      {!isEventRoute ? redirectScreen : eventsLoading ? loadingScreen : (
        <EventLayout
          events={events}
          eventsError={eventsError}
          user={user}
          setShowCreateEventChat={setShowCreateEventChat}
          reloadEvents={reloadEvents}
          logout={logout}
          onInviteAccepted={reloadEvents}
          parsed={parsed}
          navigateToEvent={navigateToEvent}
          replace={replace}
        />
      )}
      {showCreateEventChat && (
        <CreateEventChatPage
          onClose={() => setShowCreateEventChat(false)}
          onEventCreated={(id) => {
            reloadEvents();
            setShowCreateEventChat(false);
            navigateToEvent(id, NavItemType.DASHBOARD);
          }}
          userId={user.id}
        />
      )}
    </>
  );
};

export default App;
