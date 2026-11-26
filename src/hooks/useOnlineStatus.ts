import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleOfflineReady = () => setIsOfflineReady(true);

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setIsOfflineReady(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sitescout:pwa-offline-ready', handleOfflineReady);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sitescout:pwa-offline-ready', handleOfflineReady);
    };
  }, []);

  return { isOnline, isOfflineReady };
}
