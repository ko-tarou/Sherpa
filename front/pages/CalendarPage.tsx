import React, { useState, useMemo } from 'react';
import { Event } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useLang } from '../contexts/LangContext';
import { useCalendarWebSocket } from '../hooks/useCalendarWebSocket';
import DateTimePicker from '../components/DateTimePicker';
import { apiClient } from '../services/api';

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
  label?: string; // "開催日", "機材手配完了" など
}

interface CalendarPageProps {
  eventId: number;
  event: Event;
  user: { id: number };
  onTaskAdded?: () => void;
}

export default function CalendarPage({ eventId, event, user, onTaskAdded }: CalendarPageProps) {
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addDeadline, setAddDeadline] = useState('');
  const [adding, setAdding] = useState(false);

  const openAddModal = () => {
    const base = selectedDate ? new Date(selectedDate + 'T23:59:00') : new Date();
    if (!selectedDate) base.setDate(base.getDate() + 1);
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
    (event.tasks ?? []).forEach((t) => {
      if (t.deadline) {
        const d = parseDate(t.deadline);
        list.push({
          type: 'task',
          id: t.id,
          title: t.title,
          dateStr: toDateStr(d),
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
                  onClick={() => setSelectedDate(dateStr)}
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
