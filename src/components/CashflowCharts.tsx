"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { apiUrl } from "@/lib/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
} from "lucide-react";

// Register Chart.js core elements & plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface AnalyticsTrendItem {
  period: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface AnalyticsCategoryItem {
  id: number | null;
  name: string;
  color: string;
  total: number;
  percentage: number;
}

export interface AnalyticsData {
  timeframe: string;
  range: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    savingsRate: number;
  };
  trend: AnalyticsTrendItem[];
  categories: AnalyticsCategoryItem[];
}

interface CashflowChartsProps {
  initialAnalytics?: AnalyticsData | null;
  hideAmount: boolean;
  formatRupiah: (val: number) => string;
}

export default function CashflowCharts({
  initialAnalytics,
  hideAmount,
  formatRupiah,
}: CashflowChartsProps) {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "6m" | "1y" | "all">("30d");
  const [chartType, setChartType] = useState<"bar" | "area">("bar");
  const [activeTab, setActiveTab] = useState<"cashflow" | "category">("cashflow");
  const [data, setData] = useState<AnalyticsData | null>(initialAnalytics || null);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isHoveringDoughnut, setIsHoveringDoughnut] = useState(false);

  // Detect current theme mode from document
  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Fetch analytics data when timeframe changes
  useEffect(() => {
    let isCancelled = false;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("cybank_token") : null;
        const res = await fetch(apiUrl(`/api/v1/analytics?timeframe=${timeframe}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        const json = await res.json();
        if (json.success && !isCancelled) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      isCancelled = true;
    };
  }, [timeframe]);

  const trend = data?.trend || [];
  const categories = data?.categories || [];
  const summary = data?.summary || { totalIncome: 0, totalExpense: 0, net: 0, savingsRate: 0 };

  // Theme-aware colors
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(51, 65, 85, 0.45)" : "rgba(226, 232, 240, 0.8)";
  const tooltipBg = isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)";
  const tooltipTitleColor = isDark ? "#f8fafc" : "#0f172a";
  const tooltipBodyColor = isDark ? "#cbd5e1" : "#334155";
  const tooltipBorder = isDark ? "rgba(51, 65, 85, 0.8)" : "rgba(226, 232, 240, 0.8)";

  // Format compact for Y axis
  const formatCompact = (val: number) => {
    if (hideAmount) return "•••";
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}rb`;
    return `${val}`;
  };

  // 1. Chart.js Bar Chart Data & Options
  const barChartData = useMemo(() => {
    const labels = trend.map((t) => t.label);
    const incomeData = trend.map((t) => t.income);
    const expenseData = trend.map((t) => t.expense);

    return {
      labels,
      datasets: [
        {
          label: "Pemasukan",
          data: incomeData,
          backgroundColor: "#10b981", // emerald
          hoverBackgroundColor: "#34d399",
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 28,
        },
        {
          label: "Pengeluaran",
          data: expenseData,
          backgroundColor: "#f43f5e", // rose
          hoverBackgroundColor: "#fb7185",
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 28,
        },
      ],
    };
  }, [trend]);

  // 2. Chart.js Line / Area Chart Data & Options
  const lineChartData = useMemo(() => {
    const labels = trend.map((t) => t.label);
    const incomeData = trend.map((t) => t.income);
    const expenseData = trend.map((t) => t.expense);

    return {
      labels,
      datasets: [
        {
          label: "Pemasukan",
          data: incomeData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: "#10b981",
          pointHoverBackgroundColor: "#34d399",
          borderWidth: 2.5,
        },
        {
          label: "Pengeluaran",
          data: expenseData,
          borderColor: "#f43f5e",
          backgroundColor: "rgba(244, 63, 94, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: "#f43f5e",
          pointHoverBackgroundColor: "#fb7185",
          borderWidth: 2.5,
        },
      ],
    };
  }, [trend]);

  // Common options for Bar and Line charts
  const trendChartOptions: ChartOptions<"bar" | "line"> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: textColor,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16,
            font: {
              size: 11,
              weight: 600,
            },
          },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipTitleColor,
          bodyColor: tooltipBodyColor,
          borderColor: tooltipBorder,
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: function (context) {
              const val = Number(context.raw || 0);
              const label = context.dataset.label || "";
              return ` ${label}: ${hideAmount ? "Rp ••••••" : formatRupiah(val)}`;
            },
            footer: function (tooltipItems) {
              if (tooltipItems.length >= 2) {
                const inc = Number(tooltipItems[0].raw || 0);
                const exp = Number(tooltipItems[1].raw || 0);
                const net = inc - exp;
                return `Net: ${hideAmount ? "Rp ••••••" : formatRupiah(net)}`;
              }
              return "";
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: textColor,
            font: {
              size: 10,
              weight: 500,
            },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
          },
        },
        y: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
            font: {
              size: 10,
            },
            callback: function (val) {
              return formatCompact(Number(val));
            },
          },
        },
      },
    };
  }, [textColor, gridColor, tooltipBg, tooltipTitleColor, tooltipBodyColor, tooltipBorder, hideAmount, formatRupiah]);

  // 3. Chart.js Doughnut Chart Data & Options (Category Breakdown)
  const doughnutData = useMemo(() => {
    const topCats = categories.slice(0, 8);
    const labels = topCats.map((c) => c.name);
    const amounts = topCats.map((c) => c.total);
    const colors = topCats.map((c) => c.color);

    return {
      labels,
      datasets: [
        {
          data: amounts,
          backgroundColor: colors,
          borderColor: isDark ? "#0f172a" : "#ffffff",
          borderWidth: 2,
          hoverOffset: 14, // Library-native outward slice pop & smooth hover highlight!
        },
      ],
    };
  }, [categories, isDark]);

  const doughnutOptions: ChartOptions<"doughnut"> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      onHover: (event, elements) => {
        setIsHoveringDoughnut(Boolean(elements && elements.length > 0));
      },
      plugins: {
        legend: {
          display: false, // We render the interactive ranked list alongside
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipTitleColor,
          bodyColor: tooltipBodyColor,
          borderColor: tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          usePointStyle: true,
          callbacks: {
            label: function (context) {
              const val = Number(context.raw || 0);
              const totalExp = summary.totalExpense;
              const pct = totalExp > 0 ? ((val / totalExp) * 100).toFixed(1) : "0";
              const label = context.label || "";
              return ` ${label}: ${hideAmount ? "Rp ••••••" : formatRupiah(val)} (${pct}%)`;
            },
          },
        },
      },
      animation: {
        animateScale: true,
        animateRotate: true,
      },
    };
  }, [tooltipBg, tooltipTitleColor, tooltipBodyColor, tooltipBorder, hideAmount, formatRupiah, summary.totalExpense]);

  return (
    <div className="rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-6 transition">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Grafik & Analisis Arus Kas
            </h2>
            {loading && (
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualisasi mutasi pemasukan, pengeluaran, dan tren tabungan (Powered by Chart.js)
          </p>
        </div>

        {/* View / Tab & Timeframe switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Tab: Cashflow vs Categories */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("cashflow")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === "cashflow"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tren Arus Kas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("category")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === "category"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Kategori</span>
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
            {[
              { id: "7d", label: "7H" },
              { id: "30d", label: "30H" },
              { id: "6m", label: "6B" },
              { id: "1y", label: "1T" },
              { id: "all", label: "Semua" },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id as any)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  timeframe === tf.id
                    ? "bg-emerald-500 text-white shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title={`Pilih periode ${tf.label}`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Chart Type (Bar / Area) only when activeTab is cashflow */}
          {activeTab === "cashflow" && (
            <div className="flex rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  chartType === "bar"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Tampilan Grafik Batang (Bar Chart)"
              >
                Batang
              </button>
              <button
                type="button"
                onClick={() => setChartType("area")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  chartType === "area"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Tampilan Grafik Kurva Halus (Area Trend)"
              >
                Kurva
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Badges for Current Period */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 dark:bg-emerald-500/10 dark:border-emerald-500/20">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>Pemasukan</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {hideAmount ? "Rp ••••••" : formatRupiah(summary.totalIncome)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/15 dark:bg-rose-500/10 dark:border-rose-500/20">
          <div className="flex items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-400">
            <span>Pengeluaran</span>
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </div>
          <div className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
            {hideAmount ? "Rp ••••••" : formatRupiah(summary.totalExpense)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/70 dark:border-slate-800/80">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Arus Kas Bersih
          </div>
          <div
            className={`text-base sm:text-lg font-bold mt-1 ${
              summary.net >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {hideAmount ? "Rp ••••••" : formatRupiah(summary.net)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/70 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Rasio Tabungan</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
            {summary.savingsRate}%
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      {activeTab === "cashflow" ? (
        <div className="w-full h-72 sm:h-80 relative select-none">
          {trend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Belum ada data transaksi untuk rentang waktu ini.
            </div>
          ) : chartType === "bar" ? (
            <Bar data={barChartData} options={trendChartOptions as any} />
          ) : (
            <Line data={lineChartData} options={trendChartOptions as any} />
          )}
        </div>
      ) : (
        /* CATEGORY BREAKDOWN TAB (CHART.JS DOUGHNUT + RANKED LIST) */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Doughnut Chart Canvas with Center Summary */}
          <div
            className="md:col-span-5 flex flex-col items-center justify-center relative select-none"
            onMouseLeave={() => setIsHoveringDoughnut(false)}
          >
            <div className="relative w-64 h-64 flex items-center justify-center">
              {categories.length === 0 ? (
                <div className="text-slate-400 text-sm">Belum ada pengeluaran</div>
              ) : (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              )}

              {/* Center Info Overlay - fade out otomatis saat hover agar tidak menghalangi float text */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4 transition-opacity duration-200 ${
                  isHoveringDoughnut ? "opacity-0" : "opacity-100"
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Keluar
                </span>
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {hideAmount ? "Rp ••••••" : formatRupiah(summary.totalExpense)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {categories.length} Kategori
                </span>
              </div>
            </div>
          </div>

          {/* Category Ranked Progress List */}
          <div className="md:col-span-7 space-y-2.5">
            {categories.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Belum ada data pengeluaran kategori.
              </div>
            ) : (
              categories.slice(0, 6).map((c, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/60 dark:bg-slate-950/60 dark:border-slate-800/60 space-y-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800/80"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="truncate max-w-[180px]">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {hideAmount ? "Rp •••••" : formatRupiah(c.total)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-12 text-right font-semibold">
                        {c.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200/60 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(c.percentage, 100)}%`,
                        backgroundColor: c.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
