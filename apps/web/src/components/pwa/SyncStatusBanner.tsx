'use client';

import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { onSyncProgress, syncPendingLots, type SyncEvent } from '@/lib/sync';
import { getPendingSyncCount } from '@/lib/db';

export function SyncStatusBanner() {
  const { isOnline, justCameOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Poll pending count every 5 seconds
  useEffect(() => {
    async function updateCount() {
      try {
        const count = await getPendingSyncCount();
        setPendingCount(count);
      } catch {
        // IndexedDB may not be ready on first render
      }
    }
    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for sync progress events
  useEffect(() => {
    const unsub = onSyncProgress((event: SyncEvent) => {
      if (event.type === 'SYNC_STARTED') {
        setIsSyncing(true);
        setSyncMessage(`Syncing ${event.pendingCount ?? 0} lot(s)...`);
      }
      if (event.type === 'LOT_SYNCED') {
        setSyncMessage(`✓ Lot ${event.lotNumber ?? ''} synced`);
      }
      if (event.type === 'SYNC_COMPLETE') {
        setIsSyncing(false);
        setSyncMessage(
          event.syncedCount && event.syncedCount > 0
            ? `✓ ${event.syncedCount} lot(s) synced successfully`
            : null
        );
        // Clear success message after 4 seconds
        setTimeout(() => setSyncMessage(null), 4000);
        // Refresh pending count
        getPendingSyncCount()
          .then(setPendingCount)
          .catch(() => undefined);
      }
    });
    return unsub;
  }, []);

  // Show nothing when everything is clean
  if (isOnline && pendingCount === 0 && !syncMessage && !justCameOnline) {
    return null;
  }

  const bgColor = !isOnline
    ? '#0f172a'
    : justCameOnline || syncMessage || isSyncing
    ? '#10b981'
    : '#1e40af';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: 13,
        fontWeight: 600,
        background: bgColor,
        color: 'white',
        transition: 'background 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{isOnline ? '🟢' : '🔴'}</span>
        <span>
          {!isOnline && pendingCount > 0
            ? `Offline — ${pendingCount} lot(s) saved locally, will sync when online`
            : !isOnline
            ? 'Working offline — lot entries will be saved locally'
            : isSyncing
            ? syncMessage
            : justCameOnline
            ? 'Back online — syncing...'
            : syncMessage
            ? syncMessage
            : pendingCount > 0
            ? `${pendingCount} lot(s) pending sync`
            : ''}
        </span>
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (
        <button
          onClick={() =>
            syncPendingLots().catch((err) =>
              console.error('[Banner] Manual sync failed:', err)
            )
          }
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
