"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { 
  CheckCircle2, 
  Clock, 
  BrainCircuit, 
  MapPin, 
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface StatusData {
  complaint: any;
  master_ticket: any;
}

export default function StatusPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/status/${params.id}`);
        setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6f2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1b4332]"></div>
      </div>
    );
  }

  if (!data || !data.complaint) {
    return (
      <div className="min-h-screen bg-[#f5f6f2] text-slate-800 flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Complaint Not Found</h1>
        <p className="text-slate-500 mt-2 text-center mb-6">The ID {params.id} doesn't exist.</p>
        <button onClick={() => router.push("/")} className="bg-[#1b4332] text-white px-6 py-3 rounded-xl font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const { complaint, master_ticket } = data;
  const isTriaged = complaint.status === "triaged";
  const isResolved = master_ticket?.status === "resolved";

  return (
    <div className="min-h-screen bg-[#f5f6f2]">
      <main className="text-slate-800 p-4 sm:p-6 flex flex-col max-w-md mx-auto">
        <header className="mb-6 mt-4">
          <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-700 mb-4 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Home
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1b4332]">Report Status</h1>
          <p className="text-sm text-slate-500 font-mono mt-1 px-1 tracking-tight">ID: {params.id}</p>
        </header>

        <div className="space-y-4">
          {/* Main Status Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-4 rounded-2xl ${isResolved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {isResolved ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {isResolved ? "Resolved" : isTriaged ? "In Progress" : "Pending AI Review"}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isResolved ? "The issue has been fixed." : "The city is working on it."}
                </p>
              </div>
            </div>

            {/* Community Impact Cluster Box */}
            {master_ticket && master_ticket.impact_count > 1 && (
              <div className="mt-6 bg-[#e4ede5] border-l-4 border-[#1b4332] rounded-r-xl p-4 flex items-start gap-3">
                <Users className="w-5 h-5 text-[#1b4332] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-[#1b4332]">Community Impact</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {master_ticket.impact_count - 1} other citizens reported this nearby. We merged them to prioritize the fix!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Explainability Drawer */}
          {isTriaged && (
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
              <button 
                onClick={() => setShowAI(!showAI)}
                className="w-full flex items-center justify-between p-6 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 rounded-xl">
                    <BrainCircuit className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-bold text-slate-800">AI Analysis</span>
                </div>
                {showAI ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              
              <AnimatePresence>
                {showAI && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6 text-sm text-slate-600 space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 mb-1">Department</span>
                        <span className="font-bold text-purple-700">{complaint.department}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 mb-1">Confidence</span>
                        <span className="font-bold text-[#1b4332]">{(complaint.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="block text-xs font-bold text-slate-400 mb-1">Reasoning</span>
                      <p className="text-slate-600 text-[13px] leading-relaxed">"{complaint.reasoning}"</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Location Info */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-[#e4ede5] rounded-xl">
              <MapPin className="w-5 h-5 text-[#1b4332]" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Ward {complaint.ward}</p>
              <p className="text-slate-500 text-xs mt-0.5">Coords: {Number(complaint.lat).toFixed(4)}, {Number(complaint.lng).toFixed(4)}</p>
            </div>
          </div>

          {/* Photo Gallery Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 text-[15px]">Evidence Gallery</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Before (Reported)</span>
                <div className="w-full h-36 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                  {/* Using an Unsplash placeholder for the hackathon demo since we didn't wire up S3 yet */}
                  <img src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400" alt="Before" className="w-full h-full object-cover" />
                </div>
              </div>
              
              {isResolved ? (
                <div>
                  <span className="block text-[11px] font-bold text-emerald-600 mb-2 uppercase tracking-wider">After (Resolved)</span>
                  <div className="w-full h-36 bg-slate-100 rounded-2xl overflow-hidden border-2 border-emerald-400 relative shadow-inner">
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 z-10 shadow-md">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    {/* Placeholder for resolved image */}
                    <img src="https://images.unsplash.com/photo-1584464457692-04e38e6f1406?auto=format&fit=crop&q=80&w=400" alt="After" className="w-full h-full object-cover" />
                  </div>
                </div>
              ) : (
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">After (Pending)</span>
                  <div className="w-full h-36 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center shadow-inner">
                    <p className="text-xs text-slate-400 font-bold text-center px-4 leading-relaxed">Waiting for<br/>ward officer</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
