"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  PlusCircle,
  Upload,
  Search,
  CreditCard,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Clock,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Calendar,
  Filter,
  BarChart3,
  ListFilter,
  LayoutDashboard,
  Layers,
  Sparkles,
  RotateCcw,
  Receipt,
  ArrowUpDown,
} from "lucide-react";
import CashflowCharts from "@/components/CashflowCharts";

export interface TransactionItem {
  id: number;
  amount: number;
  type: string;
  paymentType: string | null;
  note: string | null;
  payee: string | null;
  transactionDate: string;
  accountName: string;
  categoryName: string;
}

export interface InitialData {
  user: {
    id: number;
    name: string;
    email: string;
  };
  stats: {
    totalBalance: number;
    monthlyExpense: number;
    monthlyIncome: number;
    netSavings: number;
    totalTxCount: number;
    topCategories: Array<{ name: string; total: number }>;
  };
  accounts: Array<{
    id: number;
    name: string;
    currency: string;
    type: string;
    balance: number;
  }>;
  categories: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  transactions: TransactionItem[];
}

export type DateFilterMode = "ALL" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "RANGE";
export type ViewMode = "dashboard" | "full";

export default function DashboardClient({
  initialData,
  initialHideAmount = false,
}: {
  initialData: InitialData;
  initialHideAmount?: boolean;
}) {
  const router = useRouter();

  // SPA View Mode: Dashboard (Overview + 10 rows + show more) vs Full (Dedicated transaction ledger)
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");

  // Transactions state
  const [transactions, setTransactions] = useState<TransactionItem[]>(initialData.transactions);
  const [stats, setStats] = useState(initialData.stats);
  const [totalFilteredCount, setTotalFilteredCount] = useState<number>(initialData.stats.totalTxCount);
  const [periodSummary, setPeriodSummary] = useState<{
    totalExpense: number;
    totalIncome: number;
    net: number;
  }>({
    totalExpense: initialData.stats.monthlyExpense,
    totalIncome: initialData.stats.monthlyIncome,
    net: initialData.stats.netSavings,
  });

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | "EXPENSE" | "INCOME" | "TRANSFER">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedAccount, setSelectedAccount] = useState<string>("ALL");

  // Date Filter states
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("ALL");

  // Preset helpers for current date
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const curYearStr = String(now.getFullYear());

  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(curMonthStr);
  const [selectedYear, setSelectedYear] = useState(curYearStr);
  const [customStartDate, setCustomStartDate] = useState(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  // Pagination & Display limits (SPA)
  const [displayLimit, setDisplayLimit] = useState(10); // Dashboard starts with 10 rows
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFetchingFilter, setIsFetchingFilter] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Privacy: Hide Amount of cash
  const [hideAmount, setHideAmount] = useState(initialHideAmount);

  // User menu dropdown state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states for Add Transaction
  const [amount, setAmount] = useState("");
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [accountId, setAccountId] = useState(String(initialData.accounts[0]?.id || ""));
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));

  // CSV file state
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Track if initial render has mounted
  const [hasMounted, setHasMounted] = useState(false);

  // Initialize theme & privacy from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("cybank_theme");
    const isDark = savedTheme
      ? savedTheme === "dark" || (savedTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      : document.documentElement.classList.contains("dark");
    const currentTheme = isDark ? "dark" : "light";
    setTheme(currentTheme);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const savedHideStr = localStorage.getItem("cybank_hide_amount");
    if (savedHideStr !== null) {
      const savedHide = savedHideStr === "true";
      setHideAmount(savedHide);
      try {
        document.cookie = `cybank_hide_amount=${savedHide}; path=/; max-age=31536000; SameSite=Lax`;
      } catch (_) {}
    } else if (initialHideAmount) {
      try {
        localStorage.setItem("cybank_hide_amount", "true");
      } catch (_) {}
    }

    setHasMounted(true);
  }, [initialHideAmount]);

  const toggleHideAmount = () => {
    setHideAmount((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cybank_hide_amount", String(next));
        document.cookie = `cybank_hide_amount=${next}; path=/; max-age=31536000; SameSite=Lax`;
      } catch (_) {}
      return next;
    });
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const isCurrentlyDark = root.classList.contains("dark");
    const nextTheme = isCurrentlyDark ? "light" : "dark";

    if (nextTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    setTheme(nextTheme);
    try {
      localStorage.setItem("cybank_theme", nextTheme);
    } catch (_) {}
  };

  const getAuthHeader = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("cybank_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const formatRupiah = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.round(Math.abs(val));
    const parts = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${isNegative ? "-" : ""}Rp ${parts}`;
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("food") || lower.includes("drink") || lower.includes("makan") || lower.includes("restoran")) {
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
    }
    if (lower.includes("shop") || lower.includes("belanja") || lower.includes("clothes") || lower.includes("baju")) {
      return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
    }
    if (lower.includes("transport") || lower.includes("ojek") || lower.includes("bensin") || lower.includes("gojek")) {
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20";
    }
    if (lower.includes("income") || lower.includes("gaji") || lower.includes("invest")) {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    }
    if (lower.includes("soft") || lower.includes("app") || lower.includes("game") || lower.includes("internet")) {
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20";
    }
    if (lower.includes("fee") || lower.includes("admin") || lower.includes("charge")) {
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
    }
    if (lower.includes("wellness") || lower.includes("beauty") || lower.includes("health")) {
      return "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20";
    }
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  // Calculate start and end date query strings based on current dateFilterMode
  const getDateRangeQuery = useCallback(() => {
    let start = "";
    let end = "";

    if (dateFilterMode === "DAILY") {
      start = selectedDay;
      end = selectedDay;
    } else if (dateFilterMode === "WEEKLY") {
      const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      start = sevenDaysAgo.toISOString().slice(0, 10);
      end = todayStr;
    } else if (dateFilterMode === "MONTHLY") {
      const [y, m] = selectedMonth.split("-").map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      start = `${selectedMonth}-01`;
      end = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;
    } else if (dateFilterMode === "YEARLY") {
      start = `${selectedYear}-01-01`;
      end = `${selectedYear}-12-31`;
    } else if (dateFilterMode === "RANGE") {
      start = customStartDate;
      end = customEndDate;
    }

    return { start, end };
  }, [dateFilterMode, selectedDay, selectedMonth, selectedYear, customStartDate, customEndDate, todayStr]);

  // Master fetch function for SPA data retrieval
  const fetchFilteredTransactions = useCallback(
    async (targetLimit: number, targetPage: number, append: boolean = false) => {
      if (!append) {
        setIsFetchingFilter(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const { start, end } = getDateRangeQuery();
        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        params.set("limit", String(targetLimit));

        if (start) params.set("startDate", start);
        if (end) params.set("endDate", end);
        if (selectedType !== "ALL") params.set("type", selectedType);
        if (selectedCategory !== "ALL") {
          const catObj = initialData.categories.find((c) => c.name === selectedCategory);
          if (catObj) params.set("categoryId", String(catObj.id));
        }
        if (selectedAccount !== "ALL") {
          const accObj = initialData.accounts.find((a) => a.name === selectedAccount);
          if (accObj) params.set("accountId", String(accObj.id));
        }
        if (search.trim()) {
          params.set("search", search.trim());
        }

        const res = await fetch(`/api/v1/transactions?${params.toString()}`, {
          headers: getAuthHeader(),
          credentials: "include",
        });

        const json = await res.json();
        if (json.success) {
          const formatted: TransactionItem[] = json.data.map((tx: any) => ({
            id: tx.id,
            amount: Number(tx.amount),
            type: tx.type,
            paymentType: tx.paymentType,
            note: tx.note,
            payee: tx.payee,
            transactionDate: tx.transactionDate,
            accountName: tx.account?.name || "Cash",
            categoryName: tx.category?.name || "General",
          }));

          if (append) {
            setTransactions((prev) => [...prev, ...formatted]);
          } else {
            setTransactions(formatted);
          }

          if (json.pagination) {
            setTotalFilteredCount(json.pagination.total);
          }
          if (json.summary) {
            setPeriodSummary(json.summary);
          }
        }
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        setIsFetchingFilter(false);
        setIsLoadingMore(false);
      }
    },
    [getDateRangeQuery, selectedType, selectedCategory, selectedAccount, search, initialData.categories, initialData.accounts]
  );

  // Trigger fetch whenever filter criteria changes
  useEffect(() => {
    if (!hasMounted) return;
    const timeout = setTimeout(() => {
      if (viewMode === "dashboard") {
        setDisplayLimit(10);
        fetchFilteredTransactions(10, 1, false);
      } else {
        setPage(1);
        fetchFilteredTransactions(pageSize, 1, false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    dateFilterMode,
    selectedDay,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
    selectedType,
    selectedCategory,
    selectedAccount,
    search,
    viewMode,
    pageSize,
    hasMounted,
    fetchFilteredTransactions,
  ]);

  // Handle "Show More" in Dashboard view
  const handleShowMoreDashboard = () => {
    const nextLimit = displayLimit + 10;
    setDisplayLimit(nextLimit);
    // Fetch with the increased limit to ensure rows beyond initial 10 are retrieved from DB
    fetchFilteredTransactions(nextLimit, 1, false);
  };

  // Handle Full view pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchFilteredTransactions(pageSize, newPage, false);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleResetFilters = () => {
    setDateFilterMode("ALL");
    setSearch("");
    setSelectedType("ALL");
    setSelectedCategory("ALL");
    setSelectedAccount("ALL");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      localStorage.removeItem("cybank_token");
      localStorage.removeItem("cybank_user");
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        credentials: "include",
        body: JSON.stringify({
          accountId,
          categoryId: categoryId || undefined,
          amount: parseFloat(amount.replace(/\./g, "")),
          type: txType,
          note,
          transactionDate: new Date(date).toISOString(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Transaksi baru berhasil disimpan!" });
        const newTx: TransactionItem = {
          id: json.data.id,
          amount: Number(json.data.amount),
          type: json.data.type,
          paymentType: json.data.paymentType,
          note: json.data.note,
          payee: json.data.payee,
          transactionDate: json.data.transactionDate,
          accountName: json.data.account?.name || "My Cash",
          categoryName: json.data.category?.name || "General",
        };
        setTransactions((prev) => [newTx, ...prev]);

        const delta = Number(json.data.amount);
        if (txType === "EXPENSE") {
          setStats((prev) => ({
            ...prev,
            totalBalance: prev.totalBalance - delta,
            monthlyExpense: prev.monthlyExpense + delta,
            totalTxCount: prev.totalTxCount + 1,
          }));
        } else if (txType === "INCOME") {
          setStats((prev) => ({
            ...prev,
            totalBalance: prev.totalBalance + delta,
            monthlyIncome: prev.monthlyIncome + delta,
            totalTxCount: prev.totalTxCount + 1,
          }));
        }

        setIsAddModalOpen(false);
        setAmount("");
        setNote("");
      } else {
        setMessage({ type: "error", text: json.message || "Gagal mencatat transaksi" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;

    try {
      const res = await fetch(`/api/v1/transactions?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
        credentials: "include",
      });

      const json = await res.json();
      if (json.success) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        setTotalFilteredCount((prev) => Math.max(0, prev - 1));
        setMessage({ type: "success", text: "Transaksi berhasil dihapus." });
      } else {
        setMessage({ type: "error", text: json.message || "Gagal menghapus transaksi." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch("/api/v1/import", {
        method: "POST",
        headers: getAuthHeader(),
        credentials: "include",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: `Berhasil mengimpor ${json.result.importedCount} transaksi! Me-refresh data...`,
        });
        setIsImportModalOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage({ type: "error", text: json.message || "Gagal mengimpor CSV" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which transactions to display based on viewMode
  const displayedTransactions = useMemo(() => {
    if (viewMode === "dashboard") {
      return transactions.slice(0, displayLimit);
    }
    return transactions;
  }, [transactions, displayLimit, viewMode]);

  const totalPages = Math.ceil(totalFilteredCount / pageSize);

  const isFilterActive =
    dateFilterMode !== "ALL" ||
    search !== "" ||
    selectedType !== "ALL" ||
    selectedCategory !== "ALL" ||
    selectedAccount !== "ALL";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans pb-16 transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                Cybank
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Personal Cashflow Ledger</p>
            </div>
          </div>

          {/* SPA Navigation Switcher */}
          <div className="hidden md:flex items-center rounded-2xl border border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-950/80 p-1 text-xs font-semibold shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("dashboard")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                viewMode === "dashboard"
                  ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Ringkasan & Grafik</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("full")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                viewMode === "full"
                  ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Mutasi Lengkap</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Privacy: Hide Amount of Cash Button */}
            <button
              onClick={toggleHideAmount}
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title={hideAmount ? "Tampilkan Nominal Kas" : "Sembunyikan Nominal Kas"}
            >
              {hideAmount ? (
                <EyeOff className="w-4 h-4 text-rose-500" />
              ) : (
                <Eye className="w-4 h-4 text-emerald-500" />
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition cursor-pointer select-none active:scale-95"
              title={theme === "dark" ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
              aria-label={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-500" />
              )}
            </button>

            {/* Import Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Import file CSV riwayat"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>

            {/* Catat Transaksi Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Catat Transaksi</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {initialData.user.name.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {initialData.user.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {initialData.user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full mt-1.5 flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Moon className="w-4 h-4 text-emerald-500" />
                      )}
                      <span>Mode {theme === "dark" ? "Terang" : "Gelap"}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {theme === "dark" ? "Light" : "Dark"}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile View Mode Tabs */}
        <div className="flex md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-2 gap-2 bg-slate-100/50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={() => setViewMode("dashboard")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-xl transition ${
              viewMode === "dashboard"
                ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Ringkasan</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("full")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-xl transition ${
              viewMode === "full"
                ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Mutasi Lengkap</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Alerts */}
        {message && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-300"
                : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/80 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-xs hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Mode: DASHBOARD VIEW */}
        {viewMode === "dashboard" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Balance */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Total Saldo Keseluruhan</span>
                  <Wallet className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {hideAmount ? "Rp •••••••••" : formatRupiah(stats.totalBalance)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Akumulasi {initialData.accounts.length} dompet & rekening aktif
                </p>
              </div>

              {/* Monthly Income */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Pemasukan Bulan Ini</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {hideAmount ? "Rp •••••••••" : formatRupiah(stats.monthlyIncome)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Periode bulan berjalan</p>
              </div>

              {/* Monthly Expense */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition">
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Pengeluaran Bulan Ini</span>
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {hideAmount ? "Rp •••••••••" : formatRupiah(stats.monthlyExpense)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Termasuk belanja & tagihan</p>
              </div>

              {/* Total Transactions Count */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Total Transaksi</span>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stats.totalTxCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Termasuk import riwayat Wallet</p>
              </div>
            </div>

            {/* FEATURE: GRAFIK & ANALISIS CASHFLOW (CHART) */}
            <CashflowCharts
              hideAmount={hideAmount}
              formatRupiah={formatRupiah}
            />

            {/* Accounts Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">
                  Daftar Rekening & Dompet
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {initialData.accounts.length} Akun Terdaftar
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {initialData.accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 transition group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {acc.type}
                      </span>
                      <CreditCard className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition" />
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {acc.name}
                    </div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {hideAmount ? "Rp ••••••" : formatRupiah(acc.balance)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Categories Breakdown */}
            {stats.topCategories.length > 0 && (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm space-y-4 transition">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                    PENGELUARAN TERBESAR BULAN INI
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Top Kategori</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {stats.topCategories.map((cat, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/70 dark:border-slate-800/80"
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                        {cat.name}
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {hideAmount ? "Rp •••••" : formatRupiah(cat.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* SECTION: MUTASI & RIWAYAT TRANSAKSI (USED IN BOTH DASHBOARD & FULL SPA VIEW) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm space-y-6 transition">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mutasi & Riwayat Transaksi
                </h2>
                {isFetchingFilter && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {viewMode === "dashboard" ? (
                  <>
                    Menampilkan <strong>{displayedTransactions.length}</strong> dari total{" "}
                    <strong>{totalFilteredCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</strong> transaksi
                    {isFilterActive && " (Difilter)"}
                  </>
                ) : (
                  <>
                    Halaman <strong>{page}</strong> dari <strong>{totalPages || 1}</strong> (Total{" "}
                    <strong>{totalFilteredCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</strong> transaksi)
                  </>
                )}
              </p>
            </div>

            {/* View Mode Toggle Button */}
            <div className="flex items-center gap-2">
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Reset semua filter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}

              {viewMode === "dashboard" ? (
                <button
                  type="button"
                  onClick={() => setViewMode("full")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Lihat Seluruh Mutasi (SPA)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setViewMode("dashboard")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Kembali ke Dashboard</span>
                </button>
              )}
            </div>
          </div>

          {/* PERIOD SUMMARY BANNER (ACTIVE WHEN FILTERED) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>
                Ringkasan Periode Ini:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div>
                <span className="text-slate-400 mr-1.5">Masuk:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {hideAmount ? "Rp •••••" : formatRupiah(periodSummary.totalIncome)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5">Keluar:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {hideAmount ? "Rp •••••" : formatRupiah(periodSummary.totalExpense)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5">Arus Bersih:</span>
                <span
                  className={`font-bold ${
                    periodSummary.net >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {hideAmount ? "Rp •••••" : formatRupiah(periodSummary.net)}
                </span>
              </div>
            </div>
          </div>

          {/* FILTER CONTROLS BAR: DATE FILTERS + SEARCH + TYPE + CATEGORY */}
          <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {/* ROW 1: Date Filter Tabs (Daily, Weekly, Monthly, Yearly, Date Range, All) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                Periode:
              </span>

              <div className="flex flex-wrap rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
                {[
                  { id: "ALL", label: "Semua" },
                  { id: "DAILY", label: "Harian" },
                  { id: "WEEKLY", label: "Mingguan" },
                  { id: "MONTHLY", label: "Bulanan" },
                  { id: "YEARLY", label: "Tahunan" },
                  { id: "RANGE", label: "Rentang Tanggal" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDateFilterMode(item.id as DateFilterMode)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      dateFilterMode === item.id
                        ? "bg-emerald-500 text-white shadow-sm font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Specific Date Selectors depending on selected dateFilterMode */}
              {dateFilterMode === "DAILY" && (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDay(todayStr)}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  >
                    Hari Ini
                  </button>
                </div>
              )}

              {dateFilterMode === "MONTHLY" && (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(curMonthStr)}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  >
                    Bulan Ini
                  </button>
                </div>
              )}

              {dateFilterMode === "YEARLY" && (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => (
                      <option key={y} value={String(y)}>
                        Tahun {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {dateFilterMode === "RANGE" && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>Dari:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2 py-1 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>Sampai:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2 py-1 text-xs rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ROW 2: Search, Type filter, Category filter, Account filter */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Text Search */}
              <div className="relative min-w-50 flex-1 sm:flex-initial">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari catatan, payee, nominal..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Type Filter Buttons */}
              <div className="flex rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedType("ALL")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    selectedType === "ALL"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("EXPENSE")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    selectedType === "EXPENSE"
                      ? "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("INCOME")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    selectedType === "INCOME"
                      ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
              >
                <option value="ALL">Semua Kategori ({initialData.categories.length})</option>
                {initialData.categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Account Dropdown */}
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
              >
                <option value="ALL">Semua Dompet & Akun ({initialData.accounts.length})</option>
                {initialData.accounts.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {displayedTransactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm space-y-2">
                <p>Tidak ada transaksi yang cocok dengan kriteria filter.</p>
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-emerald-500 hover:underline font-semibold"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              displayedTransactions.map((tx) => {
                const isExpense = tx.type === "EXPENSE";
                return (
                  <div
                    key={tx.id}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-3 rounded-2xl transition group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isExpense
                            ? "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        }`}
                      >
                        {isExpense ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {tx.note || tx.categoryName}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold tracking-wide rounded-md border shrink-0 ${getCategoryColor(
                              tx.categoryName
                            )}`}
                          >
                            {tx.categoryName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{formatDate(tx.transactionDate)}</span>
                          <span>•</span>
                          <span>{tx.accountName}</span>
                          {tx.payee && (
                            <>
                              <span>•</span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {tx.payee}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${
                            isExpense
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {hideAmount
                            ? "••••••••"
                            : `${isExpense ? "-" : "+"} ${formatRupiah(tx.amount)}`}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">
                          {tx.paymentType || "CASH"}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DASHBOARD VIEW: "SHOW MORE" BUTTON & EXPANSION CONTROL */}
          {viewMode === "dashboard" && totalFilteredCount > 10 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan <strong>{displayedTransactions.length}</strong> dari total{" "}
                <strong>{totalFilteredCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</strong> transaksi
              </span>

              <div className="flex items-center gap-2">
                {displayedTransactions.length < totalFilteredCount ? (
                  <button
                    type="button"
                    onClick={handleShowMoreDashboard}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <span className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                        <span>Memuat...</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-emerald-500" />
                        <span>Tampilkan Lebih Banyak (+10 Row)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    Semua transaksi telah dimuat
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setViewMode("full")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition cursor-pointer active:scale-95"
                >
                  <span>Buka Mode Riwayat Penuh</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* FULL VIEW: PAGINATION & PAGE SIZE CONTROLS (SPA) */}
          {viewMode === "full" && totalFilteredCount > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Page size selector */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-white font-medium"
                >
                  <option value={10}>10 per halaman</option>
                  <option value={25}>25 per halaman</option>
                  <option value={50}>50 per halaman</option>
                  <option value={100}>100 per halaman</option>
                </select>
                <span>dari total {totalFilteredCount} baris</span>
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>

                {/* Page number pill */}
                <div className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {page} / {totalPages || 1}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: Catat Transaksi */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Catat Transaksi Baru
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTxType("EXPENSE")}
                  className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    txType === "EXPENSE"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("INCOME")}
                  className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    txType === "INCOME"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Nominal (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="0"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAmount(val ? parseInt(val).toLocaleString("id-ID") : "");
                    }}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Account Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Dompet / Rekening
                </label>
                <select
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {initialData.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatRupiah(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Kategori
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Pilih Kategori (Opsional)</option>
                  {initialData.categories
                    .filter((c) => c.type === txType)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Note / Payee */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="cth: Makan siang Padang, Beli kopi..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Tanggal Transaksi
                </label>
                <input
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50 mt-2"
              >
                {isLoading ? "Menyimpan Transaksi..." : "Simpan Transaksi"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Import CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Import Transaksi dari CSV
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dukung file ekspor dari <strong>Wallet App (Budgetbakers)</strong> atau format CSV standar
              Cybank.
            </p>

            <form onSubmit={handleImportCsv} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-emerald-500/50 transition">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2"
                >
                  <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {csvFile ? csvFile.name : "Klik untuk memilih file .csv"}
                  </span>
                  <span className="text-[11px] text-slate-400">Maksimal 5MB</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!csvFile || isLoading}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isLoading ? "Mengimpor Data..." : "Mulai Import CSV"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Logout Confirmation */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Keluar dari Akun?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sesi Anda akan diakhiri dan dialihkan ke halaman login.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
