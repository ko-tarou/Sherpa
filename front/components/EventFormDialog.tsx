import React, { useState } from 'react';
import { apiClient } from '../services/api';

interface EventFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (eventId: number) => void;
  userId?: number;
  initialData?: {
    title?: string;
    start_at?: string;
    end_at?: string;
    location?: string;
  };
}

/** datetime-local の "2026-08-01T10:00" を RFC3339 "2026-08-01T10:00:00+09:00" に変換 */
function toRFC3339(local: string): string {
  if (!local) return local;
  let s = local.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(s)) s = s + ':00';
  if (!/[+-]\d{2}:\d{2}$|Z$/i.test(s)) s = s + '+09:00';
  return s;
}

const EventFormDialog: React.FC<EventFormDialogProps> = ({
  isOpen,
  onClose,
  onEventCreated,
  userId,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    start_at: initialData?.start_at || '',
    end_at: initialData?.end_at || '',
    location: initialData?.location || '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('タイトルは必須です');
      return;
    }
    if (!formData.start_at) {
      setError('開始日時は必須です');
      return;
    }
    if (!formData.end_at) {
      setError('終了日時は必須です');
      return;
    }
    if (new Date(formData.start_at) >= new Date(formData.end_at)) {
      setError('終了日時は開始日時より後である必要があります');
      return;
    }

    setCreating(true);
    try {
      const { event } = await apiClient.createEvent({
        organization_id: 1,
        title: formData.title,
        start_at: toRFC3339(formData.start_at),
        end_at: toRFC3339(formData.end_at),
        location: formData.location || undefined,
        status: 'draft',
        ...(userId != null && { user_id: userId }),
      });
      onEventCreated(event.id);
      onClose();
    } catch (e: any) {
      setError(e.message || 'イベントの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ backgroundColor: '#111113', border: '1px solid rgba(255, 255, 255, 0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white">イベント情報を入力</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
            aria-label="閉じる"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              タイトル <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="イベント名を入力"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                開始日時 <span className="text-primary">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                終了日時 <span className="text-primary">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">場所</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="会場名や住所を入力（任意）"
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
              キャンセル
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #E11D48 0%, #FF3131 100%)',
                boxShadow: '0 0 20px rgba(225,29,72,0.3)',
              }}
            >
              {creating ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                  作成中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  イベントを作成
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormDialog;
