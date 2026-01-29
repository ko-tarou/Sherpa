import { NavItemType } from './types';

export const TAB_SLUGS = ['dashboard', 'tasks', 'budget', 'team', 'chat'] as const;
export type TabSlug = (typeof TAB_SLUGS)[number];

const SLUG_TO_TAB: Record<TabSlug, NavItemType> = {
  dashboard: NavItemType.DASHBOARD,
  tasks: NavItemType.TASKS,
  budget: NavItemType.BUDGET,
  team: NavItemType.TEAM,
  chat: NavItemType.CHAT,
};

const TAB_TO_SLUG: Record<NavItemType, TabSlug> = {
  [NavItemType.DASHBOARD]: 'dashboard',
  [NavItemType.TASKS]: 'tasks',
  [NavItemType.BUDGET]: 'budget',
  [NavItemType.TEAM]: 'team',
  [NavItemType.CHAT]: 'chat',
};

export function slugToTab(slug: string): NavItemType | null {
  if (TAB_SLUGS.includes(slug as TabSlug)) return SLUG_TO_TAB[slug as TabSlug];
  return null;
}

export function tabToSlug(tab: NavItemType): TabSlug {
  return TAB_TO_SLUG[tab];
}

export function eventPath(eventId: number, tab?: NavItemType): string {
  const t = tab != null ? tabToSlug(tab) : 'dashboard';
  return `/event/${eventId}/${t}`;
}

/** pathname をパース。 /event | /event/:id | /event/:id/:tab */
export function parsePath(pathname: string): { eventId: number | null; tab: string | null } {
  const p = (pathname || '/').replace(/^\//, '').split('/').filter(Boolean);
  if (p[0] !== 'event') return { eventId: null, tab: null };
  if (p.length === 1) return { eventId: null, tab: null };
  const id = parseInt(p[1], 10);
  if (Number.isNaN(id)) return { eventId: null, tab: null };
  const tab = p.length >= 3 && TAB_SLUGS.includes(p[2] as TabSlug) ? p[2] : null;
  return { eventId: id, tab };
}
