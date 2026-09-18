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
  Map,
  Users
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
      <div className="min-h-screen bg-[#f5f6f2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1b4332]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f2] p-4 sm:p-8">
      <main className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Ward {params.wardNo} Dashboard</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Civic Issue & SLA Management</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2.5 bg-[#e4ede5] hover:bg-[#d0ded2] rounded-xl transition-colors text-[#1b4332] flex items-center gap-2 font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Map className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Open Tickets</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{openTicketsCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-red-50 rounded-xl text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">SLA Breached</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{breachCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Resolved Today</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{resolvedCount}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 font-medium flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}

        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 font-medium border border-slate-200">
              No tickets found for this ward.
            </div>
          ) : (
            tickets.map(ticket => {
              const isResolved = ticket.status === "resolved";
              const isBreached = !isResolved && new Date(ticket.sla_deadline).getTime() < Date.now();
              
              return (
                <div key={ticket.master_ticket_id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-bold text-slate-800 text-lg">{ticket.category}</span>
                      <p className="font-mono text-xs font-semibold text-slate-500 mt-1">{ticket.master_ticket_id}</p>
                    </div>
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full",
                      isResolved ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                      : "bg-blue-50 text-blue-600 border border-blue-200"
                    )}>
                      {isResolved ? "RESOLVED" : "OPEN"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center text-sm text-slate-500">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                      {ticket.lat.toFixed(4)}, {ticket.lng.toFixed(4)}
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <Users className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                      <span className="font-bold text-[#1b4332]">{ticket.impact_count} citizens reported</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className={clsx("w-4 h-4 mr-2 shrink-0", isResolved ? "text-slate-400" : isBreached ? "text-red-500" : "text-amber-500")} />
                      <span className={clsx(
                        "font-bold",
                        isResolved ? "text-slate-400 line-through" : isBreached ? "text-red-600" : "text-amber-600"
                      )}>
                        {new Date(ticket.sla_deadline).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {!isResolved && (
                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => router.push(`/ward/${params.wardNo}/resolve/${ticket.master_ticket_id}`)}
                        className="w-full bg-[#1b4332] hover:bg-[#133023] text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Camera className="w-4 h-4" />
                        Resolve Ticket
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Data Table */}
        <div className="hidden md:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[13px] uppercase tracking-wider">
                  <th className="p-5 font-bold">Ticket ID</th>
                  <th className="p-5 font-bold">Category</th>
                  <th className="p-5 font-bold">Impact</th>
                  <th className="p-5 font-bold">SLA Deadline</th>
                  <th className="p-5 font-bold">Status</th>
                  <th className="p-5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                      No tickets found for this ward.
                    </td>
                  </tr>
                ) : (
                  tickets.map(ticket => {
                    const isResolved = ticket.status === "resolved";
                    const isBreached = !isResolved && new Date(ticket.sla_deadline).getTime() < Date.now();
                    
                    return (
                      <tr key={ticket.master_ticket_id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-5 font-mono text-sm font-semibold text-slate-600">{ticket.master_ticket_id}</td>
                        <td className="p-5">
                          <span className="font-bold text-slate-800">{ticket.category}</span>
                          <div className="flex items-center text-[13px] text-slate-500 mt-1">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            {ticket.lat.toFixed(4)}, {ticket.lng.toFixed(4)}
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="inline-flex items-center justify-center bg-[#e4ede5] text-[#1b4332] text-xs font-bold px-3 py-1.5 rounded-full">
                            {ticket.impact_count} citizens
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <Clock className={clsx("w-4 h-4", isResolved ? "text-slate-400" : isBreached ? "text-red-500" : "text-amber-500")} />
                            <span className={clsx(
                              "text-[13px] font-bold",
                              isResolved ? "text-slate-400 line-through" : isBreached ? "text-red-600" : "text-amber-600"
                            )}>
                              {new Date(ticket.sla_deadline).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={clsx(
                            "inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full",
                            isResolved ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                            : "bg-blue-50 text-blue-600 border border-blue-200"
                          )}>
                            {isResolved ? "RESOLVED" : "OPEN"}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          {!isResolved && (
                            <button 
                              onClick={() => router.push(`/ward/${params.wardNo}/resolve/${ticket.master_ticket_id}`)}
                              className="bg-[#1b4332] hover:bg-[#133023] text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors inline-flex items-center gap-2 shadow-sm"
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
    </div>
  );
}
