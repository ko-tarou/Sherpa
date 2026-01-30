import { useLang } from '../contexts/LangContext';
import { t as translate } from '../utils/translations';
import type { LangCode } from '../utils/language';

export function useTranslation() {
  const { lang } = useLang();
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);
  return { t, lang };
}
