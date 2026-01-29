import type { Event } from '../types';

export const EVENT_STATUS_LABELS: Record<Event['status'], string> = {
  draft: '下書き',
  published: '公開済み',
  ongoing: '開催中',
  completed: '終了',
  cancelled: 'キャンセル',
};

export function getEventStatusLabel(status: Event['status']): string {
  return EVENT_STATUS_LABELS[status] ?? status;
}
