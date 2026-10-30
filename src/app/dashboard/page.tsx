"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardClient, { InitialData } from "@/components/DashboardClient";
import { apiFetch, readJson } from "@/lib/api";

interface DashboardResponse {
  success?: boolean;
  message?: string;
  data?: InitialData;
}

export default function DashboardPage() {
  const router = useRouter();
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialHideAmount, setInitialHideAmount] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await apiFetch("/api/v1/dashboard");
      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const json = await readJson<DashboardResponse>(res);
      if (!json) {
        // Body bukan JSON: proxy/hosting membalas halaman error, atau backend timeout.
        setLoadError(`Server did not return dashboard data (HTTP ${res.status}). Please try again.`);
        return;
      }

      if (json.success && json.data) {
        setInitialData(json.data);
      } else {
        setLoadError(json.message || "Dashboard data could not be loaded. Please try again.");
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setLoadError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Check initial hide amount preference from cookie or localStorage
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/cybank_hide_amount=([^;]+)/);
      if (match && match[1] === "true") {
        setInitialHideAmount(true);
      }
    }

    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="relative w-16 h-16 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping"></div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
            <span className="font-bold text-xl text-slate-950">CB</span>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-400 animate-pulse tracking-wide">
          Loading Cybank...
        </p>
      </div>
    );
  }

  if (loadError || !initialData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-rose-500/30 mb-4">
          <span className="font-bold text-xl text-slate-950">CB</span>
        </div>
        <p className="max-w-sm text-center text-sm font-semibold tracking-wide text-rose-200">
          {loadError || "Dashboard data could not be loaded."}
        </p>
        <button
          type="button"
          onClick={loadDashboard}
          className="mt-6 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <DashboardClient
      initialData={initialData}
      initialHideAmount={initialHideAmount}
    />
  );
}

