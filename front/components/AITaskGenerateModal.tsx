import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../hooks/useTranslation';

export interface TaskSuggestion {
  title: string;
  deadline: string;
}

interface AITaskGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  onGenerate: (eventTitle: string) => Promise<TaskSuggestion[]>;
  onAddTasks: (tasks: { title: string; deadline: string }[]) => Promise<void>;
}

function parseDeadline(deadlineStr: string): Date {
  const s = (deadlineStr || '').trim().toLowerCase();
  const now = new Date();
  // "本日" "今日" -> today 23:59
  if (s.includes('本日') || s.includes('今日') || s.includes('today')) {
    const d = new Date(now);
    d.setHours(23, 59, 0, 0);
    return d;
  }
  // "残り N日" "N日" "あとN日" -> N days from now 23:59
  const dayMatch = s.match(/(\d+)\s*日/);
  if (dayMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(dayMatch[1], 10));
    d.setHours(23, 59, 0, 0);
    return d;
  }
  // Default: 7 days
  const d = new Date(now);
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 0, 0);
  return d;
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AITaskGenerateModal({
  isOpen,
  onClose,
  eventTitle,
  onGenerate,
  onAddTasks,
}: AITaskGenerateModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'idle' | 'loading' | 'results' | 'adding' | 'error'>('idle');
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(() => {
    setStep('loading');
    setError(null);
    onGenerate(eventTitle)
      .then((tasks) => {
        setSuggestions(tasks);
        setSelected(new Set(tasks.map((_, i) => i)));
        setStep(tasks.length > 0 ? 'results' : 'idle');
      })
      .catch((e) => {
        setError(e?.message || 'AIタスク生成に失敗しました');
        setStep('error');
      });
  }, [eventTitle, onGenerate]);

  useEffect(() => {
    if (!isOpen) {
      setStep('idle');
      setSuggestions([]);
      setSelected(new Set());
      setError(null);
      return;
    }
    fetchSuggestions();
  }, [isOpen, fetchSuggestions]);

  const handleAdd = async () => {
    const toAdd = suggestions
      .filter((_, i) => selected.has(i))
      .map((s) => ({
        title: s.title,
        deadline: parseDeadline(s.deadline).toISOString(),
      }));
    if (toAdd.length === 0) return;
    setStep('adding');
    try {
      await onAddTasks(toAdd);
      onClose();
    } catch (e) {
      setError(e?.message || 'タスクの追加に失敗しました');
      setStep('error');
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(suggestions.map((_, i) => i)));
  const selectNone = () => setSelected(new Set());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-card-bg border border-white/10 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            {t('aiTaskGenerate')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 min-h-[200px]">
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-outlined text-5xl text-primary animate-spin mb-4">progress_activity</span>
              <p className="text-gray-400 font-medium">{t('generating')}</p>
              <p className="text-gray-500 text-sm mt-1">イベント「{eventTitle}」に合ったタスクを提案しています</p>
            </div>
          )}

          {step === 'error' && (
            <div className="py-6 text-center">
              <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error</span>
              <p className="text-red-400 font-bold mb-2">{error}</p>
              <p className="text-gray-500 text-sm mb-4">APIキーが設定されているか、通信環境を確認してください。</p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={fetchSuggestions}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm"
                >
                  再試行
                </button>
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-gray-400 font-bold text-sm">
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          {step === 'results' && suggestions.length > 0 && (
            <>
              <p className="text-gray-400 text-sm mb-4">
                {suggestions.length}件のタスクを提案しました。追加するものを選択してください。
              </p>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selected.has(i) ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      className="rounded border-white/30 text-primary focus:ring-primary"
                    />
                    <span className="flex-1 text-white font-medium truncate">{s.title}</span>
                    <span className="text-xs text-gray-500 shrink-0">{s.deadline || '—'}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-primary hover:underline"
                >
                  すべて選択
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-xs text-gray-500 hover:underline"
                >
                  選択解除
                </button>
              </div>
            </>
          )}

          {step === 'results' && suggestions.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-gray-500">タスクの提案がありませんでした。</p>
              <button type="button" onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-bold">
                {t('close')}
              </button>
            </div>
          )}

          {step === 'adding' && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-outlined text-5xl text-primary animate-spin mb-4">progress_activity</span>
              <p className="text-gray-400 font-medium">タスクを追加しています...</p>
            </div>
          )}
        </div>

        {step === 'results' && suggestions.length > 0 && (
          <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/10 text-gray-400 font-bold text-sm">
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selected.size === 0}
              className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              {selected.size}件を追加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
