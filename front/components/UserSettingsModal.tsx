import React, { useState, useEffect } from 'react';
import { getStoredLang, LANG_OPTIONS, type LangCode } from '../utils/language';
import { useLang } from '../contexts/LangContext';
import { useTranslation } from '../hooks/useTranslation';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { setLang: setLangContext } = useLang();
  const { t } = useTranslation();
  const [lang, setLangLocal] = useState<LangCode>(getStoredLang());

  useEffect(() => {
    if (isOpen) setLangLocal(getStoredLang());
  }, [isOpen]);

  const handleSave = () => {
    setLangContext(lang);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card-bg border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-black text-white mb-6">{t('settings')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-1">{t('language')}</label>
            <select
              value={lang}
              onChange={(e) => setLangLocal(e.target.value as LangCode)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary"
            >
              {LANG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-card-bg text-white">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-gray-400 font-bold hover:bg-white/15"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold hover:opacity-90"
            >
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
