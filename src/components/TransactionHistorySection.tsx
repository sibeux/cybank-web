"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  RotateCcw,
  Receipt,
  LayoutDashboard,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Table,
  LayoutList,
  ArrowUpDown,
  X,
  CreditCard,
  Wallet,
  Tag,
  Copy,
  Check,
  Clock,
  ArrowLeftRight,
  Edit3,
} from "lucide-react";

export interface TransactionItem {
  id: number;
  amount: number;
  type: string;
  paymentType: string | null;
  note: string | null;
  payee: string | null;
  transactionDate: string;
  accountId?: number;
  accountName: string;
  categoryId?: number | null;
  transferToAccountId?: number | null;
  transferToAccountName?: string | null;
  categoryName: string;
}

export type DateFilterMode = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "RANGE";

interface TransactionHistorySectionProps {
  transactions: TransactionItem[];
  totalFilteredCount: number;
  periodSummary: {
    totalIncome: number;
    totalExpense: number;
    net: number;
  };
  isFetchingFilter: boolean;
  isLoadingMore: boolean;
  viewMode: "dashboard" | "full";
  setViewMode: (mode: "dashboard" | "full") => void;
  page: number;
  totalPages: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  handlePageChange: (newPage: number) => void;
  handleShowMoreDashboard?: () => void;
  dateFilterMode: DateFilterMode;
  setDateFilterMode: (mode: DateFilterMode) => void;
  selectedDay: string;
  setSelectedDay: (d: string) => void;
  selectedWeek: string;
  setSelectedWeek: (w: string) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedYear: string;
  setSelectedYear: (y: string) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  selectedType: "EXPENSE" | "INCOME" | "TRANSFER" | "ALL" | string;
  setSelectedType: React.Dispatch<React.SetStateAction<"EXPENSE" | "INCOME" | "TRANSFER" | "ALL">> | ((t: any) => void);
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  selectedAccount: string;
  setSelectedAccount: (a: string) => void;
  search: string;
  setSearch: (s: string) => void;
  handleResetFilters: () => void;
  handleDeleteTransaction: (id: number) => void;
  onEditTransaction: (tx: TransactionItem) => void;
  hideAmount: boolean;
  formatRupiah: (val: number) => string;
  formatDate: (iso: string) => string;
  getCategoryColor: (name: string) => string;
  categories: { id: number; name: string }[];
  accounts: { id: number; name: string }[];
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
}

