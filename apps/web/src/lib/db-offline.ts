import Dexie, { type Table } from "dexie";

export interface OfflineLot {
  id?: number;
  localId: string;
  farmerId: string;
  farmerName: string;
  farmId: string;
  variety: string;
  weightKg: number;
  date: string;
  vehicleNumber?: string;
  moisturePercentage?: number;
  gpsLat?: number;
  gpsLng?: number;
  photos: string[];
  pesticides?: Array<{
    pesticideName: string;
    phiDays?: number;
    targetPest?: string;
  }>;
  synced: boolean;
  createdAt: number;
}

export interface OfflineFarmerCache {
  id: string;
  name: string;
  cnic: string;
  district: string;
  farms: Array<{
    id: string;
    name: string;
    areaAcres?: number;
    hasGps: boolean;
    geoLat?: number;
    geoLng?: number;
    eudrRisk: string;
  }>;
}

class RiceTraceOfflineDatabase extends Dexie {
  lots!: Table<OfflineLot, number>;
  farmerCache!: Table<OfflineFarmerCache, string>;

  constructor() {
    super("RiceTraceOfflineDB");
    this.version(1).stores({
      lots: "++id, localId, farmerId, synced, createdAt",
      farmerCache: "id, cnic, name, district",
    });
  }
}

export const offlineDb = new RiceTraceOfflineDatabase();
