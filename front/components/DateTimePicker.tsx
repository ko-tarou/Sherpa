import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

/** value/onChange: "YYYY-MM-DDTHH:mm" (datetime-local 互換) */
export interface DateTimePickerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  id?: string;
  className?: string;
  label?: string;
  /** インライン表示（例: タスクカード内）でコンパクトにする */
  compact?: boolean;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function parseLocal(s: string): { y: number; m: number; d: number; h: number; min: number } | null {
  if (!s || typeof s !== 'string') return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return {
    y: d.getFullYear(),
    m: d.getMonth(),
    d: d.getDate(),
    h: d.getHours(),
    min: d.getMinutes(),
  };
}

function toLocal(p: { y: number; m: number; d: number; h: number; min: number }): string {
  const ym = `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  const tm = `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
  return `${ym}T${tm}`;
}

function formatDisplay(s: string): string {
  const p = parseLocal(s);
  if (!p) return '';
  return `${p.y}/${p.m + 1}/${p.d} ${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  placeholder = '日時を選択',
  min,
  max,
  id,
  className = '',
  label,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number } | null>(null);

  const parsed = useMemo(() => parseLocal(value), [value]);

  const [viewYear, setViewYear] = useState(() => (parsed ? parsed.y : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (parsed ? parsed.m : new Date().getMonth()));
  const [hour, setHour] = useState(parsed?.h ?? 12);
  const [minute, setMinute] = useState(parsed?.min ?? 0);

  useEffect(() => {
    if (parsed) {
      setHour(parsed.h);
      setMinute(parsed.min);
    }
  }, [parsed?.h, parsed?.min]);

  useEffect(() => {
    if (open && parsed) {
      setViewYear(parsed.y);
      setViewMonth(parsed.m);
    }
  }, [open, parsed?.y, parsed?.m]);

  const DROPDOWN_W = 280;
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setDropdownRect(null);
      return;
    }
    const r = triggerRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, typeof window !== 'undefined' ? window.innerWidth - DROPDOWN_W - 8 : r.left));
    setDropdownRect({ top: r.bottom + 8, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      if ((e.target as Element)?.closest?.('[data-datetime-picker-dropdown]')) return;
      setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  const minP = min ? parseLocal(min) : null;
  const maxP = max ? parseLocal(max) : null;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const start = first.getDay();
    const last = new Date(viewYear, viewMonth + 1, 0);
    const end = last.getDate();
    const prevLast = new Date(viewYear, viewMonth, 0).getDate();
    const out: { day: number; current: boolean; disabled: boolean }[] = [];

    for (let i = 0; i < start; i++) {
      const d = prevLast - start + 1 + i;
      const disabled = true;
      out.push({ day: d, current: false, disabled });
    }
    for (let d = 1; d <= end; d++) {
      let disabled = false;
      if (minP && (viewYear < minP.y || (viewYear === minP.y && viewMonth < minP.m) || (viewYear === minP.y && viewMonth === minP.m && d < minP.d))) disabled = true;
      if (maxP && (viewYear > maxP.y || (viewYear === maxP.y && viewMonth > maxP.m) || (viewYear === maxP.y && viewMonth === maxP.m && d > maxP.d))) disabled = true;
      out.push({ day: d, current: true, disabled });
    }
    const rest = 42 - out.length;
    for (let i = 1; i <= rest; i++) out.push({ day: i, current: false, disabled: true });
    return out;
  }, [viewYear, viewMonth, minP, maxP]);

  const selectDay = (day: number, current: boolean, disabled: boolean) => {
    if (!current || disabled) return;
    const y = viewYear;
    const m = viewMonth;
    const d = day;
    onChange(toLocal({ y, m, d, h: hour, min: minute }));
  };

  const applyTime = () => {
    const y = parsed?.y ?? viewYear;
    const m = parsed?.m ?? viewMonth;
    const d = parsed?.d ?? 1;
    onChange(toLocal({ y, m, d, h: hour, min: minute }));
  };

  const setToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    onChange(toLocal({
      y: t.getFullYear(),
      m: t.getMonth(),
      d: t.getDate(),
      h: hour,
      min: minute,
    }));
  };

  const inputCn = compact
    ? 'w-full px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:border-primary'
    : 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-bold text-gray-300 mb-2">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`${inputCn} flex items-center justify-between gap-2 text-left`}
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>{value ? formatDisplay(value) : placeholder}</span>
        <span className="material-symbols-outlined text-gray-500 text-lg shrink-0">calendar_month</span>
      </button>

      {open && dropdownRect && typeof document !== 'undefined' && createPortal(
        <div
          data-datetime-picker-dropdown
          className="fixed z-[9999] rounded-2xl bg-card-bg border border-white/10 shadow-xl overflow-hidden min-w-[280px]"
          style={{ top: dropdownRect.top, left: dropdownRect.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <span className="text-white font-bold">
              {viewYear}年 {viewMonth + 1}月
            </span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-0.5 mb-3">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[10px] font-bold text-gray-500 py-1">
                  {w}
                </div>
              ))}
              {days.map((cell, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(cell.day, cell.current, cell.disabled)}
                  disabled={cell.disabled}
                  className={`
                    aspect-square rounded-lg text-sm font-medium transition-colors
                    ${!cell.current ? 'text-gray-600 cursor-default' : ''}
                    ${cell.current && !cell.disabled
                      ? 'text-gray-300 hover:bg-white/10 hover:text-white'
                      : ''}
                    ${cell.disabled && cell.current ? 'opacity-40 cursor-not-allowed' : ''}
                    ${parsed && cell.current && parsed.y === viewYear && parsed.m === viewMonth && parsed.d === cell.day
                      ? 'bg-primary text-white hover:bg-primary'
                      : ''}
                  `}
                >
                  {cell.day}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={setToday}
                className="flex-1 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors"
              >
                今日
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)))}
                  onBlur={applyTime}
                  className="w-12 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-primary"
                />
                <span className="text-gray-500 text-sm">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minute}
                  onChange={(e) => setMinute(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                  onBlur={applyTime}
                  className="w-12 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  applyTime();
                  setOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DateTimePicker;
