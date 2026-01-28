import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../services/api';
import type { AdminEventRow } from '../types';
import { EVENT_STATUS_LABELS } from '../types';

interface DashboardPageProps {
  onLogout: () => void;
}

type SortKey = 'id' | 'title' | 'start_at' | 'end_at' | 'status' | 'staff_count' | 'task_todo' | 'task_in_progress' | 'task_completed' | 'channel_count' | 'created_at';
type SortDir = 'asc' | 'desc';

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ channels_deleted: number; events_deleted: number } | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchConfirm, setBatchConfirm] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminApi.getEvents();
      setEvents(r.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得に失敗しました');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const runBatch = async () => {
    if (!batchConfirm) return;
    setBatchLoading(true);
    setBatchError(null);
    setBatchResult(null);
    try {
      const r = await adminApi.runBatch();
      setBatchResult(r);
      setBatchConfirm(false);
      fetchEvents();
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : 'バッチ実行に失敗しました');
    } finally {
      setBatchLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...events];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          String(e.id).includes(q) ||
          (e.location && e.location.toLowerCase().includes(q))
      );
    }
    if (statusFilter) {
      list = list.filter((e) => e.status === statusFilter);
    }
    list.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      const cmp =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal ?? '').localeCompare(String(bVal ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [events, search, statusFilter, sortKey, sortDir]);

  const statusOptions = useMemo(() => {
    const set = new Set(events.map((e) => e.status));
    return Array.from(set).sort();
  }, [events]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const Th: React.FC<{
    label: string;
    sortKey: SortKey;
    className?: string;
  }> = ({ label, sortKey: k, className = '' }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-admin whitespace-nowrap ${className}`}
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (
          <span className="material-symbols-outlined text-sm">
            {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        )}
      </span>
    </th>
  );

  const statusBadge = (s: string) => {
    const style: Record<string, string> = {
      draft: 'bg-gray-500/20 text-gray-400',
      published: 'bg-admin/20 text-admin',
      ongoing: 'bg-emerald-500/20 text-emerald-400',
      completed: 'bg-slate-500/20 text-slate-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${style[s] ?? 'bg-gray-500/20 text-gray-400'}`}>
        {EVENT_STATUS_LABELS[s] ?? s}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="shrink-0 border-b border-admin-border bg-admin-card/80 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-black text-white">Sherpa 管理画面</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white text-sm font-medium transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xl">
                search
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="イベント名・ID・場所で検索..."
                className="pl-10 pr-4 py-2.5 rounded-xl bg-admin-card border border-admin-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-admin w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-admin-card border border-admin-border text-white focus:outline-none focus:ring-2 focus:ring-admin"
            >
              <option value="">すべてのステータス</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {EVENT_STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {batchResult && (
              <span className="text-sm text-emerald-400">
                バッチ完了: チャンネル {batchResult.channels_deleted} 件・イベント {batchResult.events_deleted} 件削除
              </span>
            )}
            {batchError && (
              <span className="text-sm text-red-400">{batchError}</span>
            )}
            {!batchConfirm ? (
              <button
                type="button"
                onClick={() => setBatchConfirm(true)}
                disabled={batchLoading}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-bold text-sm transition-colors disabled:opacity-50"
              >
                バッチ実行（論理削除チャンネル・メンバー0イベント削除）
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">実行しますか？</span>
                <button
                  type="button"
                  onClick={runBatch}
                  disabled={batchLoading}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
                >
                  {batchLoading ? '実行中...' : '実行'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchConfirm(false);
                    setBatchError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-admin-card border border-admin-border text-gray-400 text-sm hover:bg-white/5"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-admin-card border border-admin-border overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">読み込み中...</div>
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                type="button"
                onClick={fetchEvents}
                className="px-4 py-2 rounded-xl bg-admin text-white text-sm font-bold"
              >
                再試行
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              {events.length === 0 ? 'イベントがありません' : '検索条件に一致するイベントがありません'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-admin-border bg-admin-bg/50">
                    <Th label="ID" sortKey="id" className="w-16" />
                    <Th label="イベント名" sortKey="title" />
                    <Th label="開始" sortKey="start_at" />
                    <Th label="終了" sortKey="end_at" />
                    <Th label="ステータス" sortKey="status" />
                    <Th label="場所" sortKey="location" />
                    <Th label="スタッフ" sortKey="staff_count" className="text-center w-20" />
                    <Th label="未着手" sortKey="task_todo" className="text-center w-20" />
                    <Th label="進行中" sortKey="task_in_progress" className="text-center w-20" />
                    <Th label="完了" sortKey="task_completed" className="text-center w-20" />
                    <Th label="チャンネル" sortKey="channel_count" className="text-center w-24" />
                    <Th label="作成日時" sortKey="created_at" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-admin-border/50 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400 text-sm font-mono">{e.id}</td>
                      <td className="px-4 py-3 font-medium text-white">{e.title}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{e.start_at}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{e.end_at}</td>
                      <td className="px-4 py-3">{statusBadge(e.status)}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm max-w-[180px] truncate">
                        {e.location || '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">{e.staff_count}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{e.task_todo}</td>
                      <td className="px-4 py-3 text-center text-admin">{e.task_in_progress}</td>
                      <td className="px-4 py-3 text-center text-emerald-400/80">{e.task_completed}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{e.channel_count}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{e.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !error && filtered.length > 0 && (
          <p className="mt-3 text-gray-500 text-sm">
            {filtered.length} 件 / 全 {events.length} 件
          </p>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
