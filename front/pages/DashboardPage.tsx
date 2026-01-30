import React, { useMemo } from 'react';
import { Event } from '../types';
import CountdownCard from '../components/CountdownCard';
import TaskCard from '../components/TaskCard';
import BudgetCard from '../components/BudgetCard';
import { calculateDaysUntil } from '../utils/dateUtils';
import { getEventStatusLabel } from '../utils/eventStatus';
import { useTasks } from '../hooks/useTasks';
import { useTranslation } from '../hooks/useTranslation';

interface DashboardPageProps {
  event: Event;
  onViewAllTasks?: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ event, onViewAllTasks }) => {
  const { t, lang } = useTranslation();
  const { tasks, loading: tasksLoading } = useTasks(event.id);
  
  const countdownDays = useMemo(() => {
    return calculateDaysUntil(event.start_at);
  }, [event.start_at]);

  const totalBudget = useMemo(() => {
    if (!event.budgets) {
      return { incomePlanned: 0, incomeActual: 0, expensePlanned: 0, expenseActual: 0, remaining: 0 };
    }
    return event.budgets.reduce(
      (acc, b) => {
        if (b.type === 'income') {
          acc.incomePlanned += b.planned_amount;
          acc.incomeActual += b.actual_amount;
        } else {
          acc.expensePlanned += b.planned_amount;
          acc.expenseActual += b.actual_amount;
        }
        return acc;
      },
      { incomePlanned: 0, incomeActual: 0, expensePlanned: 0, expenseActual: 0, remaining: 0 }
    );
  }, [event.budgets]);

  const totalBudgetWithRemaining = useMemo(() => ({
    ...totalBudget,
    remaining: totalBudget.incomeActual - totalBudget.expenseActual,
  }), [totalBudget]);

  const priorityTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status === 'in_progress')
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 2);
  }, [tasks]);

  const staffCount = useMemo(() => {
    return event.event_staffs ? event.event_staffs.length : 0;
  }, [event.event_staffs]);

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
              onViewAll={onViewAllTasks}
            />
          </div>

          <div className="col-span-12 lg:col-span-5">
            <BudgetCard budget={totalBudgetWithRemaining} />
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card-bg/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
            <div className="size-12 bg-white/5 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">groups</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold">{t('totalStaff')}</p>
              <p className="text-xl font-black">
                {staffCount} {lang === 'ja' ? '名' : ''}
              </p>
            </div>
          </div>
          <div className="bg-card-bg/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
            <div className="size-12 bg-white/5 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">confirmation_number</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold">{t('reservedTickets')}</p>
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
              <p className="text-xs text-gray-500 font-bold">{t('statusLabel')}</p>
              <p className="text-xl font-black text-green-500">
                {getEventStatusLabel(event.status, lang)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
