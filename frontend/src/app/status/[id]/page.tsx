"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { 
  CheckCircle2, 
  Clock, 
  BrainCircuit, 
  MapPin, 
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StatusData {
  complaint: any;
  master_ticket: any;
}

export default function StatusPage() {
  const params = useParams();
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
    // Poll every 5 seconds for hackathon demo
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data || !data.complaint) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Complaint Not Found</h1>
          <p className="text-slate-400 mt-2">The ID {params.id} doesn't exist.</p>
        </div>
      </div>
    );
  }

  const { complaint, master_ticket } = data;
  
  // Status logic
  const isTriaged = complaint.status === "triaged";
  const isResolved = master_ticket?.status === "resolved";

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 p-6 flex flex-col max-w-md mx-auto">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold">Report Status</h1>
        <p className="text-sm text-slate-400 font-mono mt-1">ID: {params.id}</p>
      </header>

      <div className="space-y-4">
        {/* Main Status Card */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-full ${isResolved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {isResolved ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isResolved ? "Resolved" : isTriaged ? "In Progress" : "Pending AI Review"}
              </h2>
              <p className="text-sm text-slate-400">
                {isResolved ? "The issue has been fixed." : "The city is working on it."}
              </p>
            </div>
          </div>

          {/* Community Impact Cluster Box */}
          {master_ticket && master_ticket.impact_count > 1 && (
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-300">Community Impact</p>
                <p className="text-xs text-blue-200/70 mt-1">
                  {master_ticket.impact_count - 1} other citizens reported this nearby. We merged them to prioritize the fix!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Explainability Drawer */}
        {isTriaged && (
          <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
            <button 
              onClick={() => setShowAI(!showAI)}
              className="w-full flex items-center justify-between p-5 focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-slate-200">AI Analysis</span>
              </div>
              {showAI ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            <AnimatePresence>
              {showAI && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 pt-1 text-sm text-slate-300 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <span className="block text-xs text-slate-500 mb-1">Department</span>
                      <span className="font-medium text-purple-300">{complaint.department}</span>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <span className="block text-xs text-slate-500 mb-1">Confidence</span>
                      <span className="font-medium text-emerald-400">{(complaint.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <span className="block text-xs text-slate-500 mb-1">Reasoning</span>
                    <p className="italic text-slate-400">"{complaint.reasoning}"</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Location Info */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-slate-400" />
          <div className="text-sm">
            <p className="font-medium">Ward {complaint.ward}</p>
            <p className="text-slate-500 text-xs">Coordinates: {Number(complaint.lat).toFixed(4)}, {Number(complaint.lng).toFixed(4)}</p>
          </div>
        </div>

      </div>
    </main>
  );
}
