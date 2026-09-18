"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ShieldCheck, Lock, Map, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [wardNo, setWardNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:8000/login", {
        wardNo,
        password
      });

      if (response.data.access_token) {
        // For hackathon, store in localStorage (in prod use secure cookies)
        localStorage.setItem("officer_token", response.data.access_token);
        localStorage.setItem("officer_ward", response.data.wardNo);
        router.push(`/ward/${response.data.wardNo}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-md bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 border border-blue-500/30">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Officer Portal</h1>
          <p className="text-sm text-slate-400 mt-1">Authorized personnel only</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Ward Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Map className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                value={wardNo}
                onChange={(e) => setWardNo(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. 151"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !wardNo || !password}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
