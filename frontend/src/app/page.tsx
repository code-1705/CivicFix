"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, MapPin, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
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
          setError("Failed to get location. Please enable GPS.");
          setIsLocating(false);
        }
      );
    } else {
      setError("Geolocation is not supported.");
      setIsLocating(false);
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      setError("Please take or upload a photo of the issue.");
      return;
    }
    if (!location) {
      setError("Waiting for GPS location...");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("images", image);
      formData.append("lat", location.lat.toString());
      formData.append("lng", location.lng.toString());
      if (mobile) {
        formData.append("mobile", mobile);
      }

      // Replace with actual backend URL if deployed
      const response = await axios.post("http://localhost:8000/complain", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200 || response.status === 202) {
        const { complaint_id } = response.data;
        router.push(`/status/${complaint_id}`);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to submit the report. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f2]">
      <main className="min-h-screen text-slate-800 p-4 sm:p-6 flex flex-col max-w-md mx-auto">
        
        {/* Application Name */}
        <header className="flex justify-center py-2">
          <h1 className="text-2xl font-extrabold text-[#1b4332] tracking-tight">CivicFix</h1>
        </header>

        {/* Top Toggle Navigation */}
        <div className="flex bg-[#e8e9e4] p-1.5 rounded-2xl mb-8 mt-4">
        <button className="flex-1 bg-white shadow-sm rounded-xl py-2.5 text-sm font-bold text-[#1b4332] transition-all">
          New report
        </button>
        <button className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-all">
          Report status
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        
        {/* Photo Upload Section */}
        <div 
          className="relative group cursor-pointer border-[1.5px] border-dashed border-slate-300 rounded-3xl bg-white hover:bg-slate-50 transition-all overflow-hidden flex flex-col items-center justify-center p-8 mb-8 shadow-sm h-64"
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover absolute inset-0 opacity-90 group-hover:opacity-100" />
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-[#e4ede5] rounded-full flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-[#1b4332]" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Tap to photograph the issue</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-[250px]">A clear photo helps us route it to the right team faster</p>
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

        {/* Location Section */}
        <div className="mb-6">
          <h4 className="text-[13px] font-bold text-slate-600 mb-2 px-1">Where is this happening?</h4>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center shadow-sm">
            <div className="w-12 h-12 bg-[#e4ede5] rounded-xl flex items-center justify-center mr-4 shrink-0">
              {isLocating ? <Loader2 className="w-5 h-5 text-[#1b4332] animate-spin" /> : <MapPin className="w-6 h-6 text-[#1b4332]" />}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-[15px]">Ward 151, Bengaluru</h3>
              {isLocating ? (
                <p className="text-xs text-slate-500 mt-0.5">Acquiring GPS...</p>
              ) : location ? (
                <p className="text-xs text-slate-500 mt-0.5">Detected from your location</p>
              ) : (
                <p className="text-xs text-red-500 mt-0.5">Location required</p>
              )}
            </div>
            <button className="text-sm font-bold text-[#1a5b6e] px-3">Edit</button>
          </div>
        </div>

        {/* Mobile Number Section */}
        <div className="mb-8">
          <h4 className="text-[13px] font-bold text-slate-600 mb-2 px-1">Mobile number (optional)</h4>
          <div className="bg-white border border-slate-200 rounded-2xl flex items-center overflow-hidden shadow-sm">
            <div className="px-4 py-4 font-bold text-slate-700 bg-white border-r border-slate-200">
              +91
            </div>
            <input 
              type="tel" 
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="flex-1 py-4 px-4 outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium" 
              placeholder="For updates on this report" 
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="mt-auto pt-2 pb-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !image || !location}
            className="w-full bg-[#1b4332] hover:bg-[#133023] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Send to ward office <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
      </main>
    </div>
  );
}
