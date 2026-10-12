"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { ArrowLeft, ArrowRight, CheckCircle2, Camera, Upload, ShieldCheck } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function AddFarmerPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form fields
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [cnic, setCnic] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Sheikhupura");
  const [tehsil, setTehsil] = useState("Muridke");
  const [village, setVillage] = useState("");
  const [unionCouncil, setUnionCouncil] = useState("");

  // CNIC photos
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStep1Valid = name.trim().length >= 2 && cnic.trim().length === 13;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const storeRaw = localStorage.getItem("ricetrace-auth-session");
      let token = null;
      if (storeRaw) {
        try {
          token = JSON.parse(storeRaw)?.state?.accessToken;
        } catch {}
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      await fetch(`${apiUrl}/farmers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cnic: cnic.replace(/\D/g, ""),
          name,
          fatherName,
          phone,
          district,
          tehsil,
          village,
        }),
      });
    } catch (err) {
      console.warn("Farmer API registration warning:", err);
    } finally {
      setIsSubmitting(false);
      router.push("/farmers");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Register New Farmer
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Step {step} of 3 — Pakistani NADRA CNIC & Land Holder Verification
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

        {/* Step Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {["1. Basic Information", "2. CNIC Photo Cards", "3. Confirm & Save"].map(
            (label, idx) => (
              <div
                key={idx}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-bold text-center border transition-all",
                  step === idx + 1
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : step > idx + 1
                    ? "border-slate-200 bg-slate-100 text-slate-500"
                    : "border-slate-100 bg-white text-slate-400"
                )}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Farmer Personal & Location Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name (per CNIC) *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chaudhry Muhammad Ibrahim"
              />
              <Input
                label="Father's Name"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="Haji Abdul Rehman"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="CNIC Number (13 Digits, No Dashes) *"
                value={cnic}
                onChange={(e) => setCnic(e.target.value.replace(/\D/g, "").slice(0, 13))}
                placeholder="3540112345671"
                helperText={`${cnic.length}/13 digits entered`}
                error={cnic && cnic.length !== 13 ? "CNIC must be exactly 13 digits" : undefined}
              />
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03001234567"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  District *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="Sheikhupura">Sheikhupura</option>
                  <option value="Gujranwala">Gujranwala</option>
                  <option value="Hafizabad">Hafizabad</option>
                  <option value="Nankana Sahib">Nankana Sahib</option>
                  <option value="Sialkot">Sialkot</option>
                  <option value="Okara">Okara</option>
                </select>
              </div>

              <Input
                label="Tehsil"
                value={tehsil}
                onChange={(e) => setTehsil(e.target.value)}
                placeholder="Muridke"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Village / Mouza"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Chak 34-RB"
              />
              <Input
                label="Union Council"
                value={unionCouncil}
                onChange={(e) => setUnionCouncil(e.target.value)}
                placeholder="UC 14"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                variant="primary"
                disabled={!isStep1Valid}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => setStep(2)}
              >
                Continue to CNIC Photos
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: CNIC Photos */}
        {step === 2 && (
          <Card className="p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              NADRA CNIC Card Photo Capture
            </h2>
            <p className="text-xs text-slate-500">
              Upload clear front and reverse photographs of the farmer&apos;s Smart CNIC:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Front Card */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50">
                <Camera className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-800">CNIC Front Side</h4>
                <p className="text-[10px] text-slate-400 mt-1">Photo with CNIC number visible</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    setCnicFront("https://images.unsplash.com/photo-1544717305-2782549b5136?w=200")
                  }
                >
                  {cnicFront ? "✓ Front Photo Attached" : "Capture / Upload Front"}
                </Button>
              </div>

              {/* Back Card */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50">
                <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-800">CNIC Back Side</h4>
                <p className="text-[10px] text-slate-400 mt-1">Permanent address & signature</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    setCnicBack("https://images.unsplash.com/photo-1544717305-2782549b5136?w=200")
                  }
                >
                  {cnicBack ? "✓ Back Photo Attached" : "Capture / Upload Back"}
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Review & Confirm
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <Card className="p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Verify Farmer Details
            </h2>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 divide-y divide-slate-200 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-900">{name || "Chaudhry Muhammad Ibrahim"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">CNIC:</span>
                <span className="font-mono font-bold text-slate-900">{cnic || "3540112345671"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">District / Tehsil:</span>
                <span className="font-semibold text-slate-900">{district}, {tehsil}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Village:</span>
                <span className="font-semibold text-slate-900">{village || "Chak 34-RB"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-900">{phone || "03001234567"}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Record will be assigned a unique encrypted Farmer ID with automatic EUDR registry indexing.
              </span>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                isLoading={isSubmitting}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleSubmit}
              >
                Register Farmer
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
