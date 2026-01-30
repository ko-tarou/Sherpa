export const LANG_STORAGE_KEY = 'sherpa_lang';

export type LangCode = 'ja' | 'en';

export const LANG_OPTIONS: { value: LangCode; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
];

export function getStoredLang(): LangCode {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === 'ja' || v === 'en') return v;
  } catch {}
  return 'ja';
}

export function setStoredLang(lang: LangCode): void {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
}
