"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  LogOut,
  Camera,
  Users,
  Navigation,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  ArrowRightLeft,
  X,
  Building2,
  Send,
  Loader2
} from "lucide-react";
import clsx from "clsx";
import { API_BASE_URL, getFullImageUrl } from "@/lib/api";

interface RelayRecord {
  from_department: string;
  to_department: string;
  relayed_by: string;
  relayed_at: string;
  notes?: string;
}

interface Ticket {
  master_ticket_id: string;
  category: string;
  assigned_department?: string;
  status: string;
  severity: string;
  impact_count: number;
  lat: number;
  lng: number;
  sla_deadline: string;
  resolved_at?: string;
  resolved_image_url?: string;
  resolved_image_urls?: string[];
  complaint_ids: string[];
  coupled_images?: string[];
  relay_history?: RelayRecord[];
}

type FilterType = "all" | "open" | "breach" | "resolved";

const MUNICIPAL_DEPARTMENTS = [
  "Roads & Infrastructure",
  "Solid Waste Management",
  "BESCOM Electrical",
  "BWSSB Water & Drainage",
  "Traffic & Signage",
  "Health & Sanitation"
];

export default function OfficerDashboard() {
  const params = useParams();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  // Filters & Search
  const [filter, setFilter] = useState<FilterType>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Relay Modal State
  const [relayModalOpen, setRelayModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [targetDept, setTargetDept] = useState(MUNICIPAL_DEPARTMENTS[0]);
  const [relayNotes, setRelayNotes] = useState("");
  const [relaying, setRelaying] = useState(false);
  const [relaySuccessMsg, setRelaySuccessMsg] = useState<string | null>(null);

  const fetchTickets = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const token = localStorage.getItem("officer_token");
      if (!token) { router.push("/login"); return; }

      const response = await axios.get(`${API_BASE_URL}/ward_complain/${params.wardNo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sorted = response.data.sort((a: Ticket, b: Ticket) => {
        if (a.status === "resolved" && b.status !== "resolved") return 1;
        if (a.status !== "resolved" && b.status === "resolved") return -1;
        const aBreached = new Date(a.sla_deadline).getTime() < Date.now();
        const bBreached = new Date(b.sla_deadline).getTime() < Date.now();
        if (aBreached && !bBreached) return -1;
        if (!aBreached && bBreached) return 1;
        return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
      });

      setTickets(sorted);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("officer_token");
        router.push("/login");
      }
      setError("Failed to fetch tickets.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.wardNo, router]);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(() => fetchTickets(true), 30000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const now = Date.now();
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);

  const openCount = tickets.filter(t => t.status !== "resolved").length;
  const breachCount = tickets.filter(t => t.status !== "resolved" && new Date(t.sla_deadline).getTime() < now).length;
  const resolvedTodayCount = tickets.filter(t =>
    t.status === "resolved" && new Date(t.resolved_at || 0) >= todayMidnight
  ).length;

  const filtered = tickets.filter(t => {
    // Status filter
    if (filter === "open" && t.status === "resolved") return false;
    if (filter === "breach" && (t.status === "resolved" || new Date(t.sla_deadline).getTime() >= now)) return false;
    if (filter === "resolved" && t.status !== "resolved") return false;

    // Department filter
    if (deptFilter !== "all") {
      const activeDept = t.assigned_department || t.category;
      if (!activeDept.toLowerCase().includes(deptFilter.toLowerCase())) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = t.master_ticket_id.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      const matchDept = (t.assigned_department || "").toLowerCase().includes(q);
      const matchComp = t.complaint_ids.some(cid => cid.toLowerCase().includes(q));
      if (!matchId && !matchCat && !matchDept && !matchComp) return false;
    }

    return true;
  });

  const handleLogout = () => {
    localStorage.removeItem("officer_token");
    localStorage.removeItem("officer_ward");
    router.push("/login");
  };

  const openRelayModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTargetDept(MUNICIPAL_DEPARTMENTS[0]);
    setRelayNotes("");
    setRelaySuccessMsg(null);
    setRelayModalOpen(true);
  };

  const handleRelaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const token = localStorage.getItem("officer_token");
    if (!token) {
      router.push("/login");
      return;
    }

    setRelaying(true);
    try {
      const formData = new FormData();
      formData.append("to_department", targetDept);
      if (relayNotes) formData.append("notes", relayNotes);

      const response = await axios.post(
        `${API_BASE_URL}/tickets/${selectedTicket.master_ticket_id}/relay`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update in local tickets list
      setTickets(prev => prev.map(t => {
        if (t.master_ticket_id === selectedTicket.master_ticket_id) {
          return {
            ...t,
            assigned_department: response.data.assigned_department,
            relay_history: response.data.relay_history
          };
        }
        return t;
      }));

      setRelaySuccessMsg(`Successfully relayed to ${targetDept}!`);
      setTimeout(() => {
        setRelayModalOpen(false);
        setRelaySuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to relay ticket.");
    } finally {
      setRelaying(false);
    }
  };

  const formatSLA = (deadline: string) =>
    new Date(deadline).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const getSeverityLabel = (s: string) =>
    s === "high" ? "High" : s === "medium" ? "Medium" : "Low";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6f2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1b4332]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f2]">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Header ── */}
        <header className="flex items-center justify-between mb-6 bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1b4332]" />
              Ward <span className="text-[#1b4332]">{params.wardNo}</span> Officer Portal
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {lastRefreshed
                ? `Live sync ${lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/explore")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-xs transition-colors"
            >
              National Map
            </button>
            <button
              onClick={() => fetchTickets(true)}
              disabled={refreshing}
              title="Refresh"
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#e4ede5] hover:bg-[#d0ded2] rounded-xl text-[#1b4332] font-bold text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Active Tickets", value: openCount, color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
            { label: "SLA Breaches", value: breachCount, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
            { label: "Resolved Today", value: resolvedTodayCount, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
              <div className={`p-2 ${bg} rounded-xl shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">{label}</p>
                <p className="text-2xl font-black text-slate-800">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 font-medium flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Search & Filter Controls ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-5 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Ticket ID (e.g. MT-A175F5), Department, or Issue type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20 focus:border-[#1b4332]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Department Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Dept:</span>
            {["all", "Roads", "Waste", "Electrical", "Water"].map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors",
                  deptFilter === d
                    ? "bg-[#1b4332] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {d === "all" ? "All Departments" : d}
              </button>
            ))}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
            {([
              { key: "all", label: "All Status", count: tickets.length },
              { key: "open", label: "Open", count: openCount },
              { key: "breach", label: "SLA Breached", count: breachCount },
              { key: "resolved", label: "Resolved", count: tickets.length - openCount },
            ] as { key: FilterType; label: string; count: number }[]).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={clsx(
                  "text-xs font-bold px-3 py-1.5 rounded-xl transition-all",
                  filter === key
                    ? "bg-[#e4ede5] text-[#1b4332]"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                {label}
                <span className={clsx(
                  "ml-1.5 text-[10px] font-black rounded-full px-1.5 py-0.5",
                  filter === key ? "bg-[#1b4332] text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Empty State ── */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <div className="w-14 h-14 bg-[#e4ede5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-[#1b4332]" />
            </div>
            <p className="font-bold text-slate-800">No tickets found</p>
            <p className="text-slate-500 text-sm mt-1">Try clearing your search query or department filter.</p>
          </div>
        )}

        {/* ── Ticket List ── */}
        <div className="space-y-3">
          {filtered.map(ticket => {
            const isResolved = ticket.status === "resolved";
            const isBreached = !isResolved && new Date(ticket.sla_deadline).getTime() < now;
            const isExpanded = expandedId === ticket.master_ticket_id;
            const currentDept = ticket.assigned_department || ticket.category || "Municipal Works";

            const borderColor = isResolved
              ? "border-l-emerald-400"
              : isBreached
              ? "border-l-red-500"
              : ticket.severity === "high"
              ? "border-l-amber-500"
              : "border-l-slate-200";

            return (
              <div
                key={ticket.master_ticket_id}
                className={clsx(
                  "bg-white rounded-2xl border border-slate-200 border-l-4 shadow-sm overflow-hidden transition-shadow hover:shadow-md",
                  borderColor,
                  isBreached && "ring-1 ring-red-100"
                )}
              >
                {/* ── Card Header ── */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Category & Status badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-extrabold text-slate-800 text-[15px]">{ticket.category}</span>
                        <span className={clsx(
                          "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full",
                          isResolved
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isBreached
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        )}>
                          {isResolved ? "Resolved" : isBreached ? "SLA Breached" : "Open"}
                        </span>
                        <span className={clsx(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          ticket.severity === "high"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        )}>
                          {getSeverityLabel(ticket.severity)}
                        </span>
                        {/* Assigned Department Badge */}
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-[#1b4332]" />
                          {currentDept}
                        </span>
                      </div>

                      {/* Ticket ID & Relay Audit Trail */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-xs font-bold text-slate-500">{ticket.master_ticket_id}</p>
                        {ticket.relay_history && ticket.relay_history.length > 0 && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            Relayed ({ticket.relay_history[ticket.relay_history.length - 1].from_department} → {ticket.relay_history[ticket.relay_history.length - 1].to_department})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isResolved && (
                        <>
                          <button
                            onClick={() => openRelayModal(ticket)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center gap-1 border border-slate-200"
                            title="Relay / Transfer to another department"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                            <span className="hidden md:inline">Relay</span>
                          </button>

                          <button
                            onClick={() => router.push(`/ward/${params.wardNo}/resolve/${ticket.master_ticket_id}`)}
                            className="bg-[#1b4332] hover:bg-[#133023] active:scale-95 text-white font-bold py-2 px-3 sm:px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Resolve</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : ticket.master_ticket_id)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Info row: SLA + impact + location */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className={clsx("w-3.5 h-3.5 shrink-0", isResolved ? "text-slate-300" : isBreached ? "text-red-500" : "text-amber-500")} />
                      <span className={clsx(
                        "text-xs font-semibold",
                        isResolved ? "text-slate-400 line-through" : isBreached ? "text-red-600" : "text-amber-700"
                      )}>
                        {formatSLA(ticket.sla_deadline)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-600">{ticket.impact_count} citizen{ticket.impact_count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500">{ticket.lat.toFixed(4)}, {ticket.lng.toFixed(4)}</span>
                      <a
                        href={`https://www.google.com/maps?q=${ticket.lat},${ticket.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-bold text-[#1b4332] hover:underline"
                      >
                        <Navigation className="w-3 h-3" />
                        Map
                      </a>
                    </div>
                  </div>
                </div>

                {/* ── Expandable Detail: Citizen Photos & Relay Timeline ── */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 pt-3 space-y-4">
                    {/* Citizen Photos */}
                    {ticket.coupled_images && ticket.coupled_images.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Citizen Photos ({ticket.coupled_images.length})
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
                                className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={fullUrl}
                                  alt={`Photo ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No citizen photos attached</p>
                    )}

                    {/* Official Resolution Proof Photos */}
                    {ticket.status === "resolved" && ((ticket.resolved_image_urls && ticket.resolved_image_urls.length > 0) || ticket.resolved_image_url) && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Official Resolution Proof (After)
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {(ticket.resolved_image_urls && ticket.resolved_image_urls.length > 0
                            ? ticket.resolved_image_urls
                            : [ticket.resolved_image_url]
                          ).filter(Boolean).map((imgUrl, rIdx) => {
                            const fullProofUrl = getFullImageUrl(imgUrl);
                            return (
                              <a
                                key={rIdx}
                                href={fullProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border-2 border-emerald-400/60 shadow-sm hover:opacity-85 transition-opacity"
                              >
                                <img
                                  src={fullProofUrl}
                                  alt={`Resolution Proof ${rIdx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Relay Audit History */}
                    {ticket.relay_history && ticket.relay_history.length > 0 && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3 text-[#1b4332]" />
                          Department Relay Log
                        </p>
                        <div className="space-y-1.5">
                          {ticket.relay_history.map((r, rIdx) => (
                            <div key={rIdx} className="text-xs text-slate-600 flex flex-wrap items-baseline gap-2">
                              <span className="font-bold text-slate-800">{r.from_department} → {r.to_department}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(r.relayed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {r.notes && <span className="text-[11px] text-slate-500 italic">"{r.notes}"</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Relay Ticket Modal ── */}
      {relayModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#e4ede5] rounded-xl text-[#1b4332]">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800">Relay Ticket</h3>
                  <p className="text-xs font-mono text-slate-400">{selectedTicket.master_ticket_id}</p>
                </div>
              </div>
              <button
                onClick={() => setRelayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {relaySuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {relaySuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleRelaySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Forward To Department
                  </label>
                  <select
                    value={targetDept}
                    onChange={(e) => setTargetDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20 focus:border-[#1b4332]"
                  >
                    {MUNICIPAL_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Handover Notes / Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Under road surface there is an active BWSSB pipeline leakage requiring water board excavation crew before asphalt repaving."
                    value={relayNotes}
                    onChange={(e) => setRelayNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20 focus:border-[#1b4332]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRelayModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={relaying}
                    className="flex-1 py-2.5 bg-[#1b4332] hover:bg-[#133023] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {relaying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Confirm Relay
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
