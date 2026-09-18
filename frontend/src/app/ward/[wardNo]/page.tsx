"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  LogOut,
  Camera,
  Map
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
  complaint_ids: string[];
}

export default function OfficerDashboard() {
  const params = useParams();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem("officer_token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await axios.get(`http://localhost:8000/ward_complain/${params.wardNo}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Sort tickets: Open first, then by SLA urgency
        const sorted = response.data.sort((a: Ticket, b: Ticket) => {
          if (a.status === "resolved" && b.status !== "resolved") return 1;
          if (a.status !== "resolved" && b.status === "resolved") return -1;
          return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
        });
        
        setTickets(sorted);
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("officer_token");
          router.push("/login");
        }
        setError("Failed to fetch tickets.");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [params.wardNo, router]);

  const openTicketsCount = tickets.filter(t => t.status !== "resolved").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;
  const breachCount = tickets.filter(t => t.status !== "resolved" && new Date(t.sla_deadline).getTime() < Date.now()).length;

  const handleLogout = () => {
    localStorage.removeItem("officer_token");
    localStorage.removeItem("officer_ward");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8 mt-2">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Ward {params.wardNo} Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage civic issues and SLAs</p>
        </div>
        <button 
          onClick={handleLogout}
          className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 text-slate-300 flex items-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex items-center gap-4 shadow-lg">
          <div className="p-4 bg-blue-500/20 rounded-full text-blue-400">
            <Map className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 font-medium">Open Tickets</p>
            <p className="text-3xl font-bold">{openTicketsCount}</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex items-center gap-4 shadow-lg">
          <div className="p-4 bg-red-500/20 rounded-full text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 font-medium">SLA Breached</p>
            <p className="text-3xl font-bold">{breachCount}</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex items-center gap-4 shadow-lg">
          <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 font-medium">Resolved Today</p>
            <p className="text-3xl font-bold">{resolvedCount}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 font-medium">
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-sm">
                <th className="p-4 font-medium">Ticket ID</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Impact</th>
                <th className="p-4 font-medium">SLA Deadline</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No tickets found for this ward.
                  </td>
                </tr>
              ) : (
                tickets.map(ticket => {
                  const isResolved = ticket.status === "resolved";
                  const isBreached = !isResolved && new Date(ticket.sla_deadline).getTime() < Date.now();
                  
                  return (
                    <tr key={ticket.master_ticket_id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 font-mono text-sm text-slate-300">{ticket.master_ticket_id}</td>
                      <td className="p-4">
                        <span className="font-medium">{ticket.category}</span>
                        <div className="flex items-center text-xs text-slate-500 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {ticket.lat.toFixed(4)}, {ticket.lng.toFixed(4)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center justify-center bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
                          {ticket.impact_count} citizens
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className={clsx("w-4 h-4", isResolved ? "text-slate-600" : isBreached ? "text-red-400" : "text-amber-400")} />
                          <span className={clsx(
                            "text-sm font-medium",
                            isResolved ? "text-slate-500 line-through" : isBreached ? "text-red-400" : "text-amber-400"
                          )}>
                            {new Date(ticket.sla_deadline).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full",
                          isResolved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        )}>
                          {isResolved ? "RESOLVED" : "OPEN"}
                        </span>
                      </td>
                      <td className="p-4">
                        {!isResolved && (
                          <button 
                            onClick={() => router.push(`/ward/${params.wardNo}/resolve/${ticket.master_ticket_id}`)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/50"
                          >
                            <Camera className="w-4 h-4" />
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
