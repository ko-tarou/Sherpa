import React, { useState, useMemo, useEffect } from 'react';
import { Event, Budget } from '../types';
import { useBudgets } from '../hooks/useBudgets';

const fmt = (n: number) => `¥${n.toLocaleString()}`;

type BudgetType = 'income' | 'expense';
const TYPE_LABEL: Record<BudgetType, string> = { income: '収入', expense: '支出' };

interface BudgetPageProps {
  eventId: number;
  event: Event;
  onBudgetsChange?: () => void;
}

const BudgetPage: React.FC<BudgetPageProps> = ({ eventId, event, onBudgetsChange }) => {
  const { budgets, loading, createBudget, updateBudget, deleteBudget, reload } = useBudgets(eventId);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [menuState, setMenuState] = useState<{ id: number; top: number; left: number } | null>(null);

  useEffect(() => {
    if (!menuState) return;
    const onDoc = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.('[data-budget-menu]')) return;
      setMenuState(null);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [menuState]);

  const expenseItems = useMemo(() => budgets.filter((b) => b.type === 'expense'), [budgets]);
  const incomeItems = useMemo(() => budgets.filter((b) => b.type === 'income'), [budgets]);
  const totals = useMemo(() => {
    const incomePlanned = incomeItems.reduce((s, b) => s + b.planned_amount, 0);
    const incomeActual = incomeItems.reduce((s, b) => s + b.actual_amount, 0);
    const expensePlanned = expenseItems.reduce((s, b) => s + b.planned_amount, 0);
    const expenseActual = expenseItems.reduce((s, b) => s + b.actual_amount, 0);
    const remaining = incomeActual - expenseActual;
    return { incomePlanned, incomeActual, expensePlanned, expenseActual, remaining };
  }, [incomeItems, expenseItems]);

  const handleSubmit = async (payload: { category: string; type: BudgetType; planned_amount: number; actual_amount: number }) => {
    if (editing) {
      await updateBudget(editing.id, payload);
      setEditing(null);
    } else {
      await createBudget({
        category: payload.category,
        type: payload.type,
        planned_amount: payload.planned_amount,
        actual_amount: payload.actual_amount,
      });
    }
    setShowForm(false);
    onBudgetsChange?.();
  };

  const handleDelete = async (b: Budget) => {
    setMenuState(null);
    await deleteBudget(b.id);
    onBudgetsChange?.();
  };

  const openMenu = (b: Budget, btn: HTMLButtonElement) => {
    const rect = btn.getBoundingClientRect();
    setMenuState({ id: b.id, top: rect.bottom + 4, left: Math.max(8, rect.right - 120) });
  };
  const closeMenu = () => setMenuState(null);
  const menuBudget = menuState ? budgets.find((x) => x.id === menuState.id) : null;

  const csvExport = () => {
    const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const headers = ['カテゴリ', '区分', '予算額 (PLANNED)', '実績額 (ACTUAL)', '差分 (DIFF)'];
    const rows = budgets.map((b) => {
      const typ = TYPE_LABEL[b.type as BudgetType];
      const diff = b.planned_amount - b.actual_amount;
      const diffStr = b.type === 'income' && b.actual_amount < b.planned_amount ? '進行中' : (diff >= 0 ? `+${fmt(diff)}` : fmt(diff));
      return [b.category, typ, fmt(b.planned_amount), fmt(b.actual_amount), diffStr].map(escape);
    });
    const csv = [headers.map(escape).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `budget-${event.title.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">BUDGET SUMMARY</p>
          <h1 className="text-3xl font-black text-white mb-6">予算サマリー</h1>
          <div className="flex flex-wrap gap-8 md:gap-12 mb-4">
            <div>
              <p className="text-xs font-bold text-gray-500 mb-0.5">収入合計</p>
              <p className="text-xl font-black text-white">予算 {fmt(totals.incomePlanned)}</p>
              <p className="text-xl font-black text-emerald-400/90">実績 {fmt(totals.incomeActual)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-0.5">支出合計</p>
              <p className="text-xl font-black text-white">予算 {fmt(totals.expensePlanned)}</p>
              <p className="text-xl font-black text-primary">実績 {fmt(totals.expenseActual)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-0.5">残高（収入 − 支出）</p>
              <p className={`text-2xl font-black ${totals.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totals.remaining >= 0 ? fmt(totals.remaining) : `-${fmt(-totals.remaining)}`}
              </p>
            </div>
          </div>
          <div className="h-1 bg-white/20 rounded-full max-w-full mb-4" />
          <p className="text-sm text-gray-400">対象イベント: {event.title}</p>
        </div>

        {/* Table section */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-black text-white">■ 収支明細</h2>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="px-4 py-2 bg-white text-black rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              項目を追加する
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/10">
                  <th className="px-4 py-3 text-white font-bold text-sm">カテゴリ</th>
                  <th className="px-4 py-3 text-white font-bold text-sm">区分</th>
                  <th className="px-4 py-3 text-white font-bold text-sm">予算額 (PLANNED)</th>
                  <th className="px-4 py-3 text-white font-bold text-sm">実績額 (ACTUAL)</th>
                  <th className="px-4 py-3 text-white font-bold text-sm">差分 (DIFF)</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {[...expenseItems, ...incomeItems].map((b, i) => (
                  <BudgetRow
                    key={b.id}
                    budget={b}
                    isEven={i % 2 === 0}
                    onMenuToggle={(btn) => (menuState?.id === b.id ? closeMenu() : openMenu(b, btn))}
                    onEdit={() => { closeMenu(); setEditing(b); setShowForm(true); }}
                    onDelete={() => handleDelete(b)}
                  />
                ))}
                {incomeItems.length > 0 && (
                  <tr className="border-t border-white/10 bg-white/5">
                    <td colSpan={2} className="px-4 py-3 text-white font-bold text-sm">
                      合計収入 (TOTAL INCOME)
                    </td>
                    <td className="px-4 py-3 text-white font-bold">{fmt(totals.incomePlanned)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400/90">{fmt(totals.incomeActual)}</td>
                    <td className="px-4 py-3 font-bold text-white">—</td>
                    <td />
                  </tr>
                )}
                {expenseItems.length > 0 && (
                  <tr className="border-t-2 border-white/20 bg-white/5">
                    <td colSpan={2} className="px-4 py-3 text-white font-bold text-sm">
                      合計支出 (TOTAL EXPENDITURE)
                    </td>
                    <td className="px-4 py-3 text-white font-bold">{fmt(totals.expensePlanned)}</td>
                    <td className="px-4 py-3 text-white font-bold">{fmt(totals.expenseActual)}</td>
                    <td className={`px-4 py-3 font-bold ${totals.remaining < 0 ? 'text-red-400' : 'text-white'}`}>
                      {totals.remaining >= 0 ? `+${fmt(totals.expensePlanned - totals.expenseActual)}` : fmt(totals.expensePlanned - totals.expenseActual)}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
            {budgets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                項目がありません。「項目を追加する」から追加してください。
              </div>
            )}
          </div>
        </div>

        {menuState && menuBudget && (
          <div
            data-budget-menu
            className="fixed z-[9999] rounded-xl bg-card-bg border border-white/10 shadow-xl py-1 min-w-[120px]"
            style={{ top: menuState.top, left: menuState.left }}
          >
            <button
              type="button"
              onClick={() => { closeMenu(); setEditing(menuBudget); setShowForm(true); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
            >
              編集
            </button>
            <button
              type="button"
              onClick={() => handleDelete(menuBudget)}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10"
            >
              削除
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <p className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">warning</span>
              アラートと注記
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              実績額が予算をオーバーしている項目は赤字で強調されています。差分列は「予算 − 実績」を算出しており、プラスは予算内、マイナスは予算超過を意味します。
            </p>
          </div>
          <div className="flex gap-4 shrink-0">
            <button onClick={csvExport} className="text-sm font-bold text-primary hover:underline underline-offset-2">
              CSV EXPORT
            </button>
            <button
              onClick={() => alert('PDF出力は準備中です。')}
              className="text-sm font-bold text-primary hover:underline underline-offset-2"
            >
              GENERATE PDF
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <BudgetFormModal
          eventTitle={event.title}
          initial={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

interface BudgetRowProps {
  budget: Budget;
  isEven: boolean;
  onMenuToggle: (btn: HTMLButtonElement) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function BudgetRow({ budget, isEven, onMenuToggle, onEdit, onDelete }: BudgetRowProps) {
  const typ = TYPE_LABEL[budget.type as BudgetType];
  const diff = budget.planned_amount - budget.actual_amount;
  const over = budget.type === 'expense' && budget.actual_amount > budget.planned_amount;
  const inProgress = budget.type === 'income' && budget.actual_amount < budget.planned_amount;
  const diffStr = inProgress ? '進行中' : diff >= 0 ? `+${fmt(diff)}` : fmt(diff);

  return (
    <tr className={`border-b border-white/5 ${isEven ? 'bg-white/[0.02]' : 'bg-transparent'}`} data-budget-menu>
      <td className="px-4 py-3 text-white">{budget.category}</td>
      <td className="px-4 py-3 text-gray-400">{typ}</td>
      <td className="px-4 py-3 text-white">{fmt(budget.planned_amount)}</td>
      <td className={`px-4 py-3 font-bold ${over ? 'text-red-400' : 'text-white'}`}>{fmt(budget.actual_amount)}</td>
      <td className={`px-4 py-3 font-bold ${over ? 'text-red-400' : 'text-white'}`}>{diffStr}</td>
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMenuToggle(e.currentTarget); }}
          className="p-1 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="メニュー"
        >
          <span className="material-symbols-outlined text-lg">more_vert</span>
        </button>
      </td>
    </tr>
  );
}

interface BudgetFormModalProps {
  eventTitle: string;
  initial?: Budget;
  onClose: () => void;
  onSubmit: (v: { category: string; type: BudgetType; planned_amount: number; actual_amount: number }) => void;
}

const BudgetFormModal: React.FC<BudgetFormModalProps> = ({ initial, onClose, onSubmit }) => {
  const [category, setCategory] = useState(initial?.category ?? '');
  const [type, setType] = useState<BudgetType>(initial?.type ?? 'expense');
  const [planned, setPlanned] = useState(String(initial?.planned_amount ?? 0));
  const [actual, setActual] = useState(String(initial?.actual_amount ?? 0));

  useEffect(() => {
    setCategory(initial?.category ?? '');
    setType((initial?.type as BudgetType) ?? 'expense');
    setPlanned(String(initial?.planned_amount ?? 0));
    setActual(String(initial?.actual_amount ?? 0));
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(planned, 10) || 0;
    const a = parseInt(actual, 10) || 0;
    if (!category.trim()) return;
    onSubmit({ category: category.trim(), type, planned_amount: p, actual_amount: a });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-card-bg border border-white/10 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-black text-white mb-4">{initial ? '項目を編集' : '項目を追加'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">カテゴリ</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例: 会場費"
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">区分</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BudgetType)}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary"
            >
              <option value="expense">支出</option>
              <option value="income">収入</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">予算額 (PLANNED)</label>
            <input
              type="number"
              min={0}
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">実績額 (ACTUAL)</label>
            <input
              type="number"
              min={0}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90">
              {initial ? '更新' : '追加'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white/5 text-gray-400 rounded-xl text-sm font-bold hover:bg-white/10">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetPage;
