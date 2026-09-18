"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Camera, MapPin, UploadCloud, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResolveTicketPage() {
  const params = useParams();
  const router = useRouter();
  
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [override, setOverride] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auth check
    const token = localStorage.getItem("officer_token");
    if (!token) {
      router.push("/login");
    }

    // Get location
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
        },
        (err) => {
          console.error(err);
          setError("Failed to get location. GPS is required for geofenced resolution.");
          setIsLocating(false);
        }
      );
    }
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleResolve = async () => {
    if (!image || !location) {
      setError("Photo and GPS location are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("officer_token");
      const formData = new FormData();
      formData.append("proof_image", image);
      formData.append("lat", location.lat.toString());
      formData.append("lng", location.lng.toString());
      formData.append("override", override.toString());

      await axios.post(`http://localhost:8000/resolve/${params.ticketId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        },
      });

      // Redirect back to dashboard on success
      router.push(`/ward/${params.wardNo}`);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 400) {
        setError(err.response.data.detail); // Geofence error
      } else {
        setError("Failed to mark as resolved.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 p-6 flex flex-col max-w-md mx-auto">
      <header className="mb-6 mt-2">
        <Link href={`/ward/${params.wardNo}`} className="inline-flex items-center text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Resolve Ticket</h1>
        <p className="text-sm text-slate-400 font-mono mt-1">{params.ticketId}</p>
      </header>

      <div className="flex-1 flex flex-col gap-6">
        
        {/* Photo Upload Box */}
        <div 
          className="relative group cursor-pointer border-2 border-dashed border-slate-600 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-all overflow-hidden flex flex-col items-center justify-center h-64 shadow-inner"
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Proof Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-400">
                <Camera className="w-8 h-8" />
              </div>
              <span className="font-medium">Capture "After" Photo</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
        </div>

        {/* GPS Verification Box */}
        <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-700 shadow-md">
          <div className="p-3 bg-blue-500/20 rounded-full text-blue-400 shrink-0">
            {isLocating ? <Loader2 className="w-6 h-6 animate-spin" /> : <MapPin className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Geofence Check</h3>
            {isLocating ? (
              <p className="text-xs text-slate-400">Verifying coordinates...</p>
            ) : location ? (
              <p className="text-xs text-emerald-400">Verified ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</p>
            ) : (
              <p className="text-xs text-red-400">GPS Required</p>
            )}
          </div>
        </div>

        {/* Hackathon Override Toggle */}
        <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-100">Demo Mode: Override Geofence</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={override} onChange={() => setOverride(!override)} />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="mt-auto pt-6">
          <button
            onClick={handleResolve}
            disabled={isSubmitting || !image || !location}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                Mark as Resolved
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
