"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera, MapPin, Loader2, AlertCircle, ArrowRight,
  Search, RefreshCw, X, CheckCircle2, Copy, Globe, Building2
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

interface ImageEntry {
  file: File;
  preview: string;
}

type GPSState = "idle" | "locating" | "ok" | "denied";

export default function Home() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [gpsState, setGpsState] = useState<GPSState>("idle");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"new" | "status">("new");
  const [searchId, setSearchId] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const requestGPS = useCallback(() => {
    setGpsState("locating");
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported by this browser.");
      setGpsState("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setGpsState("ok");
        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const addr = res.data?.address;
          if (addr) {
            const name =
              addr.suburb || addr.neighbourhood || addr.city_district || addr.city || "Location Detected";
            setLocationName(name);
          }
        } catch {
          setLocationName("Location Detected");
        }
      },
      () => {
        setGpsState("denied");
        setError("GPS access denied. Tap 'Retry GPS' to try again, or enable location in browser settings.");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Auto-request GPS on mount for "new" tab
  useEffect(() => {
    if (activeTab === "new" && gpsState === "idle") {
      requestGPS();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      URL.revokeObjectURL(prev[idx].preview);
      return next;
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
    // Reset input so same file can be re-added after remove
    e.target.value = "";
  };

  const validateMobile = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (val && digits.length !== 10) {
      setMobileError("Enter exactly 10 digits");
    } else {
      setMobileError(null);
    }
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
    setMobile(val);
    validateMobile(val);
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      setError("Please take or upload at least one photo.");
      return;
    }
    if (!location) {
      setError("GPS location is required. Please allow location access.");
      return;
    }
    if (mobile && mobile.length !== 10) {
      setMobileError("Enter exactly 10 digits");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      images.forEach(({ file }) => formData.append("images", file));
      formData.append("lat", location.lat.toString());
      formData.append("lng", location.lng.toString());
      if (mobile) formData.append("mobile", mobile);

      const response = await axios.post(`${API_BASE_URL}/complain`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200 || response.status === 202) {
        const { complaint_id } = response.data;
        // Save recent IDs to localStorage for easy re-access
        try {
          const recent = JSON.parse(localStorage.getItem("recent_complaints") || "[]");
          localStorage.setItem(
            "recent_complaints",
            JSON.stringify([complaint_id, ...recent].slice(0, 5))
          );
        } catch {}
        router.push(`/status/${complaint_id}`);
      }
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(detail || "Failed to submit. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = searchId.trim().toUpperCase();
    if (id) router.push(`/status/${id}`);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Recent complaints from localStorage
  let recentComplaints: string[] = [];
  try {
    recentComplaints = JSON.parse(localStorage.getItem("recent_complaints") || "[]");
  } catch {}

  const canSubmit = images.length > 0 && location !== null && !mobileError && !isSubmitting;

  return (
    <div className="min-h-screen bg-[#f5f6f2]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-extrabold text-[#1b4332] tracking-tight flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-lg bg-[#1b4332] text-white flex items-center justify-center text-xs font-black">CF</span>
          <span>CivicFix</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/explore"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[#1b4332]" />
            <span>National Feed</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Officer Login</span>
          </Link>
        </div>
      </header>

      <main className="text-slate-800 px-4 pt-4 pb-24 flex flex-col max-w-lg mx-auto lg:max-w-4xl">

        {/* ── Tab Toggle ── */}
        <div className="flex bg-[#e8e9e4] p-1.5 rounded-2xl mb-6">
          {(["new", "status"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                activeTab === tab
                  ? "bg-white shadow-sm text-[#1b4332]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "new" ? "New Report" : "Check Status"}
            </button>
          ))}
        </div>

        {activeTab === "new" ? (
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            {/* ── Left Col: Form ── */}
            <div className="flex flex-col gap-6">

              {/* Photo Upload */}
              <div>
                <h4 className="text-[13px] font-bold text-slate-600 mb-2">
                  Photos{" "}
                  <span className="text-slate-400 font-normal">({images.length}/5)</span>
                </h4>
                <div
                  className={`cursor-pointer border-[1.5px] border-dashed rounded-3xl bg-white hover:bg-slate-50 transition-all flex flex-col items-center justify-center p-7 shadow-sm ${
                    images.length >= 5 ? "border-slate-200 opacity-60 pointer-events-none" : "border-slate-300"
                  }`}
                  onClick={() => images.length < 5 && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  aria-label="Upload issue photos"
                >
                  <div className="w-12 h-12 bg-[#e4ede5] rounded-full flex items-center justify-center mb-3">
                    <Camera className="w-6 h-6 text-[#1b4332]" />
                  </div>
                  <p className="font-bold text-slate-800 text-[15px]">
                    {images.length >= 5 ? "5/5 photos added" : images.length > 0 ? "Add more photos" : "Tap to photograph"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {images.length >= 5 ? "Remove a photo to add another" : `Up to ${5 - images.length} more photo${5 - images.length !== 1 ? "s" : ""}`}
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

                {/* Thumbnails */}
                {images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto mt-3 pb-1 scrollbar-hide">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
                      >
                        <img src={img.preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
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

              {/* Location */}
              <div>
                <h4 className="text-[13px] font-bold text-slate-600 mb-2">Location</h4>
                <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    gpsState === "ok" ? "bg-[#e4ede5]" : gpsState === "denied" ? "bg-red-50" : "bg-slate-100"
                  }`}>
                    {gpsState === "locating"
                      ? <Loader2 className="w-5 h-5 text-[#1b4332] animate-spin" />
                      : gpsState === "denied"
                      ? <MapPin className="w-5 h-5 text-red-500" />
                      : <MapPin className="w-5 h-5 text-[#1b4332]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${gpsState === "denied" ? "text-red-600" : "text-slate-800"}`}>
                      {gpsState === "locating" ? "Locating..." :
                       gpsState === "denied" ? "Location Required" :
                       gpsState === "ok" ? (locationName || "Location Detected") :
                       "Waiting for GPS"}
                    </p>
                    {gpsState === "ok" && location && (
                      <p className="text-xs text-slate-500 mt-0.5">
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

              {/* Mobile Number */}
              <div>
                <h4 className="text-[13px] font-bold text-slate-600 mb-2">
                  Mobile <span className="font-normal text-slate-400">(optional — for SMS updates)</span>
                </h4>
                <div className={`bg-white border rounded-2xl flex items-center overflow-hidden shadow-sm transition-colors ${
                  mobileError ? "border-red-300" : "border-slate-200"
                }`}>
                  <div className="px-4 py-4 font-bold text-slate-600 bg-slate-50 border-r border-slate-200 text-sm shrink-0">
                    +91
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={handleMobileChange}
                    className="flex-1 py-4 px-4 outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium bg-white"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                  {mobile.length > 0 && (
                    <span className={`pr-4 text-xs font-bold shrink-0 ${mobile.length === 10 ? "text-emerald-600" : "text-slate-400"}`}>
                      {mobile.length}/10
                    </span>
                  )}
                </div>
                {mobileError && (
                  <p className="text-xs text-red-500 font-medium mt-1.5 px-1">{mobileError}</p>
                )}
              </div>
            </div>

            {/* ── Right Col: Info Panel (desktop only) ── */}
            <div className="hidden lg:flex flex-col gap-4 pt-7">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">How it works</h3>
                <div className="space-y-4">
                  {[
                    { step: "1", title: "Photograph the issue", desc: "Up to 5 photos of the civic hazard (pothole, streetlight, garbage, etc.)" },
                    { step: "2", title: "Auto-location", desc: "Your GPS location is auto-captured and sent to the correct ward office." },
                    { step: "3", title: "AI reviews in seconds", desc: "Our AI verifies it's a real civic issue and creates a priority ticket." },
                    { step: "4", title: "Track & get updates", desc: "Get SMS updates if you share your number, or track via complaint ID." },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#e4ede5] text-[#1b4332] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {step}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acceptable Issues */}
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Report only municipal issues</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Potholes", "Open manholes", "Broken streetlights", "Garbage overflow", "Water leaks", "Fallen trees"].map(t => (
                    <span key={t} className="text-[11px] bg-white text-amber-700 border border-amber-200 rounded-full px-2.5 py-1 font-medium">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Status Tab ── */
          <div className="flex flex-col gap-6 max-w-lg">
            <form onSubmit={handleSearch}>
              <div className="bg-white border border-slate-200 rounded-2xl flex items-center overflow-hidden shadow-sm mb-3">
                <div className="pl-4 text-slate-400 shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                  className="flex-1 py-4 px-3 outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium font-mono"
                  placeholder="Enter Complaint ID (e.g. AB12CD)"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!searchId.trim()}
                className="w-full bg-[#1b4332] hover:bg-[#133023] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Track Report <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            {/* Recent Complaints */}
            {recentComplaints.length > 0 && (
              <div>
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Your Recent Reports</p>
                <div className="space-y-2">
                  {recentComplaints.map((id) => (
                    <div key={id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#e4ede5] rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-[#1b4332]" />
                        </div>
                        <span className="font-mono font-bold text-slate-800 text-sm">{id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyId(id)}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Copy ID"
                        >
                          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => router.push(`/status/${id}`)}
                          className="text-xs font-bold text-[#1b4332] bg-[#e4ede5] hover:bg-[#d0ded2] px-3 py-1.5 rounded-xl transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Error Banner ── */}
        {error && activeTab === "new" && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ── Submit Button (sticky on mobile) ── */}
        {activeTab === "new" && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f5f6f2]/95 backdrop-blur-sm border-t border-slate-200/60 lg:static lg:bg-transparent lg:border-0 lg:p-0 lg:mt-6 lg:backdrop-blur-none">
            <div className="max-w-lg mx-auto lg:max-w-none">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-[#1b4332] hover:bg-[#133023] active:scale-[0.98] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Send to Ward Office <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
