'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Wifi,
  WifiOff,
  Camera,
  Search,
  UserCheck,
} from 'lucide-react';
import { GpsCapture, type GpsCaptureResult } from '../pwa/GpsCapture';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useFarmerCache } from '../../hooks/useFarmerCache';
import {
  saveOfflineLot,
  getCachedFarmerWithFarms,
  type CachedFarmer,
  type CachedFarm,
} from '../../lib/db';
import { syncPendingLots } from '../../lib/sync';
import { cn } from '../../lib/utils';

// ─── FORM STATE TYPES ─────────────────────────────────────────────────────────

interface PesticideEntry {
  name: string;
  activeIngredient: string;
  daysBeforeHarvest: string;
}

interface FertilizerEntry {
  name: string;
  npkRatio: string;
}

interface LotFormState {
  // Step 1
  selectedFarmer: CachedFarmer | null;

  // Step 2
  selectedFarmId: string;
  selectedFarmDistrict: string;
  selectedFarmHasGps: boolean;

  // Step 3
  variety: string;
  weightKg: string;
  moisturePercent: string;
  dateReceived: string;
  vehicleNumber: string;

  // Step 4
  noPesticidesFlag: boolean;
  pesticides: PesticideEntry[];
  fertilizers: FertilizerEntry[];

  // Step 5
  photos: File[];
  photoDataUris: string[];

  // Step 6
  gps: GpsCaptureResult | null;
  // Step 7 — confirm (read-only summary)
}

const RICE_VARIETIES = [
  { value: 'BASMATI_1121', label: 'Basmati 1121' },
  { value: 'BASMATI_386', label: 'Basmati 386' },
  { value: 'BASMATI_SUPER', label: 'Super Basmati' },
  { value: 'PARBOILED', label: 'Parboiled (Sella)' },
  { value: 'IRRI_6', label: 'IRRI-6' },
  { value: 'IRRI_9', label: 'IRRI-9' },
  { value: 'OTHER', label: 'Other' },
] as const;

const STEP_LABELS = [
  'Find Farmer',
  'Select Farm',
  'Lot Details',
  'Pesticides',
  'Photos',
  'GPS',
  'Confirm',
];

const INITIAL_STATE: LotFormState = {
  selectedFarmer: null,
  selectedFarmId: '',
  selectedFarmDistrict: '',
  selectedFarmHasGps: false,
  variety: 'BASMATI_1121',
  weightKg: '',
  moisturePercent: '',
  dateReceived: new Date().toISOString().split('T')[0] ?? '',
  vehicleNumber: '',
  noPesticidesFlag: false,
  pesticides: [],
  fertilizers: [],
  photos: [],
  photoDataUris: [],
  gps: null,
};

