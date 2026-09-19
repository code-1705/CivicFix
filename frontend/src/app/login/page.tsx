"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";
import { ShieldCheck, Lock, Hash, Loader2, AlertCircle, Eye, EyeOff, MapPin, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [wardNo, setWardNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        wardNo,
        password,
      });

      if (response.data.access_token) {
        localStorage.setItem("officer_token", response.data.access_token);
        localStorage.setItem("officer_ward", response.data.wardNo);
        router.push(`/ward/${response.data.wardNo}`);
        // Keep loading state until navigation completes
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f2] flex flex-col md:flex-row">

      {/* ── Left: Brand Panel (desktop only) ── */}
      <div className="hidden md:flex md:w-1/2 bg-[#1b4332] flex-col justify-between p-10 lg:p-16">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-extrabold text-xl tracking-tight">CivicFix</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight">
            Ward Officer<br />Portal
          </h1>
          <p className="text-[#a7c4b0] text-lg mt-4 leading-relaxed">
            Manage civic complaints for your ward. Verify, triage, and resolve issues reported by citizens.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: CheckCircle2, text: "AI-triaged complaints, priority-sorted" },
            { icon: MapPin, text: "GPS geofence-verified resolutions" },
            { icon: ShieldCheck, text: "Ward-scoped, secure officer access" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-[#a7c4b0]">
              <Icon className="w-5 h-5 text-[#52a676] shrink-0" />
              <span className="text-sm font-medium">{text}</span>
            </div>
          ))}

          {/* Demo Credentials Hint */}
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">Demo Access</p>
            <div className="space-y-1">
              <p className="text-sm font-mono text-white/70">Ward: <span className="text-white font-bold">151</span></p>
              <p className="text-sm font-mono text-white/70">Password: <span className="text-white font-bold">admin123</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <div className="w-9 h-9 bg-[#1b4332] rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg text-[#1b4332] tracking-tight">CivicFix</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-800">Sign in</h2>
            <p className="text-slate-500 text-sm mt-1">Access your ward dashboard</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            {/* Ward Number */}
            <div>
              <label className="block text-[13px] font-bold text-slate-600 mb-2">
                Ward Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Hash className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={wardNo}
                  onChange={(e) => setWardNo(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/25 focus:border-[#1b4332] transition-all placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="e.g. 151"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-bold text-slate-600 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3.5 border border-slate-200 rounded-2xl bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/25 focus:border-[#1b4332] transition-all placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !wardNo.trim() || !password.trim()}
              className="w-full mt-2 bg-[#1b4332] hover:bg-[#133023] active:scale-[0.98] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In Securely"
              )}
            </button>
          </form>

          {/* Mobile demo hint */}
          <div className="mt-6 md:hidden bg-slate-100 border border-slate-200 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Demo Access</p>
            <p className="text-xs text-slate-600">Ward <span className="font-bold text-slate-800">151</span> · Password <span className="font-bold text-slate-800">admin123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
