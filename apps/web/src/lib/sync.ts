import {
  getPendingOfflineLots,
  updateOfflineLotStatus,
  type OfflineLot,
} from './db';

const MAX_RETRIES = 3;
let isSyncing = false;

// ─── SYNC CALLBACKS ───────────────────────────────────────────────────────────

type SyncProgressCallback = (event: SyncEvent) => void;

export interface SyncEvent {
  type: 'SYNC_STARTED' | 'LOT_SYNCED' | 'LOT_FAILED' | 'SYNC_COMPLETE';
  localId?: string;
  lotNumber?: string;  // returned by server on success
  error?: string;
  pendingCount?: number;
  syncedCount?: number;
}

const listeners = new Set<SyncProgressCallback>();

export function onSyncProgress(cb: SyncProgressCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb); // returns unsubscribe function
}

function emit(event: SyncEvent): void {
  listeners.forEach((cb) => cb(event));
}

// ─── GET AUTH TOKEN ───────────────────────────────────────────────────────────
// Reads from the Zustand persist store key: "ricetrace-auth-session"
// The store shape is: { state: { accessToken: string | null, ... } }

function getToken(): string | null {
  try {
    const storeRaw = localStorage.getItem('ricetrace-auth-session');
    if (storeRaw) {
      const store = JSON.parse(storeRaw);
      return store?.state?.accessToken || null;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── SYNC ONE LOT ─────────────────────────────────────────────────────────────

async function syncLot(lot: OfflineLot): Promise<void> {
  const apiUrl =
    process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:4000/api/v1';
  const token = getToken();

  if (!token) {
    throw new Error('Not authenticated — cannot sync');
  }

  await updateOfflineLotStatus(lot.localId, { status: 'SYNCING' });

  try {
    const response = await fetch(`${apiUrl}/lots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(lot.payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as {
        error?: { message?: string };
      };
      throw new Error(
        errorData?.error?.message || `HTTP ${response.status}`
      );
    }

    const result = await response.json() as {
      data?: { id?: string; lotNumber?: string };
    };
    const serverId = result.data?.id;
    const lotNumber = result.data?.lotNumber;

    await updateOfflineLotStatus(lot.localId, {
      status: 'SYNCED',
      serverId,
      syncedAt: Date.now(),
    });

    emit({ type: 'LOT_SYNCED', localId: lot.localId, lotNumber });
  } catch (error) {
    const newRetryCount = (lot.retryCount || 0) + 1;
    const failed = newRetryCount >= MAX_RETRIES;

    await updateOfflineLotStatus(lot.localId, {
      status: failed ? 'FAILED' : 'PENDING',
      failureReason:
        error instanceof Error ? error.message : 'Unknown error',
      retryCount: newRetryCount,
    });

    emit({
      type: 'LOT_FAILED',
      localId: lot.localId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (failed) {
      console.error(
        `[Sync] Lot ${lot.localId} permanently failed after ${MAX_RETRIES} attempts`
      );
    }
  }
}

// ─── MAIN SYNC FUNCTION ───────────────────────────────────────────────────────

export async function syncPendingLots(): Promise<{
  synced: number;
  failed: number;
  skipped: number;
}> {
  if (isSyncing) {
    console.log('[Sync] Already syncing — skipping');
    return { synced: 0, failed: 0, skipped: 0 };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[Sync] Offline — skipping');
    return { synced: 0, failed: 0, skipped: 0 };
  }

  const token = getToken();
  if (!token) {
    console.log('[Sync] No auth token — skipping');
    return { synced: 0, failed: 0, skipped: 0 };
  }

  isSyncing = true;
  const pending = await getPendingOfflineLots();

  if (pending.length === 0) {
    isSyncing = false;
    return { synced: 0, failed: 0, skipped: 0 };
  }

  emit({ type: 'SYNC_STARTED', pendingCount: pending.length });
  console.log(`[Sync] Syncing ${pending.length} pending lots...`);

  let synced = 0;
  let failed = 0;

  // Sync sequentially — not parallel — to avoid duplicate lot numbers
  for (const lot of pending) {
    if (lot.retryCount >= MAX_RETRIES) {
      failed++;
      continue;
    }
    try {
      await syncLot(lot);
      synced++;
    } catch {
      failed++;
    }
    // Small delay between requests — be kind to the server
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  isSyncing = false;
  emit({ type: 'SYNC_COMPLETE', syncedCount: synced, pendingCount: failed });
  console.log(`[Sync] Complete — ${synced} synced, ${failed} failed`);

  return { synced, failed, skipped: 0 };
}
