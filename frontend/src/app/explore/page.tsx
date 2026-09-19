"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import Link from "next/link";
import {
  MapPin,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Map as MapIcon,
  Grid,
  ShieldCheck,
  Building2,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Plus
} from "lucide-react";
import clsx from "clsx";
import { API_BASE_URL, getFullImageUrl } from "@/lib/api";

// Dynamically import NationalMap without SSR to avoid Leaflet window errors
const NationalMap = dynamic(() => import("@/components/NationalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] sm:h-[480px] lg:h-[560px] rounded-3xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-semibold text-sm">
      Loading National Geospatial Map...
    </div>
  ),
});

interface PublicTicket {
  master_ticket_id: string;
  category: string;
  assigned_department?: string;
  severity: string;
  status: string;
  ward: string;
  city: string;
  lat: number;
  lng: number;
  created_at: string;
  resolved_at?: string;
  resolved_image_url?: string;
  resolved_image_urls?: string[];
  complaint_ids: string[];
  coupled_images?: string[];
  impact_count: number;
}

interface PublicStats {
  total_issues: number;
  resolved_issues: number;
  active_issues: number;
  avg_resolution_hours: number;
}

const CITIES = ["All India", "Bengaluru", "Delhi NCR", "Mumbai", "Hyderabad", "Pune"];
const DEPARTMENTS = ["All Departments", "Roads", "Waste", "Water", "Electrical"];

export default function ExplorePage() {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [tickets, setTickets] = useState<PublicTicket[]>([]);
  const [mapPins, setMapPins] = useState<any[]>([]);
  const [stats, setStats] = useState<PublicStats>({
    total_issues: 1420,
    resolved_issues: 1184,
    active_issues: 236,
    avg_resolution_hours: 4.2,
  });

  // Query state
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("All India");
  const [dept, setDept] = useState("All Departments");
  const [status, setStatus] = useState<"all" | "open" | "resolved">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch paginated tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 9 };
      if (search.trim()) params.search = search.trim();
      if (city !== "All India") params.city = city;
      if (dept !== "All Departments") params.department = dept;
      if (status !== "all") params.status = status;

      const res = await axios.get(`${API_BASE_URL}/public/tickets`, { params });
      setTickets(res.data.items || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalCount(res.data.total || 0);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to load public tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, city, dept, status]);

  // Fetch lightweight map pins
  const fetchPins = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/public/map_pins`);
      setMapPins(res.data.pins || []);
    } catch (err) {
      console.error("Failed to load map pins:", err);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  return (
    <div className="min-h-screen bg-[#f5f6f2] text-slate-800">
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#1b4332] text-white flex items-center justify-center font-black text-base shadow-sm">
              CF
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                Civic<span className="text-[#1b4332]">Fix</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold bg-[#e4ede5] text-[#1b4332] px-2 py-0.5 rounded-full uppercase">
                National Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#1b4332] hover:bg-[#133023] text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Officer Login</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* ── Hero / KPI Summary Bar ── */}
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Live Transparency Feed • India
                </p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Public Civic Resolution Explorer
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                Every civic issue across Indian wards tracked with verified GPS coordinates and AI vision anti-fraud proof.
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start md:self-auto shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  viewMode === "grid"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Grid className="w-4 h-4" />
                <span>Card Feed</span>
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  viewMode === "map"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <MapIcon className="w-4 h-4" />
                <span>National Map</span>
              </button>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Reports</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{stats.total_issues.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-1">Across 198 municipal wards</p>
            </div>
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80">
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Verified Fixed</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-0.5">{stats.resolved_issues.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-700/80 mt-1">AI verified repair proof</p>
            </div>
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Active In Progress</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-800 mt-0.5">{stats.active_issues.toLocaleString()}</p>
              <p className="text-[11px] text-amber-700/80 mt-1">SLA countdown active</p>
            </div>
            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80">
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Avg Fix Speed</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-800 mt-0.5">{stats.avg_resolution_hours} hrs</p>
              <p className="text-[11px] text-blue-700/80 mt-1">Zero human dispatcher delay</p>
            </div>
          </div>
        </section>

        {/* ── Search & Filter Controls ── */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ticket ID, pothole, street, or ward..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20 focus:border-[#1b4332]"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={city}
                onChange={(e) => { setCity(e.target.value); setPage(1); }}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-[#1b4332]"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#133023] text-white font-bold text-xs rounded-2xl transition-all shadow-sm shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Department & Status Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Department pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Dept:</span>
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  onClick={() => { setDept(d); setPage(1); }}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors",
                    dept === d
                      ? "bg-[#1b4332] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-xl">
              {(["all", "open", "resolved"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all",
                    status === s
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {s === "all" ? "All" : s === "open" ? "Active" : "Resolved"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Main View Content ── */}
        {viewMode === "map" ? (
          /* Map View */
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-slate-500">
                Displaying <span className="text-slate-800 font-extrabold">{mapPins.length}</span> geo-verified pins across India.
              </p>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Resolved
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Active
                </span>
              </div>
            </div>
            <NationalMap pins={mapPins} />
          </section>
        ) : (
          /* Grid Card Feed View */
          <section className="space-y-6">
            {loading ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1b4332] mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-400">Querying nationwide tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <div className="w-14 h-14 bg-[#e4ede5] rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#1b4332]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <p className="font-extrabold text-slate-800">No issues found</p>
                <p className="text-xs text-slate-400 mt-1">Try relaxing filters or search terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tickets.map((t) => {
                  const isResolved = t.status === "resolved";
                  const primaryImg =
                    t.resolved_image_url ||
                    (t.coupled_images && t.coupled_images[0]);
                  const fullImgUrl = primaryImg ? getFullImageUrl(primaryImg) : null;
                  const trackId = t.complaint_ids && t.complaint_ids[0];

                  return (
                    <div
                      key={t.master_ticket_id}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* Image Preview */}
                        <div className="relative h-48 bg-slate-100 overflow-hidden border-b border-slate-100">
                          {fullImgUrl ? (
                            <img
                              src={fullImgUrl}
                              alt={t.category}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs">
                              No Photo Available
                            </div>
                          )}

                          {/* Status Badge */}
                          <div className="absolute top-3 left-3">
                            <span
                              className={clsx(
                                "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md",
                                isResolved
                                  ? "bg-emerald-500/90 text-white"
                                  : "bg-red-500/90 text-white"
                              )}
                            >
                              {isResolved ? "Verified Fixed" : "Active Issue"}
                            </span>
                          </div>

                          {/* Ward & City Pill */}
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
                            Ward {t.ward} • {t.city || "Bengaluru"}
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-extrabold text-base text-slate-900 truncate">
                              {t.category}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {t.severity}
                            </span>
                          </div>

                          <p className="font-mono text-xs font-bold text-slate-400 mb-3">
                            {t.master_ticket_id}
                          </p>

                          <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#1b4332] shrink-0" />
                              <span className="font-medium truncate">{t.assigned_department || t.category}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-500 truncate">
                                GPS: {t.lat?.toFixed(4)}, {t.lng?.toFixed(4)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {t.impact_count || 1} citizen report{(t.impact_count || 1) !== 1 ? "s" : ""}
                        </span>

                        {trackId && (
                          <Link
                            href={`/status/${trackId}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#1b4332] hover:underline"
                          >
                            <span>Live Audit</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Pagination Controls ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200">
                <p className="text-xs font-medium text-slate-500">
                  Showing page <span className="font-bold text-slate-800">{page}</span> of{" "}
                  <span className="font-bold text-slate-800">{totalPages}</span> ({totalCount} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
