"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiUrl, saveTokens } from "@/lib/api";
import {
  Wallet,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sun,
  Moon,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const isCurrentlyDark = root.classList.contains("dark");
    const nextDark = !isCurrentlyDark;
    if (nextDark) {
      root.classList.add("dark");
      localStorage.setItem("cybank_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("cybank_theme", "light");
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", nextDark ? "#020617" : "#ffffff");
    }
    setIsDark(nextDark);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(apiUrl("/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        setIsSuccessRedirecting(true);

        saveTokens(data.access_token, data.refresh_token);
        if (data.user) {
          localStorage.setItem("cybank_user", JSON.stringify(data.user));
        }

        // Slight delay so user sees success notification and direct animation
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 700);
      } else {
        setErrorMessage(data.message || "Invalid email or password.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reach authentication server.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-slate-950 transition-colors duration-200">
      {/* Theme Toggle Button on Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm transition cursor-pointer"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-emerald-600" />}
        </button>
      </div>

      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* App Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block cursor-pointer" title="Back to landing page">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center shadow-xl shadow-emerald-500/20 mb-4 hover:scale-105 transition-transform">
              <Wallet className="w-7 h-7 text-slate-950 font-bold" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign in to Cybank
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personal Finance & Cashflow Ledger
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-emerald-400 text-[11px] font-medium mt-3 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Integrated with Cybeat SSO</span>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl dark:shadow-2xl dark:shadow-black/60 transition">
          {/* Success Redirecting Banner */}
          {isSuccessRedirecting && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800/80 dark:text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 animate-pulse" />
              <div className="flex-1">
                <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  Login Successful!
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  <span>Loading ledger data & redirecting to dashboard...</span>
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && !isSuccessRedirecting && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800/80 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  disabled={isLoading || isSuccessRedirecting}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  required
                  disabled={isLoading || isSuccessRedirecting}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isSuccessRedirecting}
                className="w-full py-2.5 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-75 text-sm cursor-pointer"
              >
                {isSuccessRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Redirecting to Dashboard...</span>
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Use your Cybeat SSO credentials to sign in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
