import React, { useMemo } from 'react';
import { Event } from '../types';
import CountdownCard from '../components/CountdownCard';
import TaskCard from '../components/TaskCard';
import BudgetCard from '../components/BudgetCard';
import { calculateDaysUntil } from '../utils/dateUtils';
import { useTasks } from '../hooks/useTasks';

interface DashboardPageProps {
  event: Event;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ event }) => {
  const { tasks, loading: tasksLoading } = useTasks(event.id);
  
  const countdownDays = useMemo(() => {
    return calculateDaysUntil(event.start_at);
  }, [event.start_at]);

  const totalBudget = useMemo(() => {
    if (!event.budgets) {
      return { planned: 0, actual: 0 };
    }
    return event.budgets.reduce(
      (acc, budget) => {
        if (budget.type === 'expense') {
          acc.planned += budget.planned_amount;
          acc.actual += budget.actual_amount;
        }
        return acc;
      },
      { planned: 0, actual: 0 }
    );
  }, [event.budgets]);

  const priorityTasks = useMemo(() => {
    return tasks
      .filter(task => task.status !== 'completed')
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 6);
  }, [tasks]);

  return (
    <div className="p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
              {event.title}
            </h2>
            <p className="text-gray-500 mt-2 font-medium">現在の進行状況をリアルタイムで確認しています</p>
          </div>
          <div className="flex gap-2">
            <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse mt-1"></span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Monitoring</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7 space-y-8">
            <CountdownCard days={countdownDays} />
            <TaskCard 
              tasks={priorityTasks} 
              eventTitle={event.title}
              eventId={event.id}
              loading={tasksLoading}
            />
          </div>

          <div className="col-span-12 lg:col-span-5">
            <BudgetCard budget={totalBudget} />
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
              <p className="text-xl font-black">
                {/* TODO: event_staffsをAPIから取得 */}
                0 名
              </p>
            </div>
          </div>
          <div className="bg-card-bg/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
            <div className="size-12 bg-white/5 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">confirmation_number</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold">予約済みチケット</p>
              <p className="text-xl font-black">
                {/* TODO: ticketsをAPIから取得 */}
                0 / 0
              </p>
            </div>
          </div>
          <div className="bg-card-bg/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
            <div className="size-12 bg-white/5 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">shield</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold">ステータス</p>
              <p className="text-xl font-black text-green-500">
                {event.status === 'ongoing' ? '開催中' : 
                 event.status === 'completed' ? '完了' : 
                 event.status === 'cancelled' ? 'キャンセル' : '準備中'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
