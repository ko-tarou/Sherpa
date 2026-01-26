
import React from 'react';
import { NavItemType, Event } from '../types';

interface SidebarProps {
  activeTab: NavItemType;
  setActiveTab: (tab: NavItemType) => void;
  events: Event[];
  selectedEventId: number | null;
  onEventSelect: (eventId: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, events, selectedEventId, onEventSelect }) => {
  const navItems = [
    { type: NavItemType.DASHBOARD, label: 'ダッシュボード', icon: 'grid_view' },
    { type: NavItemType.TASKS, label: 'タスク', icon: 'assignment' },
    { type: NavItemType.BUDGET, label: '予算', icon: 'payments' },
    { type: NavItemType.TEAM, label: 'チーム', icon: 'groups' },
    { type: NavItemType.CHAT, label: 'チャット', icon: 'forum' },
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
          <button className="flex w-full items-center justify-center gap-2 rounded-xl h-14 bg-primary text-white text-base font-black shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:bg-accent-red transition-all">
            <span className="material-symbols-outlined">add_circle</span>
            <span>新規イベント作成</span>
          </button>
        </div>

        {/* イベント選択 */}
        {events.length > 0 && (
          <div className="px-4 mt-6">
            <p className="text-xs text-gray-500 font-bold mb-2 px-4">イベント選択</p>
            <div className="space-y-1">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventSelect(event.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-all ${
                    selectedEventId === event.id
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <p className="text-sm font-medium truncate">{event.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-4 px-6 border-t border-white/5 pt-8">
        <button className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <p className="text-sm font-medium">通知</p>
        </button>
        <button className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined">settings</span>
          <p className="text-sm font-medium">設定</p>
        </button>
        
        <div className="mt-4 p-3 bg-white/5 rounded-2xl flex items-center gap-3">
          <div 
            className="size-10 rounded-full bg-cover bg-center border border-white/20" 
            style={{ backgroundImage: "url('https://picsum.photos/seed/admin/100/100')" }}
          ></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">管理者 太郎</p>
            <p className="text-[10px] text-gray-500 truncate">admin@event.jp</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
