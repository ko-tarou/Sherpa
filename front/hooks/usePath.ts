import { useState, useEffect, useCallback } from 'react';
import { parsePath, eventPath } from '../routes';
import { NavItemType } from '../types';

export function usePath() {
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setPathname(path);
  }, []);

  const replace = useCallback((path: string) => {
    window.history.replaceState({}, '', path);
    setPathname(path);
  }, []);

  const parsed = parsePath(pathname);
  const navigateToEvent = useCallback(
    (eventId: number, tab?: NavItemType) => navigate(eventPath(eventId, tab)),
    [navigate]
  );

  return { pathname, parsed, navigate, replace, navigateToEvent };
}
