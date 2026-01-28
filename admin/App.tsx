import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { getStoredKey, clearStoredKey } from './services/api';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    setHasKey(!!getStoredKey());
  }, []);

  const onLogin = () => setHasKey(true);
  const onLogout = () => {
    clearStoredKey();
    setHasKey(false);
  };

  if (hasKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!hasKey) {
    return <LoginPage onLogin={onLogin} />;
  }

  return <DashboardPage onLogout={onLogout} />;
};

export default App;
