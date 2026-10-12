'use client';

import { useState, useEffect } from 'react';
import { syncPendingLots } from '@/lib/sync';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setJustCameOnline(true);
      // Trigger sync when connection restored
      syncPendingLots().catch((err) =>
        console.error('[Sync] Auto-sync failed:', err)
      );
      // Reset the "just came online" flag after 3 seconds
      setTimeout(() => setJustCameOnline(false), 3000);
    }

    function handleOffline() {
      setIsOnline(false);
      setJustCameOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, justCameOnline };
}
