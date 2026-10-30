"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardClient, { InitialData } from "@/components/DashboardClient";
import { apiFetch } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialHideAmount, setInitialHideAmount] = useState(false);

  useEffect(() => {
    // Check initial hide amount preference from cookie or localStorage
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/cybank_hide_amount=([^;]+)/);
      if (match && match[1] === "true") {
        setInitialHideAmount(true);
      }
    }

    async function loadDashboard() {
      try {
        const res = await apiFetch("/api/v1/dashboard");
        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        const json = await res.json();
        if (json.success && json.data) {
          setInitialData(json.data);
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  if (loading || !initialData) {
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

  return (
    <DashboardClient
      initialData={initialData}
      initialHideAmount={initialHideAmount}
    />
  );
}

