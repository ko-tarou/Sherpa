import type { Event } from '../types';
import type { LangCode } from './language';
import { t } from './translations';

const STATUS_KEYS: Record<Event['status'], string> = {
  draft: 'draft',
  published: 'published',
  ongoing: 'ongoing',
  completed: 'ended',
  cancelled: 'cancelled',
};

export function getEventStatusLabel(status: Event['status'], lang?: LangCode): string {
  const key = STATUS_KEYS[status];
  return key ? t(lang ?? 'ja', key) : status;
}

export function getStatusOptions(lang?: LangCode): { value: Event['status']; label: string }[] {
  return (['draft', 'published', 'ongoing', 'completed', 'cancelled'] as Event['status'][]).map(
    (value) => ({ value, label: getEventStatusLabel(value, lang) })
  );
}
