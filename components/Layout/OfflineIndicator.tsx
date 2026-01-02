import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { getTranslation, Language } from '../../utils/i18n';

export const OfflineIndicator: React.FC<{ lang: Language }> = ({ lang }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const t = getTranslation(lang);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse">
      <WifiOff size={16} />
      {t.offline}
    </div>
  );
};
