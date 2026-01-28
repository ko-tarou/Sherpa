// 日付計算のユーティリティ関数

export const calculateDaysUntil = (dateString: string): number => {
  const targetDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDeadline = (deadlineString: string): string => {
  const deadline = new Date(deadlineString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return '期限切れ';
  } else if (diffDays === 0) {
    return '本日締め切り';
  } else if (diffDays === 1) {
    return '明日締め切り';
  } else {
    return `残り ${diffDays}日`;
  }
};

/** カード用: "期限: 11/12" / "本日締切" / "期限切れ" */
export const formatDeadlineShort = (
  deadlineString: string
): { label: string; isDueToday: boolean; isOverdue: boolean } => {
  const deadline = new Date(deadlineString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isDueToday = diffDays === 0;
  const isOverdue = diffDays < 0;
  const label = isOverdue
    ? '期限切れ'
    : isDueToday
    ? '本日締切'
    : `期限: ${String(deadline.getMonth() + 1).padStart(2, '0')}/${String(deadline.getDate()).padStart(2, '0')}`;
  return { label, isDueToday, isOverdue };
};

/** 完了タスク用: "11/10 完了" */
export const formatCompletedAt = (dateString: string): string => {
  const d = new Date(dateString);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} 完了`;
};

/** チャットメッセージ用: "10:15" */
export const formatMessageTime = (dateString: string): string => {
  const d = new Date(dateString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** datetime-local 用: ISO → "YYYY-MM-DDTHH:mm" */
export const deadlineToDatetimeLocal = (iso: string): string => {
  const d = new Date(iso);
  return toDatetimeLocal(d);
};

/** Date → "YYYY-MM-DDTHH:mm" (local) */
export const toDatetimeLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
};
