"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Camera, MapPin, Loader2, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
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
    const token = localStorage.getItem("officer_token");
    if (!token) {
      router.push("/login");
    }

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
          setError("Failed to get location. GPS is required.");
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

      router.push(`/ward/${params.wardNo}`);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 400) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to mark as resolved.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f2]">
      <main className="text-slate-800 p-4 sm:p-6 flex flex-col max-w-md mx-auto min-h-screen">
        <header className="mb-8 mt-4">
          <Link href={`/ward/${params.wardNo}`} className="inline-flex items-center text-slate-500 hover:text-slate-700 mb-4 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1b4332]">Resolve Ticket</h1>
          <p className="text-sm text-slate-500 font-mono mt-1 px-1 tracking-tight">{params.ticketId}</p>
        </header>

        <div className="flex-1 flex flex-col">
          
          {/* Photo Upload Box */}
          <div 
            className="relative group cursor-pointer border-[1.5px] border-dashed border-slate-300 rounded-3xl bg-white hover:bg-slate-50 transition-all overflow-hidden flex flex-col items-center justify-center p-8 mb-8 shadow-sm h-64"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Proof Preview" className="w-full h-full object-cover absolute inset-0 opacity-90 group-hover:opacity-100" />
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-[#e4ede5] rounded-full flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6 text-[#1b4332]" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Capture "After" Photo</h3>
                <p className="text-sm text-slate-500 mt-2">Required proof of resolution</p>
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
          <div className="mb-6">
            <h4 className="text-[13px] font-bold text-slate-600 mb-2 px-1">Geofence Check</h4>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center shadow-sm">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mr-4 shrink-0">
                {isLocating ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> : <MapPin className="w-6 h-6 text-blue-600" />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-[15px]">Coordinates</h3>
                {isLocating ? (
                  <p className="text-xs text-slate-500 mt-0.5">Verifying...</p>
                ) : location ? (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">Verified ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</p>
                ) : (
                  <p className="text-xs text-red-500 mt-0.5">GPS Required</p>
                )}
              </div>
            </div>
          </div>

          {/* Hackathon Override Toggle */}
          <div className="flex items-center justify-between bg-amber-50/50 p-4 rounded-2xl border border-amber-200/50 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-sm font-bold text-amber-800">Demo Override</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={override} onChange={() => setOverride(!override)} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="mt-auto pt-2 pb-6">
            <button
              onClick={handleResolve}
              disabled={isSubmitting || !image || !location}
              className="w-full bg-[#1b4332] hover:bg-[#133023] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
        </div>
      </main>
    </div>
  );
}
