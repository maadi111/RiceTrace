"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  eudrRisk?: "LOW" | "MEDIUM" | "HIGH" | "PENDING";
}

interface FarmMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  editable?: boolean;
  dotStyle?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  className?: string;
}

export function FarmMap({
  markers = [],
  center = [31.7167, 73.985], // Muridke / Sheikhupura Punjab default
  zoom = 12,
  height = "380px",
  editable = false,
  dotStyle = false,
  onLocationSelect,
  className,
}: FarmMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      // Dynamically import leaflet
      const L = (await import("leaflet")).default;

      // If map is already initialized on this container, clean it up
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initial center: if markers exist, center on first marker, else center prop
      const initialCenter: [number, number] =
        markers.length > 0 && markers[0]
          ? [markers[0].lat, markers[0].lng]
          : center;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom,
        zoomControl: true,
      });

      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom marker icons
      const createIcon = (color: string) =>
        dotStyle
          ? L.divIcon({
              className: "custom-dot-icon",
              html: `<div style="
                background-color: ${color};
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 1px 4px rgba(0,0,0,0.35);
              "></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
              popupAnchor: [0, -6],
            })
          : L.divIcon({
              className: "custom-div-icon",
              html: `<div style="
                background-color: ${color};
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: white;
                font-weight: bold;
              ">🌾</div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
              popupAnchor: [0, -12],
            });

      // Add markers
      markers.forEach((m) => {
        let pinColor = "#059669"; // Emerald LOW
        if (m.eudrRisk === "HIGH") pinColor = "#dc2626"; // Red
        if (m.eudrRisk === "MEDIUM") pinColor = "#d97706"; // Amber

        const marker = L.marker([m.lat, m.lng], { icon: createIcon(pinColor) }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${m.title}</div>
            ${m.subtitle ? `<div style="color: #64748b; font-size: 11px;">${m.subtitle}</div>` : ""}
            <div style="margin-top: 4px; font-size: 10px; font-family: monospace; color: #475569;">
              ${m.lat.toFixed(5)}°N, ${m.lng.toFixed(5)}°E
            </div>
            ${
              m.eudrRisk
                ? `<div style="margin-top: 4px; font-size: 10px; font-weight: 700; color: ${pinColor};">
                    EUDR: ${m.eudrRisk}
                   </div>`
                : ""
            }
          </div>
        `);
      });

      // If editable, handle clicks to place/move pin
      if (editable) {
        let activeMarker: any = null;

        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          setSelectedCoords([lat, lng]);

          if (activeMarker) {
            activeMarker.setLatLng([lat, lng]);
          } else {
            activeMarker = L.marker([lat, lng], {
              icon: createIcon("#15803d"),
            }).addTo(map);
          }

          activeMarker.bindPopup(`
            <div style="font-size: 12px; font-weight: 600;">Selected Location</div>
            <div style="font-size: 10px; color: #64748b;">${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E</div>
          `).openPopup();

          onLocationSelect?.(lat, lng);
        });
      }

      // If multiple markers, fit bounds
      if (markers.length > 1) {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers, center, zoom, editable]);

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0",
        className
      )}
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      {editable && (
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm z-[1000]">
          {selectedCoords
            ? `📍 ${selectedCoords[0].toFixed(5)}°N, ${selectedCoords[1].toFixed(5)}°E`
            : "Tap anywhere on the map to set farm GPS pin"}
        </div>
      )}
    </div>
  );
}
