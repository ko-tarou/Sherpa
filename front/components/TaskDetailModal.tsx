import React, { useState, useEffect } from 'react';
import { Task, Event, EventStaff, RecurrenceRule } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import DateTimePicker from './DateTimePicker';
import { toDatetimeLocal } from '../utils/dateUtils';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

interface TaskDetailModalProps {
  task: Task;
  event: Event;
  onSave: (data: Partial<Task> & { assignee_ids?: number[] }) => Promise<void>;
  onClose: () => void;
}

export default function TaskDetailModal({ task, event, onSave, onClose }: TaskDetailModalProps) {
  const { t } = useTranslation();
  const [link, setLink] = useState(task.link ?? '');
  const [assigneeIds, setAssigneeIds] = useState<number[]>(() =>
    (task.assignees ?? []).map((a) => a.user_id)
  );
  const [startAt, setStartAt] = useState(
    task.start_at ? toDatetimeLocal(new Date(task.start_at)) : ''
  );
  const [recurrenceType, setRecurrenceType] = useState<'' | 'weekly' | 'daily' | 'monthly'>(
    task.recurrence?.type ?? ''
  );
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>(
    task.recurrence?.weekdays ?? []
  );
  const [saving, setSaving] = useState(false);

  const staffs = (event.event_staffs ?? []) as EventStaff[];

  const toggleAssignee = (userId: number) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleWeekday = (day: number) => {
    setRecurrenceWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const recurrence: RecurrenceRule | undefined =
        recurrenceType && recurrenceType !== ''
          ? {
              type: recurrenceType,
              weekdays: recurrenceType === 'weekly' ? recurrenceWeekdays : undefined,
            }
          : undefined;
      await onSave({
        link: link.trim(),
        start_at: startAt ? new Date(startAt).toISOString() : undefined,
        recurrence,
        assignee_ids: assigneeIds,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-card-bg border border-white/10 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-white">{t('taskDetail')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="text-white font-bold mb-4 truncate">{task.title}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-1">{t('link')}</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={t('linkPlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">{t('assignees')}</label>
            <div className="flex flex-wrap gap-2">
              {staffs.map((s) => {
                const uid = s.user_id;
                const name = s.user?.name ?? `User ${uid}`;
                const selected = assigneeIds.includes(uid);
                return (
                  <button
                    key={uid}
                    type="button"
                    onClick={() => toggleAssignee(uid)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                      selected ? 'bg-primary text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
              {staffs.length === 0 && (
                <span className="text-gray-500 text-sm">{t('noAssignees')}</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-1">{t('startDate')}</label>
            <DateTimePicker
              value={startAt}
              onChange={setStartAt}
              placeholder={t('selectDateTime')}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">{t('recurrence')}</label>
            <div className="flex gap-2 mb-2">
              {(['weekly', 'daily', 'monthly'] as const).map((typ) => (
                <button
                  key={typ}
                  type="button"
                  onClick={() => setRecurrenceType(recurrenceType === typ ? '' : typ)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                    recurrenceType === typ ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {t(`recurrence${typ.charAt(0).toUpperCase() + typ.slice(1)}`)}
                </button>
              ))}
            </div>
            {recurrenceType === 'weekly' && (
              <div className="flex flex-wrap gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      recurrenceWeekdays.includes(day) ? 'bg-primary/30 text-white' : 'bg-white/5 text-gray-500'
                    }`}
                  >
                    {t(WEEKDAY_KEYS[day])}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/10 text-gray-400 font-bold text-sm"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
