import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredLang, setStoredLang, type LangCode } from '../utils/language';

type LangContextValue = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => getStoredLang());

  const setLang = (l: LangCode) => {
    setStoredLang(l);
    setLangState(l);
  };

  useEffect(() => {
    setLangState(getStoredLang());
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
