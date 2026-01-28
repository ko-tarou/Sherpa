import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import BudgetPage from './pages/BudgetPage';
import TeamPage from './pages/TeamPage';
import ChatPage from './pages/ChatPage';
import CreateEventChatPage from './pages/CreateEventChatPage';
import CreateUserPage from './pages/CreateUserPage';
import { NavItemType } from './types';
import { useUser } from './hooks/useUser';
import { useEvents, useEvent } from './hooks/useEvents';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavItemType>(NavItemType.DASHBOARD);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [showCreateEventChat, setShowCreateEventChat] = useState(false);

  const { user, login, logout, loading: userLoading } = useUser();
  const { events, loading: eventsLoading, reload: reloadEvents } = useEvents(user?.id ?? null);
  const { event, loading: eventLoading, reload: reloadEvent } = useEvent(selectedEventId);

  // 最初のイベントを自動選択
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const renderPage = () => {
    if (!selectedEventId || !event) {
      if (eventsLoading || eventLoading) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500 mb-4">イベントがありません</p>
            <button
              onClick={() => setShowCreateEventChat(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg"
            >
              新規イベントを作成
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case NavItemType.DASHBOARD:
        return <DashboardPage event={event} />;
      case NavItemType.TASKS:
        return <TasksPage eventId={selectedEventId} />;
      case NavItemType.BUDGET:
        return <BudgetPage eventId={selectedEventId!} event={event} />;
      case NavItemType.TEAM:
        return <TeamPage eventId={selectedEventId!} event={event} user={user} />;
      case NavItemType.CHAT:
        return <ChatPage eventId={selectedEventId} />;
      default:
        return <DashboardPage event={event} />;
    }
  };

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

  return (
    <div className="flex h-screen overflow-hidden text-gray-100 font-display" style={{ backgroundColor: '#0A0A0B', color: '#f3f4f6' }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        events={events}
        selectedEventId={selectedEventId}
        onEventSelect={setSelectedEventId}
        onCreateEventClick={() => setShowCreateEventChat(true)}
        user={user}
        onLogout={logout}
        onInviteAccepted={() => {
          reloadEvents();
          reloadEvent();
        }}
      />

      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>

      {showCreateEventChat && (
        <CreateEventChatPage
          onClose={() => setShowCreateEventChat(false)}
          onEventCreated={(eventId) => {
            reloadEvents();
            setSelectedEventId(eventId);
          }}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default App;
