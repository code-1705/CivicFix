"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { API_BASE_URL, getFullImageUrl } from "@/lib/api";
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
  Filter
} from "lucide-react";
import clsx from "clsx";

interface Ticket {
  master_ticket_id: string;
  category: string;
  status: string;
  severity: string;
  impact_count: number;
  lat: number;
  lng: number;
  sla_deadline: string;
  resolved_at?: string;
  complaint_ids: string[];
  coupled_images?: string[];
}

type FilterType = "all" | "open" | "breach" | "resolved";

export default function OfficerDashboard() {
  const params = useParams();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    if (filter === "open") return t.status !== "resolved";
    if (filter === "breach") return t.status !== "resolved" && new Date(t.sla_deadline).getTime() < now;
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  const handleLogout = () => {
    localStorage.removeItem("officer_token");
    localStorage.removeItem("officer_ward");
    router.push("/login");
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
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Ward <span className="text-[#1b4332]">{params.wardNo}</span> Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {lastRefreshed
                ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            { label: "Open", value: openCount, color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
            { label: "SLA Breach", value: breachCount, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
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

        {/* ── Filter Tabs ── */}
        <div className="flex items-center gap-1.5 mb-4 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
          <Filter className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
          {([
            { key: "all", label: "All", count: tickets.length },
            { key: "open", label: "Open", count: openCount },
            { key: "breach", label: "Breached", count: breachCount },
            { key: "resolved", label: "Resolved", count: tickets.length - openCount },
          ] as { key: FilterType; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                "text-xs font-bold px-3 py-1.5 rounded-xl transition-all",
                filter === key
                  ? "bg-[#1b4332] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              )}
            >
              {label}
              <span className={clsx(
                "ml-1.5 text-[10px] font-black rounded-full px-1.5 py-0.5",
                filter === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Empty State ── */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <div className="w-14 h-14 bg-[#e4ede5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-[#1b4332]" />
            </div>
            <p className="font-bold text-slate-800">All clear!</p>
            <p className="text-slate-500 text-sm mt-1">No tickets match this filter.</p>
          </div>
        )}

        {/* ── Ticket List (unified card layout for all breakpoints) ── */}
        <div className="space-y-3">
          {filtered.map(ticket => {
            const isResolved = ticket.status === "resolved";
            const isBreached = !isResolved && new Date(ticket.sla_deadline).getTime() < now;
            const isExpanded = expandedId === ticket.master_ticket_id;

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
                {/* ── Card Header (always visible) ── */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Top row: category + badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
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
                      </div>
                      {/* Ticket ID */}
                      <p className="font-mono text-xs text-slate-400">{ticket.master_ticket_id}</p>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isResolved && (
                        <button
                          onClick={() => router.push(`/ward/${params.wardNo}/resolve/${ticket.master_ticket_id}`)}
                          className="bg-[#1b4332] hover:bg-[#133023] active:scale-95 text-white font-bold py-2 px-3 sm:px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Resolve</span>
                        </button>
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

                {/* ── Expandable Detail: Citizen Photos ── */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 pt-3">
                    {ticket.coupled_images && ticket.coupled_images.length > 0 ? (
                      <>
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
                                <img src={fullUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No citizen photos attached.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
