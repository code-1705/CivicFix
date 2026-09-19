"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, MapPin, Loader2, AlertCircle, ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Home() {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  
  const [activeTab, setActiveTab] = useState<"new" | "status">("new");
  const [searchId, setSearchId] = useState("");

  const [locationName, setLocationName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (activeTab === "status") return;
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });
          
          try {
            // Free Reverse Geocoding via OpenStreetMap
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const addr = res.data?.address;
            if (addr) {
              const name = addr.suburb || addr.neighbourhood || addr.city_district || addr.city || "Unknown Area";
              setLocationName(name);
            }
          } catch (e) {
            console.error("Geocoding failed", e);
            setLocationName("Location Detected");
          }
          
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
  }, [activeTab]);

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, i) => i !== indexToRemove));
    setPreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImages(prev => [...prev, ...files].slice(0, 5)); // Max 5 images
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => {
            const newPreviews = [...prev, reader.result as string].slice(0, 5);
            return newPreviews;
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      setError("Please take or upload at least one photo.");
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
      images.forEach(img => {
        formData.append("images", img);
      });
      formData.append("lat", location.lat.toString());
      formData.append("lng", location.lng.toString());
      if (mobile) {
        formData.append("mobile", mobile);
      }

      const response = await axios.post("http://localhost:8000/complain", formData, {
        headers: { "Content-Type": "multipart/form-data" },
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      router.push(`/status/${searchId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f2]">
      <main className="min-h-screen text-slate-800 p-4 sm:p-6 flex flex-col max-w-md mx-auto">
        
        <header className="flex justify-center py-2">
          <h1 className="text-2xl font-extrabold text-[#1b4332] tracking-tight">CivicFix</h1>
        </header>

        {/* Top Toggle Navigation */}
        <div className="flex bg-[#e8e9e4] p-1.5 rounded-2xl mb-8 mt-4">
          <button 
            onClick={() => setActiveTab("new")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${activeTab === "new" ? "bg-white shadow-sm text-[#1b4332]" : "text-slate-500 hover:text-slate-700"}`}
          >
            New report
          </button>
          <button 
            onClick={() => setActiveTab("status")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${activeTab === "status" ? "bg-white shadow-sm text-[#1b4332]" : "text-slate-500 hover:text-slate-700"}`}
          >
            Report status
          </button>
        </div>

        {activeTab === "new" ? (
          <div className="flex-1 flex flex-col">
            
            {/* Photo Upload Section */}
            <div className="mb-8">
              <div 
                className="relative group cursor-pointer border-[1.5px] border-dashed border-slate-300 rounded-3xl bg-white hover:bg-slate-50 transition-all flex flex-col items-center justify-center p-8 shadow-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-[#e4ede5] rounded-full flex items-center justify-center mb-4">
                    <Camera className="w-6 h-6 text-[#1b4332]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {previews.length > 0 ? "Add more photos" : "Tap to photograph"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-[250px]">
                    {previews.length > 0 ? `${previews.length} of 5 photos added` : "Select up to 5 clear photos of the issue"}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </div>

              {/* Horizontal Minimized Previews */}
              {previews.length > 0 && (
                <div className="flex gap-3 overflow-x-auto mt-4 pb-2 snap-x scrollbar-hide">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm snap-start group">
                       <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                       <button
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           removeImage(idx);
                         }}
                         className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors"
                         title="Remove photo"
                       >
                         &times;
                       </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location Section */}
            <div className="mb-6">
              <h4 className="text-[13px] font-bold text-slate-600 mb-2 px-1">Where is this happening?</h4>
              <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center shadow-sm">
                <div className="w-12 h-12 bg-[#e4ede5] rounded-xl flex items-center justify-center mr-4 shrink-0">
                  {isLocating ? <Loader2 className="w-5 h-5 text-[#1b4332] animate-spin" /> : <MapPin className="w-6 h-6 text-[#1b4332]" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-[15px]">
                    {isLocating ? "Locating..." : locationName || "Unknown Area"}
                  </h3>
                  {isLocating ? (
                    <p className="text-xs text-slate-500 mt-0.5">Acquiring GPS...</p>
                  ) : location ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </p>
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
                disabled={isSubmitting || images.length === 0 || !location}
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
        ) : (
          <div className="flex-1 flex flex-col pt-8">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Check Report Status</h2>
            <p className="text-slate-500 mb-8 text-sm">Enter your Complaint ID to track the resolution progress.</p>
            
            <form onSubmit={handleSearch} className="mb-6">
              <div className="bg-white border border-slate-200 rounded-2xl flex items-center overflow-hidden shadow-sm mb-6">
                <div className="pl-4 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="flex-1 py-4 px-3 outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium" 
                  placeholder="e.g. CMP-12345" 
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#1b4332] hover:bg-[#133023] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                Track Report <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
