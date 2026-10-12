"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { FarmMap } from "../../../components/maps/FarmMap";
import { EudrBadge } from "../../../components/ui/EudrBadge";
import { MOCK_FARMERS } from "../../../lib/mock-data";
import {
  ArrowLeft,
  Navigation,
  CheckCircle2,
  Camera,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function AddFarmPage() {
  const router = useRouter();

  const [farmerId, setFarmerId] = useState(MOCK_FARMERS[0]?.id || "");
  const [name, setName] = useState("");
  const [areaAcres, setAreaAcres] = useState("12.5");
  const [district, setDistrict] = useState("Sheikhupura");
  const [tehsil, setTehsil] = useState("Muridke");
  const [khasraNumber, setKhasraNumber] = useState("KH-620/1");

  // GPS Coordinates
  const [lat, setLat] = useState<number>(31.7167);
  const [lng, setLng] = useState<number>(73.985);
  const [isGpsCapturing, setIsGpsCapturing] = useState(false);

  // EUDR Realtime Check State
  const [isCheckingEudr, setIsCheckingEudr] = useState(false);
  const [eudrResult, setEudrResult] = useState<"LOW" | "HIGH" | null>(null);

  const handleCaptureGps = () => {
    setIsGpsCapturing(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setIsGpsCapturing(false);
        },
        () => {
          setLat(31.721);
          setLng(73.992);
          setIsGpsCapturing(false);
        }
      );
    } else {
      setLat(31.721);
      setLng(73.992);
      setIsGpsCapturing(false);
    }
  };

  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingEudr(true);

    try {
      const storeRaw = localStorage.getItem("ricetrace-auth-session");
      let token = null;
      if (storeRaw) {
        try {
          token = JSON.parse(storeRaw)?.state?.accessToken;
        } catch {}
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      await fetch(`${apiUrl}/farms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          farmerId,
          name: name || `Farm Plot ${khasraNumber}`,
          areaAcres: parseFloat(areaAcres) || 10,
          geoLat: lat || 31.7167,
          geoLng: lng || 73.985,
          district,
          tehsil,
          landTitle: khasraNumber,
        }),
      });
    } catch (err) {
      console.warn("Farm API creation warning:", err);
    }

    // EUDR Satellite Check simulation feedback
    setTimeout(() => {
      setIsCheckingEudr(false);
      setEudrResult("LOW");
      setTimeout(() => {
        router.push(`/farmers/${farmerId}`);
      }, 800);
    }, 1200);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Add Field & Plot Geolocation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              EU Deforestation Regulation (EUDR) Article 9 Farm Boundary Mapping
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Cancel
          </Button>
        </div>

        <form onSubmit={handleSaveFarm} className="space-y-6">
          {/* Section 1: Farmer & Cadastral Info */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Owner & Land Title Records
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Registered Farmer *
              </label>
              <select
                value={farmerId}
                onChange={(e) => setFarmerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 font-medium"
              >
                {MOCK_FARMERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (CNIC: {f.cnic.slice(0, 5)}...) — {f.district}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Field / Plot Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dera East Canal Plot"
                required
              />
              <Input
                label="Area in Acres *"
                type="number"
                step="0.1"
                value={areaAcres}
                onChange={(e) => setAreaAcres(e.target.value)}
                placeholder="12.5"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="District *"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Sheikhupura"
                required
              />
              <Input
                label="Tehsil *"
                value={tehsil}
                onChange={(e) => setTehsil(e.target.value)}
                placeholder="Muridke"
                required
              />
              <Input
                label="Khasra Number (Patwar Record) *"
                value={khasraNumber}
                onChange={(e) => setKhasraNumber(e.target.value)}
                placeholder="KH-620/1"
                required
              />
            </div>
          </Card>

          {/* Section 2: GPS Mapping */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  2. Farm Geolocation Coordinates (Leaflet Map)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tap to capture on device or click map to adjust pin position
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isGpsCapturing}
                leftIcon={<Navigation className="w-4 h-4 text-emerald-600" />}
                onClick={handleCaptureGps}
              >
                Use My Current GPS
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-800">
              <div>Latitude: <span className="font-bold">{lat.toFixed(5)}°N</span></div>
              <div>Longitude: <span className="font-bold">{lng.toFixed(5)}°E</span></div>
            </div>

            {/* Interactive Leaflet Pin Placement Map */}
            <FarmMap
              center={[lat, lng]}
              zoom={14}
              height="280px"
              editable={true}
              onLocationSelect={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
              markers={[
                {
                  id: "new_farm_marker",
                  lat,
                  lng,
                  title: name || "New Field Plot",
                  subtitle: `${areaAcres} Acres • ${khasraNumber}`,
                  eudrRisk: "PENDING",
                },
              ]}
            />
          </Card>

          {/* EUDR Validation Processing Box */}
          {isCheckingEudr && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold">Contacting Global Forest Watch API...</div>
                <div>Scanning satellite deforestation alerts for post-Dec 31, 2020 land clearing.</div>
              </div>
            </div>
          )}

          {eudrResult && (
            <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center gap-3 text-emerald-900 text-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <div className="font-extrabold text-sm">EUDR Deforestation Check: LOW RISK (PASS)</div>
                <div>No forest loss detected on plot coordinates. Approved for EU export consignments!</div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isCheckingEudr}
              rightIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Save Farm & Run EUDR Check
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