export default function TransactionHistorySection({
  transactions,
  totalFilteredCount,
  periodSummary,
  isFetchingFilter,
  isLoadingMore,
  viewMode,
  setViewMode,
  page,
  totalPages,
  pageSize,
  setPageSize,
  handlePageChange,
  handleShowMoreDashboard,
  dateFilterMode,
  setDateFilterMode,
  selectedDay,
  setSelectedDay,
  selectedWeek,
  setSelectedWeek,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  selectedType,
  setSelectedType,
  selectedCategory,
  setSelectedCategory,
  selectedAccount,
  setSelectedAccount,
  search,
  setSearch,
  handleResetFilters,
  handleDeleteTransaction,
  onEditTransaction,
  hideAmount,
  formatRupiah,
  formatDate,
  getCategoryColor,
  categories,
  accounts,
  sortBy,
  sortOrder,
  onSortChange,
}: TransactionHistorySectionProps) {
  // Hybrid View Style: 'timeline' (Timeline Feed) vs 'table' (Compact Table)
  const [viewStyle, setViewStyle] = useState<"timeline" | "table">("timeline");

  // Selected Transaction for Detail Modal
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<TransactionItem | null>(null);
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // Quick Today & Current Month strings (local timezone)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const curMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Check if any filter is active (default is DAILY for today)
  const isFilterActive =
    dateFilterMode !== "DAILY" ||
    selectedDay !== todayStr ||
    search.trim() !== "" ||
    selectedType !== "ALL" ||
    selectedCategory !== "ALL" ||
    selectedAccount !== "ALL";

  // Month & Year definitions for intuitive selection
  const MONTH_NAMES = useMemo(
    () => [
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
    ],
    []
  );
  const AVAILABLE_YEARS = useMemo(() => [2026, 2025, 2024, 2023, 2022, 2021], []);

  // Parsed month & year values
  const [curYearVal, curMonthVal] = useMemo(() => {
    const parts = (selectedMonth || curMonthStr).split("-");
    return [parts[0] || "2026", parts[1] || "10"];
  }, [selectedMonth, curMonthStr]);

  const handlePrevMonth = () => {
    const [y, m] = (selectedMonth || curMonthStr).split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${prevY}-${prevM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = (selectedMonth || curMonthStr).split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDay || todayStr);
    d.setDate(d.getDate() - 1);
    setSelectedDay(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDay || todayStr);
    d.setDate(d.getDate() + 1);
    setSelectedDay(d.toISOString().slice(0, 10));
  };

  // Days count and short month name in selected month for weekly labels
  const daysInSelectedMonth = useMemo(() => {
    const y = Number(curYearVal);
    const m = Number(curMonthVal);
    return new Date(y, m, 0).getDate();
  }, [curYearVal, curMonthVal]);

  const selectedMonthShortLabel = useMemo(() => {
    const found = MONTH_NAMES.find((m) => m.value === curMonthVal);
    return found ? found.label.slice(0, 3) : "Mo";
  }, [MONTH_NAMES, curMonthVal]);

  const handleCurrentWeek = () => {
    setSelectedMonth(curMonthStr);
    const todayNum = new Date().getDate();
    if (todayNum <= 7) setSelectedWeek("W1");
    else if (todayNum <= 14) setSelectedWeek("W2");
    else if (todayNum <= 21) setSelectedWeek("W3");
    else if (todayNum <= 28) setSelectedWeek("W4");
    else setSelectedWeek(daysInSelectedMonth > 28 ? "W5" : "W4");
  };

  const handlePrevWeek = () => {
    const order = ["W1", "W2", "W3", "W4", ...(daysInSelectedMonth > 28 ? ["W5"] : [])];
    const currentIndex = order.indexOf(selectedWeek);
    if (currentIndex > 0) {
      setSelectedWeek(order[currentIndex - 1]);
    } else if (selectedWeek === "LAST_7_DAYS") {
      setSelectedWeek("W1");
    } else {
      handlePrevMonth();
      setSelectedWeek("W4");
    }
  };

  const handleNextWeek = () => {
    const order = ["W1", "W2", "W3", "W4", ...(daysInSelectedMonth > 28 ? ["W5"] : [])];
    const currentIndex = order.indexOf(selectedWeek);
    if (currentIndex >= 0 && currentIndex < order.length - 1) {
      setSelectedWeek(order[currentIndex + 1]);
    } else if (selectedWeek === "LAST_7_DAYS") {
      setSelectedWeek("W1");
    } else {
      handleNextMonth();
      setSelectedWeek("W1");
    }
  };

  // Helper for grouping transactions by Date in Timeline View
  const groupedTransactions = useMemo(() => {
    const groups: {
      dateKey: string;
      dateLabel: string;
      isToday: boolean;
      isYesterday: boolean;
      items: TransactionItem[];
      totalIncome: number;
      totalExpense: number;
      net: number;
    }[] = [];

    const map = new Map<string, TransactionItem[]>();

    for (const tx of transactions) {
      const dateKey = tx.transactionDate ? tx.transactionDate.slice(0, 10) : "unknown";
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(tx);
    }

    const todayDate = new Date();
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(todayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    for (const [dateKey, items] of map.entries()) {
      let income = 0;
      let expense = 0;
      for (const item of items) {
        if (item.type === "INCOME") income += item.amount;
        else expense += item.amount;
      }

      const isToday = dateKey === todayStr;
      const isYesterday = dateKey === yesterdayStr;

      let dateLabel = dateKey;
      if (dateKey !== "unknown") {
        const d = new Date(`${dateKey}T12:00:00`);
        dateLabel = d.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }

      groups.push({
        dateKey,
        dateLabel,
        isToday,
        isYesterday,
        items,
        totalIncome: income,
        totalExpense: expense,
        net: income - expense,
      });
    }

    return groups;
  }, [transactions, todayStr]);

  // Handle Copy Note
  const handleCopyNote = (text: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  // Handle Copy Amount
  const handleCopyAmount = (num: number) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(String(num));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // Format Time Only
  const formatTimeOnly = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--:--";
    }
  };

  // Current Sort Label
  const currentSortKey = `${sortBy}_${sortOrder}`;

  return (
    <div id="transaction-history-section" className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 dark:bg-slate-900/90 dark:border-slate-800 shadow-sm space-y-4 sm:space-y-6 transition-all duration-200">
      {/* 1. SECTION HEADER & VIEW CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Transactions & Cashflow History
                </h2>
                {isFetchingFilter && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong> (Total{" "}
                <strong>{totalFilteredCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</strong> transactions)
                {isFilterActive && " (Filtered)"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: View Style Switcher + Reset + SPA Toggle */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Hybrid View Mode Switcher (Timeline Feed vs Table) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewStyle("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewStyle === "timeline"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
              title="Grouped Timeline Feed View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline Feed</span>
              <span className="sm:hidden">Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewStyle("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewStyle === "table"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
              title="Compact Data Table View"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compact Table</span>
              <span className="sm:hidden">Table</span>
            </button>
          </div>

          {/* Reset Filters */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}

          {/* SPA Full View vs Dashboard Toggle (redundant on mobile — header tabs already switch view) */}
          {viewMode === "dashboard" ? (
            <button
              type="button"
              onClick={() => setViewMode("full")}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Full Mode (SPA)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode("dashboard")}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MICRO-CARDS RINGKASAN PERIODE (INTERACTIVE STAT CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pemasukan Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 dark:from-emerald-500/10 dark:to-emerald-500/5 border border-emerald-500/20 transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Period Income
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {hideAmount ? "Rp •••••" : formatRupiah(periodSummary.totalIncome)}
          </div>
          <div className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
            Total funds received in the selected period
          </div>
        </div>

        {/* Pengeluaran Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/5 to-rose-500/10 dark:from-rose-500/10 dark:to-rose-500/5 border border-rose-500/20 transition-all hover:border-rose-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Period Expense
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold text-rose-600 dark:text-rose-400">
            {hideAmount ? "Rp •••••" : formatRupiah(periodSummary.totalExpense)}
          </div>
          <div className="text-[11px] text-rose-600/70 dark:text-rose-400/70 mt-0.5">
            Total recorded expenses
          </div>
        </div>

        {/* Arus Kas Bersih Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100/80 to-slate-200/50 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200 dark:border-slate-800 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Net Cashflow
            </span>
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                periodSummary.net >= 0
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-xl font-bold ${
              periodSummary.net >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {hideAmount ? "Rp •••••" : formatRupiah(periodSummary.net)}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                periodSummary.net >= 0
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
              }`}
            >
              {periodSummary.net >= 0 ? "Surplus" : "Defisit"}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {periodSummary.net >= 0 ? "Positive cashflow" : "Expenses exceed income"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FILTER CONTROLS & SORTING BAR */}
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        {/* ROW 1: Date Filter Tabs + Date Inputs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            Periode:
          </span>

          <div className="flex items-center overflow-x-auto scrollbar-none max-w-full rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
            {[
              { id: "DAILY", label: "Daily" },
              { id: "WEEKLY", label: "Weekly" },
              { id: "MONTHLY", label: "Monthly" },
              { id: "YEARLY", label: "Yearly" },
              { id: "RANGE", label: "Range" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDateFilterMode(item.id as DateFilterMode)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                  dateFilterMode === item.id
                    ? "bg-emerald-500 text-white shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Specific Date Selectors based on dateFilterMode */}
          {dateFilterMode === "WEEKLY" && (
            <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
              {/* Stepper Prev Week */}
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Week Selector Dropdown */}
              <div className="relative">
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-1.5 pr-7 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer appearance-none"
                >
                  <option value="LAST_7_DAYS">Last 7 Days (Rolling)</option>
                  <option value="W1">Week 1 (1 - 7 {selectedMonthShortLabel})</option>
                  <option value="W2">Week 2 (8 - 14 {selectedMonthShortLabel})</option>
                  <option value="W3">Week 3 (15 - 21 {selectedMonthShortLabel})</option>
                  <option value="W4">Week 4 (22 - 28 {selectedMonthShortLabel})</option>
                  {daysInSelectedMonth > 28 && (
                    <option value="W5">Week 5 (29 - {daysInSelectedMonth} {selectedMonthShortLabel})</option>
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Month Dropdown for Weekly */}
              <div className="relative">
                <select
                  value={curMonthVal}
                  onChange={(e) => setSelectedMonth(`${curYearVal}-${e.target.value}`)}
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

              {/* Year Dropdown */}
              <div className="relative">
                <select
                  value={curYearVal}
                  onChange={(e) => setSelectedMonth(`${e.target.value}-${curMonthVal}`)}
                  className="px-3 py-1.5 pr-7 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer appearance-none"
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Stepper Next Week */}
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
                onClick={handleCurrentWeek}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
              >
                This Week
              </button>
            </div>
          )}

          {dateFilterMode === "DAILY" && (
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

          {dateFilterMode === "MONTHLY" && (
            <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
              {/* Stepper Prev Month */}
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Month Dropdown */}
              <div className="relative">
                <select
                  value={curMonthVal}
                  onChange={(e) => setSelectedMonth(`${curYearVal}-${e.target.value}`)}
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

              {/* Year Dropdown */}
              <div className="relative">
                <select
                  value={curYearVal}
                  onChange={(e) => setSelectedMonth(`${e.target.value}-${curMonthVal}`)}
                  className="px-3 py-1.5 pr-7 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer appearance-none"
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Stepper Next Month */}
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
                onClick={() => setSelectedMonth(curMonthStr)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
              >
                Current Month
              </button>
            </div>
          )}

          {dateFilterMode === "YEARLY" && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
              >
                {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {dateFilterMode === "RANGE" && (
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

        {/* ROW 2: Search & Type Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Search Bar with instant Clear Button */}
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search notes, payee, amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center overflow-x-auto scrollbar-none rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                selectedType === "ALL"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("EXPENSE")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                selectedType === "EXPENSE"
                  ? "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("INCOME")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                selectedType === "INCOME"
                  ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("TRANSFER")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                selectedType === "TRANSFER"
                  ? "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Transfer
            </button>
          </div>
        </div>

        {/* ROW 3: Secondary Filters (Category & Account) + Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
          {/* Left: Category and Account Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 pr-8 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer appearance-none"
              >
                <option value="ALL">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Account Dropdown */}
            <div className="relative">
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-3 py-2 pr-8 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer appearance-none"
              >
                <option value="ALL">All Wallets & Accounts ({accounts.length})</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Right: Sorting Dropdown */}
          <div className="relative flex items-center gap-1.5 ml-auto sm:ml-0">
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline-flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={currentSortKey}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "date_desc") onSortChange("date", "desc");
                else if (val === "date_asc") onSortChange("date", "asc");
                else if (val === "amount_desc") onSortChange("amount", "desc");
                else if (val === "amount_asc") onSortChange("amount", "asc");
              }}
              className="px-3 py-2 pr-8 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer appearance-none"
            >
              <option value="date_desc">📅 Newest First</option>
              <option value="date_asc">📅 Oldest First</option>
              <option value="amount_desc">💰 Highest Amount</option>
              <option value="amount_asc">💰 Lowest Amount</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. CONTENT AREA: SKELETON / TIMELINE FEED / COMPACT TABLE */}
      {isFetchingFilter ? (
        /* Smooth Skeleton Loader */
        <div className="space-y-4 py-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-700/60" />
                <div className="space-y-2">
                  <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700/60 rounded" />
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700/40 rounded" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700/60 rounded ml-auto" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700/40 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        /* Empty State */
        <div className="py-12 sm:py-20 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Transactions Found
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              No transaction records match your selected filter criteria.
            </p>
          </div>
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : viewStyle === "timeline" ? (
        /* ================= GAYA 1: TIMELINE FEED BERKELOMPOK ================= */
        <div className="space-y-6">
          {groupedTransactions.map((group) => (
            <div key={group.dateKey} className="space-y-2.5">
              {/* Daily Group Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 px-2.5 py-1.5 bg-slate-50/90 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {group.dateLabel}
                  </span>
                  {group.isToday && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                      Today
                    </span>
                  )}
                  {group.isYesterday && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Yesterday
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px]">
                    ({group.items.length} Transactions)
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-3 text-[11px] font-medium">
                  {group.totalIncome > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{hideAmount ? "••••" : formatRupiah(group.totalIncome)}
                    </span>
                  )}
                  {group.totalExpense > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      -{hideAmount ? "••••" : formatRupiah(group.totalExpense)}
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions in Date Group */}
              <div className="space-y-1.5">
                {group.items.map((tx) => {
                  const isExpense = tx.type === "EXPENSE";
                  const isTransfer = tx.type === "TRANSFER";
                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTxForDetail(tx)}
                      className="group p-3.5 rounded-2xl bg-slate-50/40 hover:bg-slate-100/90 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/70 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3 cursor-pointer"
                    >
                      {/* Left: Icon & Title */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                            isTransfer
                              ? "bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20"
                              : isExpense
                              ? "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          }`}
                        >
                          {isTransfer ? (
                            <ArrowLeftRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          ) : isExpense ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {tx.note || (isTransfer ? "Fund Transfer" : tx.categoryName)}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-md border shrink-0 ${
                                isTransfer
                                  ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                                  : getCategoryColor(tx.categoryName)
                              }`}
                            >
                              {isTransfer ? "Transfer" : tx.categoryName}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatTimeOnly(tx.transactionDate)}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {isTransfer && tx.transferToAccountName
                                ? `${tx.accountName} → ${tx.transferToAccountName}`
                                : tx.accountName}
                            </span>
                            {tx.payee && !isTransfer && (
                              <>
                                <span>•</span>
                                <span className="text-slate-700 dark:text-slate-200">
                                  {tx.payee}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Quick Actions */}
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <div className="text-right">
                          <div
                            className={`text-sm font-bold tracking-tight ${
                              isTransfer
                                ? "text-indigo-600 dark:text-indigo-400"
                                : isExpense
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {hideAmount
                              ? "••••••••"
                              : `${isTransfer ? "" : isExpense ? "-" : "+"} ${formatRupiah(tx.amount)}`}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                            {tx.paymentType || "CASH"}
                          </div>
                        </div>

                        {/* Quick Actions (hover-only on desktop; on mobile use the detail modal) */}
                        <div className="hidden md:flex md:items-center md:gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTransaction(tx);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-500 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10 transition cursor-pointer"
                            title="Edit transaction"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this transaction?")) {
                                handleDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ================= GAYA 2: TABEL DATA RINGKAS (COMPACT TABLE) ================= */
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Time & Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description / Note</th>
                <th className="py-3 px-4">Account / Wallet</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {transactions.map((tx) => {
                const isExpense = tx.type === "EXPENSE";
                const isTransfer = tx.type === "TRANSFER";
                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTxForDetail(tx)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(tx.transactionDate)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-md border ${
                          isTransfer
                            ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                            : getCategoryColor(tx.categoryName)
                        }`}
                      >
                        {isTransfer ? "Transfer" : tx.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-800 dark:text-slate-200">
                      {tx.note || (isTransfer ? "Fund Transfer" : "-")}
                      {tx.payee && !isTransfer && (
                        <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-[11px]">
                          ({tx.payee})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                      {isTransfer && tx.transferToAccountName
                        ? `${tx.accountName} → ${tx.transferToAccountName}`
                        : tx.accountName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase">
                        {tx.paymentType || (isTransfer ? "TRANSFER" : "CASH")}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                        isTransfer
                          ? "text-indigo-600 dark:text-indigo-400"
                          : isExpense
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {hideAmount
                        ? "••••••••"
                        : `${isTransfer ? "" : isExpense ? "-" : "+"} ${formatRupiah(tx.amount)}`}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTransaction(tx);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition cursor-pointer"
                          title="Edit transaction"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete this transaction?")) {
                              handleDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. FOOTER CONTROLS: UNIFIED PAGINATION & PAGE SIZE */}
      {totalFilteredCount > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Info & Page Size */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {Math.min((page - 1) * pageSize + 1, totalFilteredCount)}
              </strong>
              {" - "}
              <strong className="text-slate-700 dark:text-slate-200">
                {Math.min(page * pageSize, totalFilteredCount)}
              </strong>{" "}
              {" "}of{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {totalFilteredCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </strong>{" "}
              transactions
            </span>

            <div className="flex items-center gap-1.5">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPageSize(newSize);
                  handlePageChange(1);
                }}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white font-semibold cursor-pointer focus:outline-none focus:border-emerald-500"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page number pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - page) <= 1) return true;
                  return false;
                })
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof p === "number" && typeof arr[idx - 1] === "number" && p - (arr[idx - 1] as number) > 1) {
                    acc.push(`dots-${p}`);
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item) => {
                  if (typeof item === "string") {
                    return (
                      <span key={item} className="px-1 text-xs text-slate-400">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handlePageChange(item)}
                      className={`min-w-8 h-8 px-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                        page === item
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Next Page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. DETAIL TRANSACTION MODAL / DRAWER */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border-t sm:border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto">
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Transaction Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Big Hero Amount Badge */}
            <div
              className={`p-5 rounded-2xl text-center space-y-1 ${
                selectedTxForDetail.type === "TRANSFER"
                  ? "bg-indigo-50/70 border border-indigo-200/60 dark:bg-indigo-500/10 dark:border-indigo-500/20"
                  : selectedTxForDetail.type === "EXPENSE"
                  ? "bg-rose-50/70 border border-rose-200/60 dark:bg-rose-500/10 dark:border-rose-500/20"
                  : "bg-emerald-50/70 border border-emerald-200/60 dark:bg-emerald-500/10 dark:border-emerald-500/20"
              }`}
            >
              <div className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                {selectedTxForDetail.type === "TRANSFER"
                  ? "Transfer / Asset Allocation"
                  : selectedTxForDetail.type === "EXPENSE"
                  ? "Expense"
                  : "Income"}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  selectedTxForDetail.type === "TRANSFER"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : selectedTxForDetail.type === "EXPENSE"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {hideAmount
                  ? "••••••••"
                  : `${selectedTxForDetail.type === "TRANSFER" ? "" : selectedTxForDetail.type === "EXPENSE" ? "-" : "+"} ${formatRupiah(
                      selectedTxForDetail.amount
                    )}`}
              </div>
              <button
                type="button"
                onClick={() => handleCopyAmount(selectedTxForDetail.amount)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer pt-1"
              >
                {copiedAmount ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Amount Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Numeric Amount</span>
                  </>
                )}
              </button>
            </div>

            {/* Grid of details */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 space-y-2.5">
                {/* Tanggal & Jam */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Transaction Time
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {formatDate(selectedTxForDetail.transactionDate)}
                  </span>
                </div>

                {/* Kategori */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Category
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-semibold tracking-wide rounded-md border ${
                      selectedTxForDetail.type === "TRANSFER"
                        ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                        : getCategoryColor(selectedTxForDetail.categoryName)
                    }`}
                  >
                    {selectedTxForDetail.type === "TRANSFER" ? "Transfer / Investment" : selectedTxForDetail.categoryName}
                  </span>
                </div>

                {/* Dompet / Source Account */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" />
                    {selectedTxForDetail.type === "TRANSFER" ? "From Account" : "Account / Wallet"}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedTxForDetail.accountName}
                  </span>
                </div>

                {/* Destination Account (if transfer) */}
                {selectedTxForDetail.type === "TRANSFER" && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
                      To Destination Account
                    </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {selectedTxForDetail.transferToAccountName || "Destination Account"}
                    </span>
                  </div>
                )}

                {/* Payment Method */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Payment Method
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                    {selectedTxForDetail.paymentType || "CASH"}
                  </span>
                </div>

                {/* Payee / Toko */}
                {selectedTxForDetail.payee && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Payee / Merchant</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedTxForDetail.payee}
                    </span>
                  </div>
                )}
              </div>

              {/* Catatan / Keterangan Utuh */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Full Note / Description:</span>
                  {selectedTxForDetail.note && (
                    <button
                      type="button"
                      onClick={() => handleCopyNote(selectedTxForDetail.note || "")}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      {copiedNote ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Note</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">
                  {selectedTxForDetail.note || "No note provided for this transaction."}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to permanently delete this transaction?")) {
                    handleDeleteTransaction(selectedTxForDetail.id);
                    setSelectedTxForDetail(null);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Transaction</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const txToEdit = selectedTxForDetail;
                    setSelectedTxForDetail(null);
                    onEditTransaction(txToEdit);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Transaction</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTxForDetail(null)}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
