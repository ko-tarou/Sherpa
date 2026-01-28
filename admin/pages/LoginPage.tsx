import React, { useState } from 'react';
import { setStoredKey, clearStoredKey, adminApi } from '../services/api';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const k = key.trim();
    if (!k) {
      setError('APIキーを入力してください');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      setStoredKey(k);
      await adminApi.getEvents();
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証に失敗しました');
      clearStoredKey();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-admin-card border border-admin-border p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white">Sherpa 管理画面</h1>
          <p className="text-gray-400 text-sm mt-1">APIキーでログイン</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5">Admin API Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="ADMIN_API_KEY"
              className="w-full px-4 py-3 rounded-xl bg-admin-bg/80 border border-admin-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-admin focus:border-transparent"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-admin text-white font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? '確認中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
