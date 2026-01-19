
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CountdownCard from './components/CountdownCard';
import TaskCard from './components/TaskCard';
import BudgetCard from './components/BudgetCard';
import { NavItemType, EventData, Task } from './types';

const INITIAL_DATA: EventData = {
  title: "2024 秋季テックフェス",
  countdownDays: 12,
  budget: {
    planned: 1000000,
    actual: 450000,
  },
  tasks: [
    { id: '1', title: 'ケータリング業者への最終確認', deadline: '本日締め切り', isPriority: true, completed: false },
    { id: '2', title: '音響機材の搬入経路確認', deadline: '残り 2日', isPriority: true, completed: false },
    { id: '3', title: 'ボランティアスタッフ説明会資料作成', deadline: '残り 3日', isPriority: true, completed: false },
  ]
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavItemType>(NavItemType.DASHBOARD);
  const [eventData, setEventData] = useState<EventData>(INITIAL_DATA);

  const handleTasksUpdate = (newTasks: Task[]) => {
    setEventData(prev => ({ ...prev, tasks: newTasks }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-main-bg text-gray-100 font-display">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
                {eventData.title}
              </h2>
              <p className="text-gray-500 mt-2 font-medium">現在の進行状況をリアルタイムで確認しています</p>
            </div>
            <div className="flex gap-2">
                <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse mt-1"></span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Monitoring</span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Left Content */}
            <div className="col-span-12 lg:col-span-7 space-y-8">
              <CountdownCard days={eventData.countdownDays} />
              
              <TaskCard 
                tasks={eventData.tasks} 
                eventTitle={eventData.title}
                onTasksUpdate={handleTasksUpdate} 
              />
            </div>

            {/* Right Content */}
            <div className="col-span-12 lg:col-span-5">
              <BudgetCard budget={eventData.budget} />
            </div>
          </div>

          {/* Quick Stats Footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card-bg/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
               <div className="size-12 bg-white/5 rounded-2xl flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary">groups</span>
               </div>
               <div>
                  <p className="text-xs text-gray-500 font-bold">総スタッフ数</p>
                  <p className="text-xl font-black">24 名</p>
               </div>
            </div>
            <div className="bg-card-bg/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
               <div className="size-12 bg-white/5 rounded-2xl flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary">confirmation_number</span>
               </div>
               <div>
                  <p className="text-xs text-gray-500 font-bold">予約済みチケット</p>
                  <p className="text-xl font-black">842 / 1,000</p>
               </div>
            </div>
            <div className="bg-card-bg/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
               <div className="size-12 bg-white/5 rounded-2xl flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary">shield</span>
               </div>
               <div>
                  <p className="text-xs text-gray-500 font-bold">セキュリティ状況</p>
                  <p className="text-xl font-black text-green-500">正常</p>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
