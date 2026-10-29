"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Sun,
  Moon,
  Eye,
  EyeOff,
} from "lucide-react";

interface InitialData {
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
  transactions: Array<{
    id: number;
    amount: number;
    type: string;
    paymentType: string | null;
    note: string | null;
    payee: string | null;
    transactionDate: string;
    accountName: string;
    categoryName: string;
  }>;
}

type ThemeMode = "dark" | "light";

export default function DashboardClient({ initialData }: { initialData: InitialData }) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialData.transactions);
  const [stats, setStats] = useState(initialData.stats);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Privacy: Hide Amount of cash
  const [hideAmount, setHideAmount] = useState(false);

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

    const savedHide = localStorage.getItem("cybank_hide_amount") === "true";
    setHideAmount(savedHide);
  }, []);

  const toggleHideAmount = () => {
    setHideAmount((prev) => {
      const next = !prev;
      localStorage.setItem("cybank_hide_amount", String(next));
      return next;
    });
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("cybank_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
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

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        search === "" ||
        (tx.note && tx.note.toLowerCase().includes(search.toLowerCase())) ||
        (tx.payee && tx.payee.toLowerCase().includes(search.toLowerCase())) ||
        tx.categoryName.toLowerCase().includes(search.toLowerCase());

      const matchType = selectedType === "ALL" || tx.type === selectedType;
      const matchCategory = selectedCategory === "ALL" || tx.categoryName === selectedCategory;

      return matchSearch && matchType && matchCategory;
    });
  }, [transactions, search, selectedType, selectedCategory]);

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
        const newTx = {
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
        setTransactions([newTx, ...transactions]);

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

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Privacy: Hide Amount of Cash Button */}
            <button
              onClick={toggleHideAmount}
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition"
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
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title={theme === "dark" ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
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
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              title="Import file CSV riwayat"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>

            {/* Catat Transaksi Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Catat Transaksi</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 transition"
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
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full mt-1.5 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Balance */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-linear-to-br dark:from-slate-900 dark:to-slate-900/60 dark:border-slate-800 shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Saldo Kas
                </span>
                <button
                  onClick={toggleHideAmount}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title={hideAmount ? "Tampilkan Saldo Kas" : "Sembunyikan Saldo Kas"}
                >
                  {hideAmount ? (
                    <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {hideAmount ? "Rp ••••••••" : formatRupiah(stats.totalBalance)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              Akun: {initialData.accounts[0]?.name || "My Cash"}
            </p>
          </div>

          {/* Monthly Expense */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-linear-to-br dark:from-slate-900 dark:to-slate-900/60 dark:border-slate-800 shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pengeluaran Bulan Ini
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {hideAmount ? "Rp ••••••••" : formatRupiah(stats.monthlyExpense)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              Bulan berjalan
            </p>
          </div>

          {/* Monthly Income */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-linear-to-br dark:from-slate-900 dark:to-slate-900/60 dark:border-slate-800 shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pemasukan Bulan Ini
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {hideAmount ? "Rp ••••••••" : formatRupiah(stats.monthlyIncome)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              Gaji & Kas Masuk
            </p>
          </div>

          {/* Total Transactions */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-linear-to-br dark:from-slate-900 dark:to-slate-900/60 dark:border-slate-800 shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Riwayat Transaksi
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.totalTxCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Termasuk import riwayat Wallet</p>
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

        {/* Transactions Section */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm space-y-6 transition">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Mutasi & Riwayat Transaksi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Menampilkan {filteredTransactions.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} dari total {stats.totalTxCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} transaksi
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-50 flex-1 sm:flex-initial">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari catatan / payee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Type Filter Buttons */}
              <div className="flex rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setSelectedType("ALL")}
                  className={`px-3 py-1 rounded-lg transition ${
                    selectedType === "ALL"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setSelectedType("EXPENSE")}
                  className={`px-3 py-1 rounded-lg transition ${
                    selectedType === "EXPENSE"
                      ? "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  onClick={() => setSelectedType("INCOME")}
                  className={`px-3 py-1 rounded-lg transition ${
                    selectedType === "INCOME"
                      ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
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
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="ALL">Semua Kategori ({initialData.categories.length})</option>
                {initialData.categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                Tidak ada transaksi yang cocok dengan filter pencarian.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
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
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition"
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
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
                  className={`py-2 text-xs font-semibold rounded-xl transition ${
                    txType === "EXPENSE"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("INCOME")}
                  className={`py-2 text-xs font-semibold rounded-xl transition ${
                    txType === "INCOME"
                      ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount with Dot Separator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nominal (Rp)
                  </label>
                  {amount && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Rp {amount}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 25.000"
                  required
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (!raw) {
                      setAmount("");
                    } else {
                      const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                      setAmount(formatted);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 text-base tracking-wide"
                />
              </div>

              {/* Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Akun / Dompet
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm"
                >
                  {initialData.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency}) — Saldo: {formatRupiah(a.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {initialData.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Makan siang mie ayam"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal & Jam
                </label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-98 disabled:opacity-50 text-sm shadow-md shadow-emerald-500/20"
                >
                  {isLoading ? "Menyimpan..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Import CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Import File CSV</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportCsv} className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Pilih file export CSV dari aplikasi Wallet (BudgetBakers) atau Cybank untuk memproses
                transaksi ke akun Anda.
              </p>

              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-950/50">
                <Upload className="w-8 h-8 mx-auto text-emerald-500 dark:text-emerald-400 mb-2" />
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200 hover:file:bg-slate-300 dark:hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !csvFile}
                  className="w-full py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-98 disabled:opacity-50 text-sm shadow-md shadow-emerald-500/20"
                >
                  {isLoading ? "Mengimpor Data..." : "Upload & Proses CSV"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Logout */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 mx-auto flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Konfirmasi Keluar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Apakah Anda yakin ingin keluar dari akun{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {initialData.user.name}
                </span>
                ?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition active:scale-95 cursor-pointer"
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
