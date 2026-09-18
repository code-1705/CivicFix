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
    <div className="min-h-screen bg-[#f5f6f2] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-[#e4ede5] rounded-3xl flex items-center justify-center mb-5">
            <ShieldCheck className="w-10 h-10 text-[#1b4332]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">Officer Portal</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Authorized personnel only</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-600 mb-2 px-1">Ward Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Map className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={wardNo}
                onChange={(e) => setWardNo(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20 focus:border-[#1b4332] transition-all"
                placeholder="e.g. 151"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-slate-600 mb-2 px-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20 focus:border-[#1b4332] transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !wardNo || !password}
            className="w-full mt-4 bg-[#1b4332] hover:bg-[#133023] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
