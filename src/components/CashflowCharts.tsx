"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/api";
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
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

export type ChartDateMode = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "RANGE";

const MONTH_NAMES = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// Local-date helpers (never UTC) so the periode filters never shift by a day
const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const daysInMonthOf = (month: string) => {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon, 0).getDate();
};

const weekOfMonth = (isoDay: string) => `W${Math.min(Math.ceil(Number(isoDay.slice(8, 10)) / 7), 5)}`;

// A month with fewer weeks (e.g. February) must not keep a stale W5 selection
const clampWeekToMonth = (week: string, month: string) => {
  if (week === "LAST_7_DAYS") return week;
  const maxWeeks = Math.ceil(daysInMonthOf(month) / 7);
  return `W${Math.min(Number(week.replace("W", "")) || 1, maxWeeks)}`;
};

// Week ranges follow the same definition as the transaction history filter:
// W1 = 1-7, W2 = 8-14, W3 = 15-21, W4 = 22-28, W5 = 29-end of month.
const getWeekRange = (week: string, month: string) => {
  if (week === "LAST_7_DAYS") {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return { start: toISODate(start), end: toISODate(end) };
  }
  const total = daysInMonthOf(month);
  const index = Math.min(Number(week.replace("W", "")) || 1, Math.ceil(total / 7));
  const startDay = (index - 1) * 7 + 1;
  const endDay = Math.min(index * 7, total);
  return {
    start: `${month}-${String(startDay).padStart(2, "0")}`,
    end: `${month}-${String(endDay).padStart(2, "0")}`,
  };
};

interface CashflowChartsProps {
  initialAnalytics?: AnalyticsData | null;
  hideAmount: boolean;
  formatRupiah: (val: number) => string;
  defaultDateMode?: ChartDateMode;
  defaultTab?: "cashflow" | "category";
  // Bumped by the parent after every transaction mutation so the charts re-fetch
  refreshKey?: number;
}

