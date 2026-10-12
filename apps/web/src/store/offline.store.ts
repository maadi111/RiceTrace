import { create } from "zustand";
import { offlineDb } from "../lib/db-offline";

interface OfflineState {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  setOnlineStatus: (status: boolean) => void;
  updatePendingCount: () => Promise<void>;
  triggerSync: () => Promise<{ success: boolean; syncedCount: number }>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: true,
  pendingSyncCount: 0,
  isSyncing: false,

  setOnlineStatus: (status) => {
    set({ isOnline: status });
    if (status) {
      get().triggerSync();
    }
  },

  updatePendingCount: async () => {
    try {
      const unsynced = await offlineDb.lots.where("synced").equals(0 as any).or("synced").equals(false as any).count();
      set({ pendingSyncCount: unsynced });
    } catch (e) {
      // IndexedDB might not be available in SSR
    }
  },

  triggerSync: async () => {
    set({ isSyncing: true });
    try {
      const unsyncedLots = await offlineDb.lots.where("synced").equals(0 as any).or("synced").equals(false as any).toArray();
      let count = 0;

      for (const lot of unsyncedLots) {
        // Mark as synced locally
        if (lot.id) {
          await offlineDb.lots.update(lot.id, { synced: true });
          count++;
        }
      }

      await get().updatePendingCount();
      set({ isSyncing: false });
      return { success: true, syncedCount: count };
    } catch (error) {
      set({ isSyncing: false });
      return { success: false, syncedCount: 0 };
    }
  },
}));
