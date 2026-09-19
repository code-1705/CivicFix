"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { API_BASE_URL, getFullImageUrl } from "@/lib/api";
import { 
  CheckCircle2, 
  Clock, 
  BrainCircuit, 
  MapPin, 
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  XCircle,
  Copy,
  Share2
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
  const [showAI, setShowAI] = useState(true);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleCopyId = () => {
    navigator.clipboard.writeText(String(params.id)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `CivicFix Complaint ${params.id}`, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/status/${params.id}`);
        const result: StatusData = response.data;
        setData(result);
        // Stop polling once terminal state is reached
        const c = result?.complaint;
        const mt = result?.master_ticket;
        const isTerminal =
          c?.status === "resolved" ||
          c?.status === "closed" ||
          mt?.status === "resolved";
        if (isTerminal && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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
  const isRejected = complaint.status === "closed" || complaint.triage_status === "rejected";
  const isTriaged = complaint.status === "triaged";
  const isResolved = master_ticket?.status === "resolved" || complaint.status === "resolved";

  // Only the images uploaded by THIS citizen for THIS complaint_id
  const beforePhotos: string[] = (
    complaint.image_urls && complaint.image_urls.length > 0 
      ? complaint.image_urls 
      : complaint.image_url 
      ? [complaint.image_url] 
      : []
  ).map((url: string) => getFullImageUrl(url));

  // All images uploaded by the officer to resolve the master ticket
  const rawResolvedList: string[] = 
    complaint.resolved_image_urls && complaint.resolved_image_urls.length > 0
      ? complaint.resolved_image_urls
      : master_ticket?.resolved_image_urls && master_ticket.resolved_image_urls.length > 0
      ? master_ticket.resolved_image_urls
      : complaint.resolved_image_url
      ? [complaint.resolved_image_url]
      : master_ticket?.resolved_image_url
      ? [master_ticket.resolved_image_url]
      : [];

  const afterPhotos: string[] = rawResolvedList.map((url: string) => getFullImageUrl(url));

  return (
    <div className="min-h-screen bg-[#f5f6f2]">
      <main className="text-slate-800 p-4 sm:p-6 flex flex-col max-w-md mx-auto">
        <header className="mb-6 mt-4">
          <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-700 mb-4 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Home
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1b4332]">Report Status</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-500 font-mono tracking-tight">ID: <span className="font-bold text-slate-700">{params.id}</span></p>
            <button
              onClick={handleCopyId}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
              title="Copy complaint ID"
              aria-label="Copy complaint ID"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
              title="Share report"
              aria-label="Share report"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        <div className="space-y-4">
          {/* Main Status Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-4 rounded-2xl ${
                isRejected 
                  ? 'bg-rose-50 text-rose-600' 
                  : isResolved 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'bg-amber-50 text-amber-600'
              }`}>
                {isRejected ? (
                  <XCircle className="w-8 h-8" />
                ) : isResolved ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <Clock className="w-8 h-8" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {isRejected ? "Report Closed" : isResolved ? "Resolved" : isTriaged ? "In Progress" : "Pending AI Review"}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isRejected 
                    ? "Not identified as a civic issue" 
                    : isResolved 
                      ? "The issue has been fixed." 
                      : "The city is working on it."}
                </p>
              </div>
            </div>

            {/* Rejection notice if not a real civic issue */}
            {isRejected && (
              <div className="mt-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl p-4">
                <p className="text-[13px] font-bold text-rose-800">AI Verification Result</p>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  {complaint.rejection_reason || complaint.reasoning || "The submitted image does not appear to contain a municipal infrastructure or public safety hazard."}
                </p>
              </div>
            )}

            {/* Community Impact Cluster Box */}
            {master_ticket && master_ticket.impact_count > 1 && !isRejected && (
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
          {complaint.status === "pending_triage" ? (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-amber-50 rounded-xl">
                  <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">AI Vision Analysis in Progress...</p>
                  <p className="text-xs text-slate-500 mt-0.5">Usually completes in under 60 seconds.</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">This page refreshes automatically. You can close it and check back later using your complaint ID.</p>
            </div>
          ) : (isTriaged || isRejected) && complaint.reasoning ? (
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
              <button 
                onClick={() => setShowAI(!showAI)}
                className="w-full flex items-center justify-between p-6 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isRejected ? 'bg-rose-50' : 'bg-purple-50'}`}>
                    <BrainCircuit className={`w-5 h-5 ${isRejected ? 'text-rose-600' : 'text-purple-600'}`} />
                  </div>
                  <span className="font-bold text-slate-800">AI Analysis & Vision Details</span>
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
                        <span className="block text-xs font-bold text-slate-400 mb-1">Status</span>
                        <span className={`font-bold ${isRejected ? 'text-rose-600' : 'text-purple-700'}`}>
                          {isRejected ? "Rejected" : complaint.department || "Public Works"}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 mb-1">Confidence</span>
                        <span className="font-bold text-[#1b4332]">{((complaint.confidence || 0.9) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    {complaint.description && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 mb-1">Visual Detection</span>
                        <p className="text-slate-700 text-[13px] leading-relaxed">{complaint.description}</p>
                      </div>
                    )}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="block text-xs font-bold text-slate-400 mb-1">AI Reasoning</span>
                      <p className="text-slate-600 text-[13px] leading-relaxed">"{complaint.reasoning}"</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}

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
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-[15px]">Evidence Gallery</h3>
            
            {/* Before Photos (Reported by Citizen) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Before (Reported by You - {beforePhotos.length})
                </span>
              </div>
              {beforePhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {beforePhotos.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-32 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group relative"
                      title="Click to view full image"
                    >
                      <img
                        src={url}
                        alt={`Before ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <span className="absolute bottom-1 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                        #{idx + 1}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="w-full h-28 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                  No image attached
                </div>
              )}
            </div>

            {/* After Photos (Resolved by Officer) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isResolved ? 'text-emerald-600' : isRejected ? 'text-rose-500' : 'text-slate-400'}`}>
                  {isResolved ? `After (Field Resolution - ${afterPhotos.length})` : isRejected ? "Status (Closed)" : "After (Pending Resolution)"}
                </span>
              </div>

              {isResolved ? (
                afterPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {afterPhotos.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-32 bg-slate-100 rounded-2xl overflow-hidden border-2 border-emerald-400 relative shadow-inner group"
                        title="Click to view proof"
                      >
                        <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 z-10 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <img
                          src={url}
                          alt={`Resolution Proof ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <span className="absolute bottom-1 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                          Proof #{idx + 1}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-28 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center text-xs text-emerald-700 font-medium">
                    Resolved by field team
                  </div>
                )
              ) : isRejected ? (
                <div className="w-full h-28 bg-rose-50/40 rounded-2xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center p-3 shadow-inner text-center">
                  <XCircle className="w-6 h-6 text-rose-400 mb-1" />
                  <p className="text-[11px] text-rose-600 font-bold leading-tight">Closed by AI Review</p>
                  <p className="text-[10px] text-slate-400 mt-1">No civic hazard detected</p>
                </div>
              ) : (
                <div className="w-full h-28 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center shadow-inner text-center p-3">
                  <Clock className="w-5 h-5 text-slate-400 mb-1" />
                  <p className="text-xs text-slate-400 font-bold leading-relaxed">Waiting for ward officer resolution proof</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
