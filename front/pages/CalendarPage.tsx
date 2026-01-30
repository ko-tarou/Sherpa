import React, { useState, useMemo } from 'react';
import { Event, Task } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useLang } from '../contexts/LangContext';
import { useCalendarWebSocket } from '../hooks/useCalendarWebSocket';
import DateTimePicker from '../components/DateTimePicker';
import { apiClient } from '../services/api';
import { formatDateTime } from '../utils/dateUtils';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(s: string): Date {
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

interface CalendarItem {
  type: 'event' | 'task';
  id: number;
  title: string;
  dateStr: string;
  label?: string;
  task?: Task;
}

interface CalendarPageProps {
  eventId: number;
  event: Event;
  user: { id: number };
  onTaskAdded?: () => void;
  onNavigateToTasks?: () => void;
}

export default function CalendarPage({ eventId, event, user, onTaskAdded, onNavigateToTasks }: CalendarPageProps) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const reloadRef = React.useRef(onTaskAdded);
  reloadRef.current = onTaskAdded ?? (() => {});
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sherpa_token') : null;
  useCalendarWebSocket(eventId, user ? token : null, () => reloadRef.current());

  // タブ切り替え時はイベントが古い可能性があるため、マウント時に再取得
  React.useEffect(() => {
    reloadRef.current?.();
  }, [eventId]);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addDeadline, setAddDeadline] = useState('');
  const [adding, setAdding] = useState(false);

  const openAddModal = (presetDate?: string) => {
    const base = presetDate || selectedDate ? new Date((presetDate || selectedDate!) + 'T23:59:00') : new Date();
    if (!presetDate && !selectedDate) base.setDate(base.getDate() + 1);
    setAddDeadline(`${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}T23:59`);
    setAddTitle('');
    setShowAddModal(true);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const items = useMemo((): CalendarItem[] => {
    const list: CalendarItem[] = [];
    if (event.start_at) {
      const d = parseDate(event.start_at);
      list.push({
        type: 'event',
        id: event.id,
        title: event.title,
        dateStr: toDateStr(d),
        label: t('eventDay'),
      });
    }
    (event.tasks ?? []).forEach((tk) => {
      if (tk.deadline) {
        const d = parseDate(tk.deadline);
        list.push({
          type: 'task',
          id: tk.id,
          title: tk.title,
          dateStr: toDateStr(d),
          task: tk,
        });
      }
    });
    return list;
  }, [event, t]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    items.forEach((it) => {
      if (!map[it.dateStr]) map[it.dateStr] = [];
      map[it.dateStr].push(it);
    });
    return map;
  }, [items]);

  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const endPad = 6 - last.getDay();
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, -startPad + i + 1);
      days.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ date, dateStr: toDateStr(date), isCurrentMonth: true });
    }
    for (let i = 1; i <= endPad; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  const prevMonth = () => setViewDate(new Date(year, month - 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1));

  const handleAddTask = async () => {
    if (!addTitle.trim() || !addDeadline) return;
    setAdding(true);
    try {
      const d = new Date(addDeadline);
      await apiClient.createTask(eventId, {
        title: addTitle.trim(),
        deadline: d.toISOString(),
        status: 'todo',
      });
      onTaskAdded?.();
      setShowAddModal(false);
      setAddTitle('');
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const monthLabel = new Date(year, month).toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-white">{t('eventCalendar')}</h1>
            <p className="text-gray-400 text-sm mt-1">{monthLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                {t('addMeeting')}
                <span className="material-symbols-outlined text-lg">expand_more</span>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 overflow-hidden bg-card-bg">
          <div className="grid grid-cols-7 border-b border-white/10">
            {WEEKDAYS.map((day, i) => (
              <div
                key={day}
                className={`py-3 text-center text-xs font-bold ${
                  i === 6 ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, dateStr, isCurrentMonth }) => {
              const cellItems = itemsByDate[dateStr] ?? [];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === toDateStr(new Date());
              const isSat = date.getDay() === 6;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setDayDetailDate(dateStr);
                  }}
                  className={`min-h-[100px] p-2 border-b border-r border-white/5 text-left transition-colors ${
                    !isCurrentMonth ? 'text-gray-600' : isSat ? 'text-red-400/80' : 'text-white'
                  } ${isSelected ? 'bg-primary/20 ring-1 ring-primary/50' : 'hover:bg-white/5'}`}
                >
                  <span
                    className={`inline-flex items-center justify-center size-7 rounded-full text-sm font-bold ${
                      isToday ? 'bg-primary text-white' : ''
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {cellItems.slice(0, 3).map((it) => (
                      <div
                        key={`${it.type}-${it.id}`}
                        className={`truncate text-xs px-1.5 py-0.5 rounded ${
                          it.label === t('eventDay')
                            ? 'bg-primary/30 text-white'
                            : 'bg-primary/15 text-primary'
                        }`}
                      >
                        {it.label ?? it.title}
                      </div>
                    ))}
                    {cellItems.length > 3 && (
                      <div className="flex gap-0.5">
                        {[...Array(Math.min(cellItems.length - 3, 3))].map((_, i) => (
                          <span key={i} className="size-1.5 rounded-full bg-primary/60" />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {dayDetailDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setDayDetailDate(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card-bg border border-white/10 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">
                {t('dayDetail', {
                  date: new Date(dayDetailDate + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                })}
              </h3>
              <button
                type="button"
                onClick={() => setDayDetailDate(null)}
                className="p-2 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {(() => {
              const dayItems = itemsByDate[dayDetailDate] ?? [];
              return (
                <>
                  {dayItems.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">{t('noItemsOnDay')}</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {dayItems.map((it) => (
                        <div
                          key={`${it.type}-${it.id}`}
                          className={`p-3 rounded-xl border ${
                            it.type === 'event'
                              ? 'bg-primary/10 border-primary/30'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  it.type === 'event' ? 'bg-primary/30 text-white' : 'bg-white/10 text-gray-400'
                                }`}
                              >
                                {it.type === 'event' ? t('eventSchedule') : t('tasks')}
                              </span>
                              <p className="text-white font-bold mt-1 truncate">{it.title}</p>
                              {it.task && (
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      it.task.status === 'completed'
                                        ? 'bg-green-500/20 text-green-400'
                                        : it.task.status === 'in_progress'
                                          ? 'bg-blue-500/20 text-blue-400'
                                          : 'bg-gray-500/20 text-gray-400'
                                    }`}
                                  >
                                    {it.task.status === 'todo'
                                      ? t('todo')
                                      : it.task.status === 'in_progress'
                                        ? t('inProgress')
                                        : it.task.status === 'completed'
                                          ? t('completed')
                                          : it.task.status}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDateTime(it.task.deadline)}
                                  </span>
                                </div>
                              )}
                            </div>
                            {it.type === 'task' && onNavigateToTasks && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDayDetailDate(null);
                                  onNavigateToTasks();
                                }}
                                className="shrink-0 px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30"
                              >
                                {t('viewInTasks')}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDayDetailDate(null);
                        openAddModal(dayDetailDate);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      {t('addTaskForDay')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayDetailDate(null)}
                      className="px-4 py-2.5 rounded-xl bg-white/10 text-gray-400 font-bold text-sm hover:bg-white/15"
                    >
                      {t('close')}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => !adding && setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card-bg border border-white/10 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-4">{t('addMeeting')}</h3>
            <input
              type="text"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder={t('meetingTitlePlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary mb-4"
            />
            <DateTimePicker
              label={t('deadline')}
              value={addDeadline}
              onChange={setAddDeadline}
              placeholder={t('selectDateTime')}
            />
            <div className="flex gap-3 mt-6 justify-end">
              <button
                type="button"
                onClick={() => !adding && setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-gray-400 font-bold text-sm"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleAddTask}
                disabled={!addTitle.trim() || !addDeadline || adding}
                className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {adding ? t('adding') : t('add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
