"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapPinItem {
  id: string;
  lat: number;
  lng: number;
  category: string;
  department: string;
  severity: string;
  status: string;
  ward: string;
  city: string;
  resolved_image_url?: string;
  created_at?: string;
  impact_count?: number;
}

interface NationalMapProps {
  pins: MapPinItem[];
  selectedId?: string | null;
  onSelectPin?: (pin: MapPinItem) => void;
}

export default function NationalMap({ pins, selectedId, onSelectPin }: NationalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous map instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Default center: India or first valid pin
      const defaultCenter: [number, number] =
        pins.length > 0 && pins[0].lat && pins[0].lng
          ? [pins[0].lat, pins[0].lng]
          : [12.9276, 77.6063]; // Bengaluru / Ward 151 default

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: pins.length > 0 ? 14 : 5,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Modern clean OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add pins
      markersRef.current = [];
      const latLngBounds: [number, number][] = [];

      pins.forEach((pin) => {
        if (!pin.lat || !pin.lng) return;

        latLngBounds.push([pin.lat, pin.lng]);
        const isResolved = pin.status === "resolved";
        const isHigh = pin.severity === "high";

        // Custom circle marker for high performance
        const fillColor = isResolved ? "#10b981" : isHigh ? "#ef4444" : "#f59e0b";
        const strokeColor = isResolved ? "#047857" : isHigh ? "#b91c1c" : "#d97706";

        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: 9,
          fillColor: fillColor,
          color: strokeColor,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(map);

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; min-width: 170px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-weight: 800; color: #1e293b;">${pin.category}</span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; background: ${
                isResolved ? '#d1fae5' : '#fee2e2'
              }; color: ${isResolved ? '#065f46' : '#991b1b'};">
                ${isResolved ? 'RESOLVED' : 'ACTIVE'}
              </span>
            </div>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">
              Ward ${pin.ward}, ${pin.city}
            </div>
            <div style="font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">
              ID: ${pin.id}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on("click", () => {
          if (onSelectPin) onSelectPin(pin);
        });

        markersRef.current.push(marker);
      });

      // Auto fit bounds if multiple pins exist
      if (latLngBounds.length > 1) {
        try {
          map.fitBounds(latLngBounds, { padding: [40, 40] });
        } catch {
          // fallback
        }
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pins, onSelectPin]);

  return (
    <div className="w-full h-[400px] sm:h-[480px] lg:h-[560px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
