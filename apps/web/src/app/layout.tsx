import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { SyncStatusBanner } from "@/components/pwa/SyncStatusBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export const metadata: Metadata = {
  title: "RiceTrace — Rice Mill Export Compliance & Traceability SaaS",
  description:
    "Enterprise EUDR and SPS traceability SaaS for Pakistani rice mills exporting Basmati to the EU, UK, and worldwide.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RiceTrace",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#10b981" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        {/* PWA: manifest + Apple meta tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RiceTrace" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased selection:bg-emerald-500 selection:text-white">
        {/* Offline/sync status banner — fixed top, zero height when online & clean */}
        <SyncStatusBanner />

        {children}

        {/* PWA install prompt — bottom sheet, shows once */}
        <InstallPrompt />

        {/* Registers /sw.js in production — renders nothing */}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
