"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth.store";
import { useI18nStore } from "../../store/i18n.store";
import { LanguageToggle } from "../../components/ui/LanguageToggle";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Lock, Mail, ShieldCheck, ArrowRight, Wheat, CheckCircle2 } from "lucide-react";
import type { UserRole } from "@ricetrace/types";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, loginAsDemoRole } = useAuthStore();
  const { language } = useI18nStore();

  const [email, setEmail] = useState("admin@al-raheem-rice.pk");
  const [password, setPassword] = useState("Secret123!");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const apiUrl =
      process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:4000/api/v1";

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message ||
            errorData?.message ||
            `Login failed (HTTP ${res.status})`
        );
      }

      const json = await res.json();
      const resData = json?.data || json;
      const accessToken =
        resData?.tokens?.accessToken || resData?.accessToken;
      const refreshToken =
        resData?.tokens?.refreshToken || resData?.refreshToken;
      const user = resData?.user;

      if (!accessToken) {
        throw new Error("No access token returned by server");
      }

      setAuth(
        {
          id: user?.id || "usr_admin_001",
          email: user?.email || email,
          name: user?.name || "RiceTrace User",
          role: (user?.role as UserRole) || "MILL_ADMIN",
          organizationId: user?.organizationId || "org_al_raheem",
          organizationName: user?.organizationName || "Al-Raheem Rice Mills Ltd.",
          language: (user?.language as any) || "EN",
        },
        accessToken,
        refreshToken
      );

      router.push("/dashboard");
    } catch (err: any) {
      console.error("[Login] Authentication failed:", err);
      setError(err?.message || "Failed to sign in. Please verify credentials or server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setIsLoading(true);
    setError(null);
    try {
      await loginAsDemoRole(role);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("[Demo Login] Error:", err);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-emerald-900/40">
            🌾
          </div>
          <div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              RiceTrace
            </span>
            <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              Pakistan Export Compliance Platform
            </span>
          </div>
        </div>

        <LanguageToggle className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-750" />
      </div>

      {/* Centered Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="glass-panel bg-slate-900/80 border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl text-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              {language === "UR" ? "لاگ ان کریں" : "Mill Portal Sign In"}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              {language === "UR"
                ? "اپنے مل ایڈمن یا فیلڈ اکاؤنٹ سے لاگ ان کریں"
                : "Authorized export compliance & traceability portal"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/80 border border-red-700/60 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label={language === "UR" ? "ای میل ایڈریس" : "Email Address"}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@ricemill.pk"
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
            />

            <Input
              label={language === "UR" ? "پاس ورڈ" : "Password"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
            />

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500/20"
                />
                <span>Remember on this device</span>
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Contact your Mill Administrator to reset your password.");
                }}
                className="text-emerald-400 hover:underline"
              >
                Forgot Password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full mt-2 font-bold shadow-lg shadow-emerald-700/30"
            >
              {language === "UR" ? "پورٹل میں داخل ہوں" : "Sign In to Dashboard"}
            </Button>
          </form>

          {/* Quick Demo Role Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              ⚡ Instant 1-Click Persona Simulator
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo("MILL_ADMIN")}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-900/40 border border-slate-700 text-slate-300 hover:text-emerald-300 transition-all text-left"
              >
                <div className="font-bold">Mill Admin</div>
                <div className="text-[10px] text-slate-500">Full Access / GM</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("PROCUREMENT_OFFICER")}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-900/40 border border-slate-700 text-slate-300 hover:text-emerald-300 transition-all text-left"
              >
                <div className="font-bold">Procurement</div>
                <div className="text-[10px] text-slate-500">Field / Mobile PWA</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("QUALITY_MANAGER")}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-900/40 border border-slate-700 text-slate-300 hover:text-emerald-300 transition-all text-left"
              >
                <div className="font-bold">QC / Lab Head</div>
                <div className="text-[10px] text-slate-500">Tests & MRL Limits</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("EXPORT_MANAGER")}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-900/40 border border-slate-700 text-slate-300 hover:text-emerald-300 transition-all text-left"
              >
                <div className="font-bold">Export Director</div>
                <div className="text-[10px] text-slate-500">EU Certificates</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Legal */}
      <div className="text-center text-xs text-slate-500 max-w-xl mx-auto">
        <p>
          Compliant with Regulation (EU) 2023/1115 (EUDR) and Sanitary &
          Phytosanitary (SPS) import regulations. Protected by RiceTrace SHA-256
          cryptographic seals.
        </p>
      </div>
    </div>
  );
}
