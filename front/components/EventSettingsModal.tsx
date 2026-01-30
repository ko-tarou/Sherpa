import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { toDatetimeLocal } from '../utils/dateUtils';
import { getStatusOptions } from '../utils/eventStatus';
import DateTimePicker from './DateTimePicker';
import { useTranslation } from '../hooks/useTranslation';
import type { Event } from '../types';

function toRFC3339(local: string): string {
  if (!local) return local;
  let s = local.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(s)) s = s + ':00';
  if (!/[+-]\d{2}:\d{2}$|Z$/i.test(s)) s = s + '+09:00';
  return s;
}

interface EventSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onUpdated: (updatedEventId: number) => void;
  onDeleted: (deletedId: number) => void;
}

const EventSettingsModal: React.FC<EventSettingsModalProps> = ({
  isOpen,
  onClose,
  event,
  onUpdated,
  onDeleted,
}) => {
  const { t, lang } = useTranslation();
  const statusOptions = getStatusOptions(lang);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<Event['status']>('draft');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setStartAt(event.start_at ? toDatetimeLocal(new Date(event.start_at)) : '');
    setEndAt(event.end_at ? toDatetimeLocal(new Date(event.end_at)) : '');
    setLocation(event.location ?? '');
    setStatus(event.status);
    setError(null);
    setShowDeleteConfirm(false);
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError(t('errTitleRequired'));
      return;
    }
    if (!startAt || !endAt) {
      setError(t('errDatetimeRequired'));
      return;
    }
    if (new Date(startAt) >= new Date(endAt)) {
      setError(t('errEndAfterStart'));
      return;
    }
    setSaving(true);
    try {
      await apiClient.updateEvent(event.id, {
        title: title.trim(),
        start_at: toRFC3339(startAt),
        end_at: toRFC3339(endAt),
        location: location.trim() || undefined,
        status,
      });
      onUpdated(event.id);
      onClose();
    } catch (e: any) {
      setError(e.message ?? '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await apiClient.deleteEvent(event.id);
      onDeleted(event.id);
      onClose();
    } catch (e: any) {
      setError(e.message ?? '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#111113', border: '1px solid rgba(255, 255, 255, 0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white">{t('eventSettingsTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
            aria-label={t('close')}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              {t('status')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Event['status'])}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary transition-colors"
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value} className="bg-card-bg text-white">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              {t('titleRequired')} <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder={t('eventName')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DateTimePicker
              label={`${t('startDateTime')} *`}
              value={startAt}
              onChange={setStartAt}
              placeholder={t('selectDateTime')}
            />
            <DateTimePicker
              label={`${t('endDateTime')} *`}
              value={endAt}
              onChange={setEndAt}
              placeholder={t('selectDateTime')}
              min={startAt || undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">{t('location')}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder={t('locationPlaceholder')}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #E11D48 0%, #FF3131 100%)',
                boxShadow: '0 0 20px rgba(225,29,72,0.3)',
              }}
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                  {t('updating')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  {t('update')}
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="w-full px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">delete</span>
            {t('deleteEvent')}
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 bg-card-bg border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-bold mb-2">{t('deleteEventConfirm')}</p>
            <p className="text-gray-400 text-sm mb-4">{t('deleteEventDesc')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors bg-white/5 disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                    {t('deleting')}
                  </>
                ) : (
                  t('delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventSettingsModal;
