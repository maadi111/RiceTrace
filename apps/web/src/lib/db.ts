import Dexie, { type Table } from 'dexie';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface CachedFarmer {
  id: string;
  name: string;
  cnic: string;
  district: string;
  phone?: string;
  farms: CachedFarm[];
  updatedAt: number; // timestamp for cache invalidation
}

export interface CachedFarm {
  id: string;
  farmerId: string;
  name?: string;
  district: string;
  tehsil?: string;
  areaAcres: number;
  geoLat?: number;
  geoLng?: number;
  eudrRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PENDING';
}

export interface OfflineLot {
  // Local-only id before server assigns one
  localId: string;           // crypto.randomUUID()
  serverId?: string;         // set after successful sync
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  failureReason?: string;
  retryCount: number;
  createdAt: number;         // timestamp
  syncedAt?: number;

  // Lot payload — mirrors POST /api/v1/lots body
  payload: {
    farmerId: string;
    farmerName: string;      // denormalized for offline display
    farmId: string;
    farmDistrict: string;    // denormalized for offline display
    variety: string;
    weightKg: number;
    moisturePercent?: number;
    dateReceived: string;    // ISO date string
    vehicleNumber?: string;
    notes?: string;
    gpsLat?: number;
    gpsLng?: number;
    photoDataUris?: string[]; // base64 — uploaded to S3 during sync
    pesticidesUsed: Array<{
      name: string;
      activeIngredient?: string;
      daysBeforeHarvest?: number;
    }>;
    fertilizerUsed: Array<{
      name: string;
      npkRatio?: string;
    }>;
    noPesticidesFlag: boolean;
  };
}

export interface SyncQueueItem {
  id?: number;         // auto-incremented
  type: 'CREATE_LOT';
  localId: string;     // references OfflineLot.localId
  attempts: number;
  lastAttemptAt?: number;
  nextRetryAt: number;
}

// ─── DATABASE ─────────────────────────────────────────────────────────────────

class RiceTraceDB extends Dexie {
  farmers!: Table<CachedFarmer, string>;
  farms!: Table<CachedFarm, string>;
  offlineLots!: Table<OfflineLot, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('ricetrace-offline');

    this.version(1).stores({
      // Primary key first, then indexed fields
      farmers: 'id, cnic, district, name, updatedAt',
      farms: 'id, farmerId, district, eudrRiskLevel',
      offlineLots: 'localId, status, createdAt, &serverId',
      syncQueue: '++id, type, localId, nextRetryAt, attempts',
    });
  }
}

export const db = new RiceTraceDB();

// ─── FARMER CACHE HELPERS ─────────────────────────────────────────────────────

export async function cacheFarmers(farmers: CachedFarmer[]): Promise<void> {
  const now = Date.now();
  const withTimestamp = farmers.map((f) => ({ ...f, updatedAt: now }));
  await db.farmers.bulkPut(withTimestamp);
}

export async function searchCachedFarmers(query: string): Promise<CachedFarmer[]> {
  const q = query.toLowerCase().trim();
  if (!q) {
    return db.farmers.orderBy('name').limit(50).toArray();
  }
  // Dexie doesn't support full-text search — filter in memory
  const all = await db.farmers.toArray();
  return all
    .filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.cnic.includes(q)
    )
    .slice(0, 20);
}

export async function getCachedFarmerWithFarms(
  farmerId: string
): Promise<CachedFarmer | null> {
  const farmer = await db.farmers.get(farmerId);
  if (!farmer) return null;
  const farms = await db.farms.where('farmerId').equals(farmerId).toArray();
  return { ...farmer, farms };
}

export async function cacheFarms(farms: CachedFarm[]): Promise<void> {
  await db.farms.bulkPut(farms);
}

// ─── OFFLINE LOT HELPERS ──────────────────────────────────────────────────────

export async function saveOfflineLot(
  lot: Omit<OfflineLot, 'status' | 'retryCount' | 'createdAt'>
): Promise<string> {
  const record: OfflineLot = {
    ...lot,
    status: 'PENDING',
    retryCount: 0,
    createdAt: Date.now(),
  };
  await db.offlineLots.put(record);

  // Add to sync queue — ready to sync immediately
  await db.syncQueue.add({
    type: 'CREATE_LOT',
    localId: lot.localId,
    attempts: 0,
    nextRetryAt: Date.now(),
  });

  return lot.localId;
}

export async function getPendingOfflineLots(): Promise<OfflineLot[]> {
  return db.offlineLots.where('status').anyOf(['PENDING', 'FAILED']).toArray();
}

export async function getAllOfflineLots(): Promise<OfflineLot[]> {
  return db.offlineLots.orderBy('createdAt').reverse().toArray();
}

export async function updateOfflineLotStatus(
  localId: string,
  update: Partial<
    Pick<OfflineLot, 'status' | 'serverId' | 'failureReason' | 'retryCount' | 'syncedAt'>
  >
): Promise<void> {
  await db.offlineLots.update(localId, update);
}

export async function getPendingSyncCount(): Promise<number> {
  return db.offlineLots.where('status').anyOf(['PENDING', 'SYNCING']).count();
}
