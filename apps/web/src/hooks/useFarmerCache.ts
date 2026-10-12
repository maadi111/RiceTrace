'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  cacheFarmers,
  cacheFarms,
  searchCachedFarmers,
  type CachedFarmer,
  type CachedFarm,
} from '@/lib/db';

// NEXT_PUBLIC_API_URL already includes /api/v1 in api-client.ts, but here
// we need the raw base URL. We strip /api/v1 suffix if present.
function getApiBase(): string {
  const raw = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:4000/api/v1';
  return raw.endsWith('/api/v1') ? raw.slice(0, -7) : raw;
}

// Reads from the Zustand persist store key: "ricetrace-auth-session"
function getToken(): string | null {
  try {
    const storeRaw = localStorage.getItem('ricetrace-auth-session');
    if (storeRaw) {
      const store = JSON.parse(storeRaw) as {
        state?: { accessToken?: string | null };
      };
      const token = store?.state?.accessToken;
      if (token) return token;
    }
    return null;
  } catch {
    return null;
  }
}

export function useFarmerCache() {
  const [farmers, setFarmers] = useState<CachedFarmer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCached, setLastCached] = useState<number | null>(null);

  // Refresh cache from API — call on mount and when coming online
  const refreshCache = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const token = getToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(
        `${apiBase}/api/v1/farmers?limit=500&page=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json() as {
        success: boolean;
        data?: Array<{
          id: string;
          name: string;
          cnic: string;
          district?: string;
          phone?: string;
          farms?: Array<{
            id: string;
            district?: string;
            tehsil?: string;
            areaAcres?: number;
            geoLat?: number;
            geoLng?: number;
            eudrRiskLevel?: string;
          }>;
        }>;
      };

      if (data.success && Array.isArray(data.data)) {
        // Cache farmers
        const farmersToCache: CachedFarmer[] = data.data.map((f) => ({
          id: f.id,
          name: f.name,
          cnic: f.cnic,
          district: f.district ?? '',
          phone: f.phone ?? undefined,
          farms: (f.farms ?? []).map((farm) => ({
            id: farm.id,
            farmerId: f.id,
            district: farm.district ?? f.district ?? '',
            tehsil: farm.tehsil ?? undefined,
            areaAcres: farm.areaAcres ?? 0,
            geoLat: farm.geoLat ?? undefined,
            geoLng: farm.geoLng ?? undefined,
            eudrRiskLevel: (farm.eudrRiskLevel as CachedFarm['eudrRiskLevel']) ?? 'PENDING',
          })),
          updatedAt: Date.now(),
        }));
        await cacheFarmers(farmersToCache);

        // Cache farms from embedded data
        const farmsToCache: CachedFarm[] = data.data.flatMap((f) =>
          (f.farms ?? []).map((farm) => ({
            id: farm.id,
            farmerId: f.id,
            district: farm.district ?? f.district ?? '',
            tehsil: farm.tehsil ?? undefined,
            areaAcres: farm.areaAcres ?? 0,
            geoLat: farm.geoLat ?? undefined,
            geoLng: farm.geoLng ?? undefined,
            eudrRiskLevel:
              (farm.eudrRiskLevel as CachedFarm['eudrRiskLevel']) ?? 'PENDING',
          }))
        );
        if (farmsToCache.length > 0) {
          await cacheFarms(farmsToCache);
        }

        setLastCached(Date.now());
        console.log(`[Cache] Cached ${farmersToCache.length} farmers`);
      }
    } catch (err) {
      console.warn('[Cache] Failed to refresh farmer cache:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search — works offline from IndexedDB cache
  const search = useCallback(async (query: string) => {
    const results = await searchCachedFarmers(query);
    setFarmers(results);
    return results;
  }, []);

  // Refresh on mount if online
  useEffect(() => {
    refreshCache();
  }, [refreshCache]);

  return { farmers, isLoading, lastCached, refreshCache, search };
}
