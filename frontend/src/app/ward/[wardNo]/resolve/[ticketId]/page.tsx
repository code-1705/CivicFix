"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { API_BASE_URL, getFullImageUrl } from "@/lib/api";
import {
  Camera, MapPin, Loader2, AlertTriangle, ArrowLeft,
  ArrowRight, X, RefreshCw, Info, Navigation
} from "lucide-react";
import Link from "next/link";

interface TicketDetail {
  master_ticket_id: string;
  category: string;
  severity: string;
  lat: number;
  lng: number;
  sla_deadline: string;
  coupled_images?: string[];
  description?: string;
}

interface ImageEntry {
  file: File;
  preview: string;
}

type GPSState = "idle" | "locating" | "ok" | "denied";

export default function ResolveTicketPage() {
  const params = useParams();
  const router = useRouter();

  const [images, setImages] = useState<ImageEntry[]>([]);
  const [gpsState, setGpsState] = useState<GPSState>("idle");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [override, setOverride] = useState(false);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [ticketLoading, setTicketLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const requestGPS = useCallback(() => {
    setGpsState("locating");
    if (!("geolocation" in navigator)) {
      setGpsState("denied");
      setError("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGpsState("ok");
      },
      () => {
        setGpsState("denied");
        setError("GPS access denied. Enable location in browser settings, then tap Retry GPS.");
      },
      { timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("officer_token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch ticket details for context
    const fetchTicket = async () => {
      try {
        const wardNo = localStorage.getItem("officer_ward");
        const response = await axios.get(`${API_BASE_URL}/ward_complain/${wardNo}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const found = response.data.find(
          (t: TicketDetail) => t.master_ticket_id === params.ticketId
        );
        if (found) setTicket(found);
      } catch {
        // Non-fatal — just don't show context
      } finally {
        setTicketLoading(false);
      }
    };

    fetchTicket();
    requestGPS();
  }, [router, requestGPS, params.ticketId]);

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const slotsLeft = 5 - images.length;
    const toAdd = files.slice(0, slotsLeft).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...toAdd]);
    e.target.value = "";
  };

  const handleResolve = async () => {
    if (images.length === 0 || !location) {
      setError("At least one proof photo and GPS location are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("officer_token");
      const formData = new FormData();
      images.forEach(({ file }) => formData.append("proof_images", file));
      formData.append("lat", location.lat.toString());
      formData.append("lng", location.lng.toString());
      formData.append("override", override.toString());

      await axios.post(`${API_BASE_URL}/resolve/${params.ticketId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      router.push(`/ward/${params.wardNo}`);
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        // FastAPI 422 returns array of validation error objects
        setError(detail.map((d: any) => d.msg || JSON.stringify(d)).join(". "));
      } else {
        setError("Failed to mark as resolved. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  const canSubmit = images.length > 0 && location !== null && !isSubmitting;

  return (
    <div className="min-h-screen bg-[#f5f6f2]">
      <main className="text-slate-800 p-4 sm:p-6 flex flex-col max-w-lg mx-auto min-h-screen">

        {/* Header */}
        <header className="mb-6 mt-4">
          <Link
            href={`/ward/${params.wardNo}`}
            className="inline-flex items-center text-slate-500 hover:text-slate-700 mb-4 font-medium transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1b4332]">Resolve Ticket</h1>
          <p className="text-sm text-slate-500 font-mono mt-1">{params.ticketId}</p>
        </header>

        {/* ── Ticket Context Panel ── */}
        {!ticketLoading && ticket && (
          <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#e4ede5] rounded-lg">
                  <Info className="w-4 h-4 text-[#1b4332]" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{ticket.category}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    SLA: {new Date(ticket.sla_deadline).toLocaleString([], {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps?q=${ticket.lat},${ticket.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1b4332] bg-[#e4ede5] hover:bg-[#d0ded2] px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Navigate
              </a>
            </div>

            {/* Citizen Before-Photos */}
            {ticket.coupled_images && ticket.coupled_images.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Citizen photos — Before ({ticket.coupled_images.length})
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {ticket.coupled_images.map((imgUrl, idx) => {
                    const fullUrl = getFullImageUrl(imgUrl);
                    return (
                      <a
                        key={idx}
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity"
                      >
                        <img src={fullUrl} alt={`Before ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Proof Photo Upload ── */}
        <div className="mb-6">
          <h4 className="text-[13px] font-bold text-slate-600 mb-2">
            Resolution Proof Photos{" "}
            <span className="text-slate-400 font-normal">({images.length}/5)</span>
          </h4>
          <div
            className={`cursor-pointer border-[1.5px] border-dashed rounded-3xl bg-white hover:bg-slate-50 transition-all flex flex-col items-center justify-center p-7 shadow-sm ${
              images.length >= 5 ? "opacity-60 pointer-events-none border-slate-200" : "border-slate-300"
            }`}
            onClick={() => images.length < 5 && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div className="w-12 h-12 bg-[#e4ede5] rounded-full flex items-center justify-center mb-3">
              <Camera className="w-6 h-6 text-[#1b4332]" />
            </div>
            <p className="font-bold text-slate-800 text-[15px]">
              {images.length >= 5 ? "5/5 photos added" : images.length > 0 ? "Add More Proof Photos" : "Capture 'After' Photos"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {images.length >= 5 ? "Remove a photo to add another" : "Required proof of resolution (up to 5)"}
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />
          </div>

          {images.length > 0 && (
            <div className="flex gap-3 overflow-x-auto mt-3 pb-1 scrollbar-hide">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={img.preview} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                    aria-label={`Remove photo ${idx + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── GPS Verification ── */}
        <div className="mb-6">
          <h4 className="text-[13px] font-bold text-slate-600 mb-2">Geofence Check</h4>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              gpsState === "ok" ? "bg-blue-50" : gpsState === "denied" ? "bg-red-50" : "bg-slate-100"
            }`}>
              {gpsState === "locating"
                ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                : <MapPin className={`w-5 h-5 ${gpsState === "ok" ? "text-blue-600" : gpsState === "denied" ? "text-red-500" : "text-slate-400"}`} />
              }
            </div>
            <div className="flex-1">
              <p className={`font-bold text-sm ${gpsState === "denied" ? "text-red-600" : "text-slate-800"}`}>
                {gpsState === "locating" ? "Verifying location..." :
                 gpsState === "ok" ? "Location Verified" :
                 gpsState === "denied" ? "GPS Required" : "Waiting..."}
              </p>
              {gpsState === "ok" && location && (
                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
              )}
              {gpsState === "denied" && (
                <p className="text-xs text-red-500 mt-0.5">Allow location in browser settings</p>
              )}
            </div>
            {(gpsState === "denied" || gpsState === "idle") && (
              <button
                type="button"
                onClick={requestGPS}
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-[#1b4332] bg-[#e4ede5] hover:bg-[#d0ded2] px-3 py-2 rounded-xl transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry GPS
              </button>
            )}
          </div>
        </div>

        {/* ── Demo Override ── */}
        <div className="flex items-center justify-between bg-amber-50/50 p-4 rounded-2xl border border-amber-200/50 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-sm font-bold text-amber-800">Demo Override</span>
              <p className="text-xs text-amber-600 mt-0.5">Bypass 100m geofence check</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={override} onChange={() => setOverride(!override)} />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-600">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="mt-auto pt-2 pb-6">
          <button
            onClick={handleResolve}
            disabled={!canSubmit}
            className="w-full bg-[#1b4332] hover:bg-[#133023] active:scale-[0.98] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md disabled:active:scale-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Mark as Resolved <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