export default function CashflowCharts({
  initialAnalytics,
  hideAmount,
  formatRupiah,
  defaultDateMode = "DAILY",
  defaultTab = "category",
  refreshKey = 0,
}: CashflowChartsProps) {
  const [dateMode, setDateMode] = useState<ChartDateMode>(defaultDateMode);
  const [chartType, setChartType] = useState<"bar" | "area">("bar");
  const [activeTab, setActiveTab] = useState<"cashflow" | "category">(defaultTab);
  const [data, setData] = useState<AnalyticsData | null>(initialAnalytics || null);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isHoveringDoughnut, setIsHoveringDoughnut] = useState(false);

  // Periode selection state (mirrors the transaction history date filter)
  const todayStr = useMemo(() => toISODate(new Date()), []);
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(todayStr.slice(0, 7));
  const [selectedWeek, setSelectedWeek] = useState(() => weekOfMonth(todayStr));
  const [selectedYear, setSelectedYear] = useState(todayStr.slice(0, 4));
  const [customStartDate, setCustomStartDate] = useState(`${todayStr.slice(0, 7)}-01`);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  const doughnutHoverRef = useRef(false);

  // Local tick bumped when the tab becomes visible again. Transactions may be
  // created elsewhere (mobile app, another tab), so the chart re-syncs on focus.
  const [syncTick, setSyncTick] = useState(0);
  const lastSyncRef = useRef(0);

  // Only touch React state when the hover flag actually flips (mousemove fires constantly).
  // Drives the center summary fade so the built-in tooltip stays readable.
  const setDoughnutHover = useCallback((next: boolean) => {
    if (doughnutHoverRef.current === next) return;
    doughnutHoverRef.current = next;
    setIsHoveringDoughnut(next);
  }, []);

  // Month & year dropdown values shared by the weekly/monthly filters
  const [curYearVal, curMonthVal] = useMemo(() => {
    const parts = (selectedMonth || todayStr.slice(0, 7)).split("-");
    return [parts[0] || todayStr.slice(0, 4), parts[1] || todayStr.slice(5, 7)];
  }, [selectedMonth, todayStr]);

  const availableYears = useMemo(() => {
    const currentYear = Number(todayStr.slice(0, 4));
    const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
    if (!years.includes(Number(selectedYear))) years.push(Number(selectedYear));
    return years;
  }, [todayStr, selectedYear]);

  const weeksInSelectedMonth = useMemo(
    () => Math.ceil(daysInMonthOf(selectedMonth) / 7),
    [selectedMonth]
  );
  const weekOptions = useMemo(
    () => Array.from({ length: weeksInSelectedMonth }, (_, i) => `W${i + 1}`),
    [weeksInSelectedMonth]
  );

  const selectedMonthShortLabel = useMemo(() => {
    const found = MONTH_NAMES.find((m) => m.value === curMonthVal);
    return found ? found.label.slice(0, 3) : "Mo";
  }, [curMonthVal]);

  // Resolved range fed to the analytics endpoint
  const { start: startDate, end: endDate } = useMemo(() => {
    switch (dateMode) {
      case "WEEKLY":
        return getWeekRange(selectedWeek, selectedMonth);
      case "MONTHLY": {
        const lastDay = daysInMonthOf(selectedMonth);
        return {
          start: `${selectedMonth}-01`,
          end: `${selectedMonth}-${String(lastDay).padStart(2, "0")}`,
        };
      }
      case "YEARLY":
        return { start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31` };
      case "RANGE": {
        const from = customStartDate || todayStr;
        const to = customEndDate || todayStr;
        return from <= to ? { start: from, end: to } : { start: to, end: from };
      }
      case "DAILY":
      default:
        return { start: selectedDay || todayStr, end: selectedDay || todayStr };
    }
  }, [dateMode, selectedDay, selectedWeek, selectedMonth, selectedYear, customStartDate, customEndDate, todayStr]);

  const handlePrevDay = () => {
    const d = new Date(`${selectedDay || todayStr}T00:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDay(toISODate(d));
  };

  const handleNextDay = () => {
    const d = new Date(`${selectedDay || todayStr}T00:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDay(toISODate(d));
  };

  const handlePrevMonth = () => {
    const [y, m] = (selectedMonth || todayStr.slice(0, 7)).split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [y, m] = (selectedMonth || todayStr.slice(0, 7)).split("-").map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setSelectedWeek((prev) => clampWeekToMonth(prev, month));
  };

  const handleYearChange = (year: string) => handleMonthChange(`${year}-${curMonthVal}`);

  const handlePrevWeek = () => {
    if (selectedWeek === "LAST_7_DAYS") {
      setSelectedWeek(`W${weeksInSelectedMonth}`);
      return;
    }
    const index = weekOptions.indexOf(selectedWeek);
    if (index > 0) {
      setSelectedWeek(weekOptions[index - 1]);
      return;
    }
    // Step back into the previous month, landing on its last week
    const [y, m] = (selectedMonth || todayStr.slice(0, 7)).split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(prevMonth);
    setSelectedWeek(`W${Math.ceil(daysInMonthOf(prevMonth) / 7)}`);
  };

  const handleNextWeek = () => {
    if (selectedWeek === "LAST_7_DAYS") return;
    const index = weekOptions.indexOf(selectedWeek);
    if (index >= 0 && index < weekOptions.length - 1) {
      setSelectedWeek(weekOptions[index + 1]);
      return;
    }
    // Step forward into the next month, starting at its first week
    const [y, m] = (selectedMonth || todayStr.slice(0, 7)).split("-").map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
    setSelectedWeek("W1");
  };

  const handleThisWeek = () => {
    setSelectedMonth(todayStr.slice(0, 7));
    setSelectedWeek(weekOfMonth(todayStr));
  };

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

  useEffect(() => {
    const syncIfVisible = () => {
      if (document.visibilityState !== "visible") return;
      // focus and visibilitychange both fire when switching back to the tab,
      // so collapse them into a single re-fetch
      const now = Date.now();
      if (now - lastSyncRef.current < 500) return;
      lastSyncRef.current = now;
      setSyncTick((tick) => tick + 1);
    };
    window.addEventListener("focus", syncIfVisible);
    document.addEventListener("visibilitychange", syncIfVisible);
    return () => {
      window.removeEventListener("focus", syncIfVisible);
      document.removeEventListener("visibilitychange", syncIfVisible);
    };
  }, []);

  // Fetch analytics data whenever the resolved periode range changes, the parent
  // reports a mutation, or the tab regains visibility
  useEffect(() => {
    let isCancelled = false;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ startDate, endDate });
        // no-store: the analytics numbers must never be served from the HTTP cache
        const res = await apiFetch(`/api/v1/analytics?${params.toString()}`, { cache: "no-store" });
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
  }, [startDate, endDate, refreshKey, syncTick]);

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
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
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
          label: "Income",
          data: incomeData,
          backgroundColor: "#10b981", // emerald
          hoverBackgroundColor: "#34d399",
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 28,
        },
        {
          label: "Expense",
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
          label: "Income",
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
          label: "Expense",
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
      layout: {
        // Room for the hoverOffset pop-out so it is not clipped by the canvas edge
        padding: 16,
      },
      onHover: (_event, elements) => {
        setDoughnutHover(Boolean(elements && elements.length > 0));
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
          padding: 10,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: function (context) {
              const value = Number(context.parsed || 0);
              const pct =
                summary.totalExpense > 0
                  ? ((value / summary.totalExpense) * 100).toFixed(1)
                  : "0";
              const amount = hideAmount ? "Rp \u2022\u2022\u2022\u2022\u2022\u2022" : formatRupiah(value);
              return ` ${amount} · ${pct}% of total outflow`;
            },
          },
        },
      },
      animation: {
        animateScale: true,
        animateRotate: true,
      },
    };
  }, [
    formatRupiah,
    hideAmount,
    setDoughnutHover,
    summary.totalExpense,
    tooltipBg,
    tooltipTitleColor,
    tooltipBodyColor,
    tooltipBorder,
  ]);

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
              Cashflow Charts & Analytics
            </h2>
            {loading && (
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualization of income, expense, and savings trends (Powered by Chart.js)
          </p>
        </div>

        {/* View tabs & chart type switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Tab: Cashflow vs Categories */}
          <div className="flex w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("cashflow")}
              className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "cashflow"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Cashflow Trend</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("category")}
              className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "category"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Category</span>
            </button>
          </div>

          {/* Chart Type (Bar / Area) only when activeTab is cashflow */}
          {activeTab === "cashflow" && (
            <div className="flex w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  chartType === "bar"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Bar Chart View"
              >
                Bar
              </button>
              <button
                type="button"
                onClick={() => setChartType("area")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  chartType === "area"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Smooth Area Trend View"
              >
                Area
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Periode Filter: Daily / Weekly / Monthly / Yearly / Range */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
          Periode:
        </span>

        <div className="flex items-center overflow-x-auto scrollbar-none max-w-full rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
          {([
            { id: "DAILY", label: "Daily" },
            { id: "WEEKLY", label: "Weekly" },
            { id: "MONTHLY", label: "Monthly" },
            { id: "YEARLY", label: "Yearly" },
            { id: "RANGE", label: "Range" },
          ] as { id: ChartDateMode; label: string }[]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDateMode(item.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                dateMode === item.id
                  ? "bg-emerald-500 text-white shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {dateMode === "DAILY" && (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(todayStr)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            >
              Today
            </button>
          </div>
        )}

        {dateMode === "WEEKLY" && (
          <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-3 py-1.5 pr-7 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer appearance-none"
              >
                <option value="LAST_7_DAYS">Last 7 Days (Rolling)</option>
                {weekOptions.map((week) => {
                  const index = Number(week.replace("W", ""));
                  const startDay = (index - 1) * 7 + 1;
                  const endDay = Math.min(index * 7, daysInMonthOf(selectedMonth));
                  return (
                    <option key={week} value={week}>
                      {`Week ${index} (${startDay} - ${endDay} ${selectedMonthShortLabel})`}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={curMonthVal}
                onChange={(e) => handleMonthChange(`${curYearVal}-${e.target.value}`)}
                className="px-3 py-1.5 pr-7 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer appearance-none"
              >
                {MONTH_NAMES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={curYearVal}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-3 py-1.5 pr-7 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer appearance-none"
              >
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleThisWeek}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            >
              This Week
            </button>
          </div>
        )}

        {dateMode === "MONTHLY" && (
          <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <select
                value={curMonthVal}
                onChange={(e) => handleMonthChange(`${curYearVal}-${e.target.value}`)}
                className="px-3 py-1.5 pr-7 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer appearance-none"
              >
                {MONTH_NAMES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={curYearVal}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-3 py-1.5 pr-7 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer appearance-none"
              >
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedMonth(todayStr.slice(0, 7))}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            >
              Current Month
            </button>
          </div>
        )}

        {dateMode === "YEARLY" && (
          <div className="flex items-center gap-2 animate-in fade-in duration-200">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {dateMode === "RANGE" && (
          <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Badges for Current Period */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 dark:bg-emerald-500/10 dark:border-emerald-500/20">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>Income</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {hideAmount ? "Rp ••••••" : formatRupiah(summary.totalIncome)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/15 dark:bg-rose-500/10 dark:border-rose-500/20">
          <div className="flex items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-400">
            <span>Expense</span>
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </div>
          <div className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
            {hideAmount ? "Rp ••••••" : formatRupiah(summary.totalExpense)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/70 dark:border-slate-800/80">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Net Cashflow
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
            <span>Savings Rate</span>
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
              No transaction data for this time range.
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
            onMouseLeave={() => setDoughnutHover(false)}
          >
            <div className="relative aspect-square w-[17rem] max-w-full sm:w-72 lg:w-80 flex items-center justify-center">
              {categories.length === 0 ? (
                <div className="text-slate-400 text-sm">No expenses yet</div>
              ) : (
                <>
                  <Doughnut data={doughnutData} options={doughnutOptions} />

                  {/* Center Info Overlay - fades out on hover so the built-in tooltip stays readable */}
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4 transition-opacity duration-200 ${
                      isHoveringDoughnut ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Outflow
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {hideAmount ? "Rp ••••••" : formatRupiah(summary.totalExpense)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {categories.length} Categories
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Category Ranked Progress List */}
          <div className="md:col-span-7 space-y-2.5">
            {categories.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No category expense data yet.
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