interface SubmitResult {
  success: boolean;
  localId?: string;
  lotNumber?: string;
  message: string;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function MobileLotWizard() {
  const router = useRouter();
  const { isOnline } = useOnlineStatus();
  const { search } = useFarmerCache();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<LotFormState>(INITIAL_STATE);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CachedFarmer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step Validation ──────────────────────────────────────────────────────────

  function validateStep(s: number): boolean {
    const newErrors: Record<string, string> = {};

    if (s === 1 && !form.selectedFarmer) {
      newErrors['farmer'] = 'Please select a farmer';
    }
    if (s === 2 && !form.selectedFarmId) {
      newErrors['farm'] = 'Please select a farm';
    }
    if (s === 3) {
      if (!form.variety) newErrors['variety'] = 'Select a variety';
      if (!form.weightKg || parseFloat(form.weightKg) <= 0) {
        newErrors['weightKg'] = 'Enter a valid weight';
      }
      if (!form.dateReceived) newErrors['dateReceived'] = 'Select a date';
      if (
        form.moisturePercent &&
        (parseFloat(form.moisturePercent) < 0 ||
          parseFloat(form.moisturePercent) > 30)
      ) {
        newErrors['moisturePercent'] = 'Moisture must be between 0% and 30%';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 7));
  }

  function prevStep() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  // ── Farmer Search ────────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      const results = await search(query);
      setSearchResults(results);
    },
    [search]
  );

  async function selectFarmer(farmer: CachedFarmer) {
    const withFarms = await getCachedFarmerWithFarms(farmer.id);
    setForm((f) => ({
      ...f,
      selectedFarmer: withFarms ?? farmer,
      selectedFarmId: '',
      selectedFarmDistrict: '',
      selectedFarmHasGps: false,
    }));
    setErrors({});
    setStep(2);
  }

  // ── Photo Capture ────────────────────────────────────────────────────────────

  async function handlePhotoCapture(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).slice(0, 5 - form.photos.length);

    const newDataUris = await Promise.all(
      newFiles.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );

    setForm((f) => ({
      ...f,
      photos: [...f.photos, ...newFiles],
      photoDataUris: [...f.photoDataUris, ...newDataUris],
    }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!form.selectedFarmer || !form.selectedFarmId) return;
    setIsSubmitting(true);

    try {
      const localId = crypto.randomUUID();

      const payload = {
        farmerId: form.selectedFarmer.id,
        farmerName: form.selectedFarmer.name,
        farmId: form.selectedFarmId,
        farmDistrict: form.selectedFarmDistrict,
        variety: form.variety,
        weightKg: parseFloat(form.weightKg),
        moisturePercent: form.moisturePercent
          ? parseFloat(form.moisturePercent)
          : undefined,
        dateReceived: form.dateReceived,
        vehicleNumber: form.vehicleNumber || undefined,
        notes: undefined as string | undefined,
        gpsLat: form.gps?.lat,
        gpsLng: form.gps?.lng,
        photoDataUris:
          form.photoDataUris.length > 0 ? form.photoDataUris : undefined,
        pesticidesUsed: form.noPesticidesFlag
          ? []
          : form.pesticides.map((p) => ({
              name: p.name,
              activeIngredient: p.activeIngredient || undefined,
              daysBeforeHarvest: p.daysBeforeHarvest
                ? parseInt(p.daysBeforeHarvest)
                : undefined,
            })),
        fertilizerUsed: form.fertilizers.map((f) => ({
          name: f.name,
          npkRatio: f.npkRatio || undefined,
        })),
        noPesticidesFlag: form.noPesticidesFlag,
      };

      // Save to IndexedDB — works offline
      await saveOfflineLot({ localId, payload });

      // Try to sync immediately if online
      if (isOnline) {
        const result = await syncPendingLots();
        setSubmitResult({
          success: true,
          localId,
          message:
            result.synced > 0
              ? 'Lot saved and synced to server successfully!'
              : 'Lot saved offline. Sync failed — will retry automatically.',
        });
      } else {
        setSubmitResult({
          success: true,
          localId,
          message:
            "You're offline. Lot saved to your device and will sync automatically when you're back online.",
        });
      }
    } catch {
      setSubmitResult({
        success: false,
        message: 'Failed to save lot. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setForm(INITIAL_STATE);
    setStep(1);
    setSubmitResult(null);
    setSearchQuery('');
    setSearchResults([]);
    setErrors({});
  }

  // ── Success / Failure Screen ──────────────────────────────────────────────────

  if (submitResult) {
    return (
      <div
        className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
        style={{ padding: 32, textAlign: 'center' }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {submitResult.success ? '✅' : '❌'}
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 8,
          }}
        >
          {submitResult.success ? 'Lot Saved!' : 'Save Failed'}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: '#64748b',
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          {submitResult.message}
        </p>
        <div
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <button
            onClick={resetForm}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '14px 24px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: 140,
            }}
          >
            New Lot Entry
          </button>
          <button
            onClick={() => router.push('/lots')}
            style={{
              background: 'white',
              color: '#0f172a',
              border: '1.5px solid #e2e8f0',
              padding: '14px 24px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View All Lots
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard Shell ──────────────────────────────────────────────────────────────

  return (
    <div
      className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: '#0f172a',
          color: 'white',
          padding: '16px 16px 12px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <button
            onClick={() => (step === 1 ? router.back() : prevStep())}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={24} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              New Lot Entry
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
              Step {step} of 7 — {STEP_LABELS[step - 1]}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isOnline ? (
              <Wifi size={16} color="#10b981" />
            ) : (
              <WifiOff size={16} color="#f59e0b" />
            )}
          </div>
        </div>

        {/* Step Progress Bar */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}
        >
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 4,
                borderRadius: 2,
                background:
                  i < step
                    ? '#10b981'
                    : i === step - 1
                    ? '#34d399'
                    : 'rgba(255,255,255,0.15)',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Step Content ── */}
      <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>

        {/* ── STEP 1: Find Farmer ── */}
        {step === 1 && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              Find Farmer
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {isOnline
                ? 'Search by name or CNIC number'
                : '⚠️ Offline — searching local cache only'}
            </p>

            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search
                size={18}
                color="#94a3b8"
                style={{ position: 'absolute', left: 14, top: 14 }}
              />
              <input
                type="search"
                inputMode="search"
                placeholder="Farmer name or CNIC number..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '13px 16px 13px 42px',
                  fontSize: 15,
                  borderRadius: 10,
                  border: '1.5px solid #e2e8f0',
                  background: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {errors['farmer'] && (
              <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>
                {errors['farmer']}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {searchResults.map((farmer) => (
                <button
                  key={farmer.id}
                  type="button"
                  onClick={() => selectFarmer(farmer)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    background: 'white',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                      fontSize: 15,
                      color: '#0f172a',
                    }}
                  >
                    {farmer.name}
                    <UserCheck size={14} color="#10b981" />
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    CNIC: {farmer.cnic} · {farmer.district}
                  </div>
                </button>
              ))}
              {searchQuery.length > 0 && searchResults.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 16px',
                    color: '#64748b',
                    fontSize: 14,
                  }}
                >
                  No farmers found for &quot;{searchQuery}&quot;
                  {!isOnline && (
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      Try a different search or go online to see all farmers
                    </div>
                  )}
                </div>
              )}
              {searchQuery.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '16px',
                    color: '#94a3b8',
                    fontSize: 13,
                  }}
                >
                  Start typing to search for a farmer
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Select Farm ── */}
        {step === 2 && form.selectedFarmer && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              Select Farm
            </h3>
            <div
              style={{
                padding: '10px 12px',
                background: '#f0fdf4',
                borderRadius: 8,
                marginBottom: 16,
                border: '1px solid #86efac',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                {form.selectedFarmer.name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                CNIC: {form.selectedFarmer.cnic}
              </div>
            </div>

            {errors['farm'] && (
              <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>
                {errors['farm']}
              </div>
            )}

            {(form.selectedFarmer.farms ?? []).length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  color: '#64748b',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px dashed #e2e8f0',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🌾</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  No farms registered
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  This farmer has no farms in the system yet
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(form.selectedFarmer.farms ?? []).map((farm: CachedFarm) => {
                  const isSelected = form.selectedFarmId === farm.id;
                  return (
                    <button
                      key={farm.id}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          selectedFarmId: farm.id,
                          selectedFarmDistrict: farm.district,
                          selectedFarmHasGps: !!(farm.geoLat && farm.geoLng),
                        }));
                        setErrors({});
                      }}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                        background: isSelected ? '#f0fdf4' : 'white',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: '#0f172a',
                            }}
                          >
                            {farm.district}
                            {farm.tehsil ? `, ${farm.tehsil}` : ''}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#64748b',
                              marginTop: 2,
                            }}
                          >
                            {farm.areaAcres} acres
                            {farm.geoLat
                              ? ' · 📍 GPS recorded'
                              : ' · ⚠️ No GPS'}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 10,
                            background:
                              farm.eudrRiskLevel === 'LOW'
                                ? '#d1fae5'
                                : farm.eudrRiskLevel === 'HIGH'
                                ? '#fee2e2'
                                : '#fef9c3',
                            color:
                              farm.eudrRiskLevel === 'LOW'
                                ? '#065f46'
                                : farm.eudrRiskLevel === 'HIGH'
                                ? '#7f1d1d'
                                : '#78350f',
                          }}
                        >
                          {farm.eudrRiskLevel}
                        </span>
                      </div>
                      {farm.eudrRiskLevel === 'HIGH' && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 11,
                            color: '#7f1d1d',
                            background: '#fee2e2',
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}
                        >
                          ⚠️ High EUDR risk — lots from this farm cannot be
                          included in EU-bound shipments
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Lot Details ── */}
        {step === 3 && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              Lot Details
            </h3>

            {/* Variety */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 8,
                }}
              >
                Rice Variety *
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {RICE_VARIETIES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, variety: v.value }))
                    }
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all text-sm font-bold',
                      form.variety === v.value
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              {errors['variety'] && (
                <div
                  style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}
                >
                  {errors['variety']}
                </div>
              )}
            </div>

            {/* Weight */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Weight (kg) *
              </div>
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 5200"
                value={form.weightKg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, weightKg: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 20,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: `1.5px solid ${errors['weightKg'] ? '#ef4444' : '#e2e8f0'}`,
                  background: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors['weightKg'] && (
                <div
                  style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}
                >
                  {errors['weightKg']}
                </div>
              )}
            </div>

            {/* Date */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Date Received *
              </div>
              <input
                type="date"
                value={form.dateReceived}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dateReceived: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 15,
                  borderRadius: 10,
                  border: `1.5px solid ${errors['dateReceived'] ? '#ef4444' : '#e2e8f0'}`,
                  background: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Moisture */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Moisture % (optional)
              </div>
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 14.5"
                min="0"
                max="30"
                step="0.1"
                value={form.moisturePercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, moisturePercent: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 16,
                  borderRadius: 10,
                  border: `1.5px solid ${errors['moisturePercent'] ? '#ef4444' : '#e2e8f0'}`,
                  background: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors['moisturePercent'] && (
                <div
                  style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}
                >
                  {errors['moisturePercent']}
                </div>
              )}
            </div>

            {/* Vehicle */}
            <div style={{ marginBottom: 4 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Vehicle / Tractor Number (optional)
              </div>
              <input
                type="text"
                placeholder="e.g. LEA-2345"
                value={form.vehicleNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vehicleNumber: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 15,
                  borderRadius: 10,
                  border: '1.5px solid #e2e8f0',
                  background: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: Pesticide Declaration ── */}
        {step === 4 && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              Pesticide Declaration
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Required for EUDR and SPS compliance. Record what the farmer
              says was used.
            </p>

            {/* No pesticides toggle */}
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  noPesticidesFlag: !f.noPesticidesFlag,
                  pesticides: !f.noPesticidesFlag ? [] : f.pesticides,
                }))
              }
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 10,
                marginBottom: 16,
                border: `2px solid ${form.noPesticidesFlag ? '#10b981' : '#e2e8f0'}`,
                background: form.noPesticidesFlag ? '#f0fdf4' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: `2px solid ${form.noPesticidesFlag ? '#10b981' : '#e2e8f0'}`,
                  background: form.noPesticidesFlag ? '#10b981' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {form.noPesticidesFlag && <Check size={14} color="white" />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                  No pesticides were used
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Farmer declares this crop was pesticide-free
                </div>
              </div>
            </button>

            {!form.noPesticidesFlag && (
              <div>
                {form.pesticides.map((pest, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px',
                      borderRadius: 10,
                      border: '1.5px solid #e2e8f0',
                      background: 'white',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        Pesticide {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            pesticides: f.pesticides.filter(
                              (_, idx) => idx !== i
                            ),
                          }))
                        }
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          color: '#ef4444',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Pesticide name *"
                      value={pest.name}
                      onChange={(e) => {
                        const updated = [...form.pesticides];
                        updated[i] = { ...updated[i]!, name: e.target.value };
                        setForm((f) => ({ ...f, pesticides: updated }));
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 14,
                        borderRadius: 8,
                        border: '1.5px solid #e2e8f0',
                        marginBottom: 8,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Days before harvest (PHI)"
                      value={pest.daysBeforeHarvest}
                      onChange={(e) => {
                        const updated = [...form.pesticides];
                        updated[i] = {
                          ...updated[i]!,
                          daysBeforeHarvest: e.target.value,
                        };
                        setForm((f) => ({ ...f, pesticides: updated }));
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 14,
                        borderRadius: 8,
                        border: '1.5px solid #e2e8f0',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      pesticides: [
                        ...f.pesticides,
                        {
                          name: '',
                          activeIngredient: '',
                          daysBeforeHarvest: '',
                        },
                      ],
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 10,
                    border: '2px dashed #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Add Pesticide
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Photos ── */}
        {step === 5 && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              Take Photos
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Optional but recommended. Photo of the paddy, truck, or weight
              slip. Max 5 photos.
            </p>

            {form.photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '24px',
                  borderRadius: 12,
                  border: '2px dashed #10b981',
                  background: '#f0fdf4',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <Camera size={40} color="#10b981" />
                <div
                  style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}
                >
                  Take Photo / Choose from Gallery
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {form.photos.length}/5 photos added
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handlePhotoCapture(e.target.files)}
            />

            {form.photoDataUris.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {form.photoDataUris.map((uri, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uri}
                      alt={`Photo ${i + 1}`}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        borderRadius: 10,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          photos: f.photos.filter((_, idx) => idx !== i),
                          photoDataUris: f.photoDataUris.filter(
                            (_, idx) => idx !== i
                          ),
                        }))
                      }
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: 'white',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        fontSize: 16,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 6: GPS ── */}
        {step === 6 && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              Capture GPS Location
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Records your current location at time of purchase. Required for
              EUDR compliance.
              {!form.selectedFarmHasGps && (
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                  {' '}
                  This farm has no GPS yet — this location will be used.
                </span>
              )}
            </p>

            <GpsCapture
              onCapture={(result) => setForm((f) => ({ ...f, gps: result }))}
              captured={form.gps}
              required
            />
          </div>
        )}

        {/* ── STEP 7: Confirm ── */}
        {step === 7 && form.selectedFarmer && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              Confirm &amp; Save
            </h3>

            {[
              {
                label: 'Farmer',
                value: `${form.selectedFarmer.name} · ${form.selectedFarmer.cnic}`,
              },
              {
                label: 'Farm',
                value: `${form.selectedFarmDistrict} ${form.selectedFarmHasGps ? '· GPS ✓' : '· No GPS'}`,
              },
              {
                label: 'Variety',
                value:
                  RICE_VARIETIES.find((v) => v.value === form.variety)
                    ?.label ?? form.variety,
              },
              { label: 'Weight', value: `${form.weightKg} kg` },
              { label: 'Date', value: form.dateReceived },
              {
                label: 'Moisture',
                value: form.moisturePercent
                  ? `${form.moisturePercent}%`
                  : 'Not recorded',
              },
              {
                label: 'Vehicle',
                value: form.vehicleNumber || 'Not recorded',
              },
              {
                label: 'Pesticides',
                value: form.noPesticidesFlag
                  ? 'None declared'
                  : form.pesticides.length > 0
                  ? `${form.pesticides.length} pesticide(s) declared`
                  : 'Not declared',
              },
              { label: 'Photos', value: `${form.photos.length} photo(s)` },
              {
                label: 'GPS',
                value: form.gps
                  ? `${form.gps.lat.toFixed(4)}°N, ${form.gps.lng.toFixed(4)}°E (±${form.gps.accuracy}m)`
                  : '⚠️ Not captured',
              },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: 14,
                  gap: 8,
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>
                  {row.label}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: '#0f172a',
                    textAlign: 'right',
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}

            {!isOnline && (
              <div
                style={{
                  marginTop: 16,
                  padding: '12px 14px',
                  background: '#fef9c3',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#78350f',
                }}
              >
                📵 You&apos;re offline. This lot will be saved to your device
                and automatically synced when you reconnect.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <div
        style={{
          padding: '12px 16px',
          background: 'white',
          borderTop: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        {step < 7 ? (
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                style={{
                  padding: '14px 20px',
                  borderRadius: 10,
                  border: '1.5px solid #e2e8f0',
                  background: 'white',
                  fontWeight: 600,
                  fontSize: 15,
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={nextStep}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: '#10b981',
                color: 'white',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {step === 5 || step === 6 ? 'Skip & Continue' : 'Continue'}
              <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 10,
              border: 'none',
              background: isSubmitting ? '#6ee7b7' : '#10b981',
              color: 'white',
              fontWeight: 700,
              fontSize: 17,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isSubmitting ? (
              <>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Saving...
              </>
            ) : (
              <>
                <Check size={20} />
                {isOnline ? 'Save & Sync' : 'Save Offline'}
              </>
            )}
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
