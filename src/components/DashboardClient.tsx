"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, clearSession } from "@/lib/api";
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
  Edit3,
  SlidersHorizontal,
  Target,
  Building2,
  Smartphone,
  ArrowLeftRight,
  Tag,
} from "lucide-react";
import CashflowCharts from "@/components/CashflowCharts";
import TransactionHistorySection, { DateFilterMode } from "@/components/TransactionHistorySection";
import RecountBalanceModal, { AccountItem } from "@/components/RecountBalanceModal";
import EditTransactionModal from "@/components/EditTransactionModal";
import CategorySelector from "@/components/CategorySelector";
import { CustomNumericKeypad } from "@/components/CustomNumericKeypad";
import { getLocalDateTimeString } from "@/lib/date";
import { buildCategorySelectGroups, createCategoryBadgeColorResolver } from "@/lib/categories";

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
    icon?: string | null;
    color?: string | null;
    parent_id?: number | null;
    parent_name?: string | null;
  }>;
  transactions: TransactionItem[];
}

export type { DateFilterMode };
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
  const [accounts, setAccounts] = useState<AccountItem[]>(initialData.accounts);
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

  // Date Filter states (default to DAILY)
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("DAILY");

  // Preset helpers for current date (local timezone)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const curYearStr = String(now.getFullYear());

  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [selectedWeek, setSelectedWeek] = useState<string>("LAST_7_DAYS");
  const [selectedMonth, setSelectedMonth] = useState(curMonthStr);
  const [selectedYear, setSelectedYear] = useState(curYearStr);
  const [customStartDate, setCustomStartDate] = useState(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  // Pagination (SPA)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFetchingFilter, setIsFetchingFilter] = useState(false);

  // Sorting state for transactions
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<string>("desc");

  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Privacy: Hide Amount of cash
  const [hideAmount, setHideAmount] = useState(initialHideAmount);

  // User menu dropdown state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Modals state
  const mobileAmountInputRef = useRef<HTMLInputElement>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isRecountModalOpen, setIsRecountModalOpen] = useState(false);
  const [recountAccountId, setRecountAccountId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // The charts own their own analytics query, so every mutation bumps this key
  // to make them re-fetch instead of waiting for a full page reload.
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  const bumpChartRefresh = useCallback(() => setChartRefreshKey((key) => key + 1), []);

  const handleOpenRecount = (accId?: number) => {
    setRecountAccountId(accId ?? null);
    setIsRecountModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setDate(getLocalDateTimeString());
    setIsAddModalOpen(true);
  };

  // Form states for Add Transaction
  const [amount, setAmount] = useState("");
  const [isNumericKeypadOpen, setIsNumericKeypadOpen] = useState(false);
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [accountId, setAccountId] = useState(String(initialData.accounts[0]?.id || ""));
  const [transferToAccountId, setTransferToAccountId] = useState(
    String(initialData.accounts[1]?.id || initialData.accounts[0]?.id || "")
  );
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getLocalDateTimeString);

  // CSV file state
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Asset categorization breakdown
  const accountBreakdown = useMemo(() => {
    let liquid = 0;
    let investment = 0;
    let goal = 0;
    let credit = 0;

    accounts.forEach((a) => {
      const t = (a.type || "").toUpperCase();
      const bal = Number(a.balance) || 0;
      if (t === "INVESTMENT") {
        investment += bal;
      } else if (t === "GOAL" || t === "SAVING" || t === "SAVINGS") {
        goal += bal;
      } else if (t === "CREDIT_CARD" || t === "LOAN") {
        credit += bal;
      } else {
        liquid += bal;
      }
    });

    return {
      liquid,
      investment,
      goal,
      credit,
      total: liquid + investment + goal + credit,
    };
  }, [accounts]);

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

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", nextTheme === "dark" ? "#020617" : "#ffffff");
    }

    setTheme(nextTheme);
    try {
      localStorage.setItem("cybank_theme", nextTheme);
    } catch (_) {}
  };

  const formatRupiah = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.round(Math.abs(val));
    const parts = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${isNegative ? "-" : ""}Rp ${parts}`;
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Warna badge kategori: subkategori selalu mengikuti warna induknya,
  // termasuk warna kustom di luar palet preset.
  const categoryBadgeColors = useMemo(
    () => createCategoryBadgeColorResolver(initialData.categories),
    [initialData.categories]
  );

  const getCategoryColor = (category: {
    categoryId?: number | null;
    categoryName?: string | null;
  }) => categoryBadgeColors.tone(category);

  // Calculate start and end date query strings based on current dateFilterMode
  const getDateRangeQuery = useCallback(() => {
    let start = "";
    let end = "";

    if (dateFilterMode === "DAILY") {
      start = selectedDay;
      end = selectedDay;
    } else if (dateFilterMode === "WEEKLY") {
      if (selectedWeek === "LAST_7_DAYS") {
        const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        start = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysAgo.getDate()).padStart(2, "0")}`;
        end = todayStr;
      } else {
        const [y, m] = (selectedMonth || curMonthStr).split("-").map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const ymStr = `${y}-${String(m).padStart(2, "0")}`;

        if (selectedWeek === "W1") {
          start = `${ymStr}-01`;
          end = `${ymStr}-07`;
        } else if (selectedWeek === "W2") {
          start = `${ymStr}-08`;
          end = `${ymStr}-14`;
        } else if (selectedWeek === "W3") {
          start = `${ymStr}-15`;
          end = `${ymStr}-21`;
        } else if (selectedWeek === "W4") {
          start = `${ymStr}-22`;
          end = `${ymStr}-28`;
        } else if (selectedWeek === "W5") {
          start = `${ymStr}-29`;
          end = `${ymStr}-${String(daysInMonth).padStart(2, "0")}`;
        } else {
          start = `${ymStr}-01`;
          end = `${ymStr}-07`;
        }
      }
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
  }, [dateFilterMode, selectedDay, selectedWeek, selectedMonth, selectedYear, customStartDate, customEndDate, todayStr, curMonthStr]);

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
          const accObj = accounts.find((a) => a.name === selectedAccount);
          if (accObj) params.set("accountId", String(accObj.id));
        }
        if (search.trim()) {
          params.set("search", search.trim());
        }
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);

        const res = await apiFetch(`/api/v1/transactions?${params.toString()}`);

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
            accountId: tx.account?.id || tx.accountId || (accounts.find((a) => a.name === (tx.account?.name || tx.accountName))?.id),
            accountName: tx.account?.name || tx.accountName || "Cash",
            categoryId: tx.category?.id || tx.categoryId || (initialData.categories.find((c) => c.name === (tx.category?.name || tx.categoryName))?.id) || null,
            transferToAccountId: tx.transferToAccountId || tx.transferToAccount?.id || null,
            transferToAccountName: tx.transferToAccountName || tx.transferToAccount?.name || null,
            categoryName: tx.category?.name || tx.categoryName || "General",
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
    [getDateRangeQuery, selectedType, selectedCategory, selectedAccount, search, sortBy, sortOrder, initialData.categories, accounts]
  );

  // Trigger fetch whenever filter criteria changes
  useEffect(() => {
    if (!hasMounted) return;
    const timeout = setTimeout(() => {
      setPage(1);
      fetchFilteredTransactions(pageSize, 1, false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    dateFilterMode,
    selectedDay,
    selectedWeek,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
    selectedType,
    selectedCategory,
    selectedAccount,
    search,
    sortBy,
    sortOrder,
    pageSize,
    hasMounted,
    fetchFilteredTransactions,
  ]);

  // Handle pagination page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchFilteredTransactions(pageSize, newPage, false);
  };

  const handleRecountSuccess = (updatedAccounts: AccountItem[], newTotalBalance: number) => {
    setAccounts(updatedAccounts);
    setStats((prev) => ({
      ...prev,
      totalBalance: newTotalBalance,
    }));
    setMessage({
      type: "success",
      text: `Balance successfully adjusted! Current total balance: ${formatRupiah(newTotalBalance)}`,
    });
    fetchFilteredTransactions(pageSize, 1, false);
    bumpChartRefresh();
    router.refresh();
  };

  const handleUpdateTransactionSuccess = (
    updatedTx: TransactionItem,
    updatedAccounts?: AccountItem[],
    newTotalBalance?: number
  ) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );

    if (updatedAccounts) {
      setAccounts(updatedAccounts);
    }
    if (newTotalBalance !== undefined) {
      setStats((prev) => ({
        ...prev,
        totalBalance: newTotalBalance,
      }));
    }

    setMessage({
      type: "success",
      text: "Transaction updated successfully!",
    });

    fetchFilteredTransactions(pageSize, page, false);
    bumpChartRefresh();
  };

  const handleResetFilters = () => {
    setDateFilterMode("DAILY");
    setSelectedDay(todayStr);
    setSelectedWeek("LAST_7_DAYS");
    setSelectedMonth(curMonthStr);
    setSelectedYear(curYearStr);
    setSearch("");
    setSelectedType("ALL");
    setSelectedCategory("ALL");
    setSelectedAccount("ALL");
    setSortBy("date");
    setSortOrder("desc");
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
      clearSession();
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;

    if (txType === "TRANSFER" && (!transferToAccountId || transferToAccountId === accountId)) {
      setMessage({ type: "error", text: "Select a different destination account for the transfer." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const parsedAmount = parseFloat(amount.replace(/\./g, ""));
      const res = await apiFetch("/api/v1/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          transferToAccountId: txType === "TRANSFER" ? transferToAccountId : undefined,
          categoryId: categoryId || undefined,
          amount: parsedAmount,
          type: txType,
          note,
          transactionDate: new Date(date).toISOString(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "New transaction saved successfully!" });
        const fromAccount = accounts.find((a) => String(a.id) === String(accountId));
        const toAccount = accounts.find((a) => String(a.id) === String(transferToAccountId));

        const newTx: TransactionItem = {
          id: json.data?.id || Date.now(),
          amount: Number(json.data?.amount || parsedAmount),
          type: txType,
          paymentType: json.data?.paymentType || (txType === "TRANSFER" ? "TRANSFER" : "CASH"),
          note: note || (txType === "TRANSFER" ? `Transfer to ${toAccount?.name || "Account"}` : ""),
          payee: json.data?.payee || (txType === "TRANSFER" ? toAccount?.name : ""),
          transactionDate: new Date(date).toISOString(),
          accountId: parseInt(accountId),
          accountName: fromAccount?.name || "My Cash",
          categoryId: categoryId ? parseInt(categoryId) : undefined,
          transferToAccountId: txType === "TRANSFER" ? parseInt(transferToAccountId) : undefined,
          transferToAccountName: txType === "TRANSFER" ? toAccount?.name : undefined,
          categoryName: initialData.categories.find((c) => String(c.id) === categoryId)?.name || (txType === "TRANSFER" ? "Transfer" : "General"),
        };
        setTransactions((prev) => [newTx, ...prev]);

        const delta = parsedAmount;
        if (txType === "EXPENSE") {
          setStats((prev) => ({
            ...prev,
            totalBalance: prev.totalBalance - delta,
            monthlyExpense: prev.monthlyExpense + delta,
            totalTxCount: prev.totalTxCount + 1,
          }));
          setAccounts((prev) =>
            prev.map((acc) =>
              String(acc.id) === String(accountId) ? { ...acc, balance: acc.balance - delta } : acc
            )
          );
        } else if (txType === "INCOME") {
          setStats((prev) => ({
            ...prev,
            totalBalance: prev.totalBalance + delta,
            monthlyIncome: prev.monthlyIncome + delta,
            totalTxCount: prev.totalTxCount + 1,
          }));
          setAccounts((prev) =>
            prev.map((acc) =>
              String(acc.id) === String(accountId) ? { ...acc, balance: acc.balance + delta } : acc
            )
          );
        } else if (txType === "TRANSFER") {
          setStats((prev) => ({
            ...prev,
            totalTxCount: prev.totalTxCount + 1,
          }));
          setAccounts((prev) =>
            prev.map((acc) => {
              if (String(acc.id) === String(accountId)) {
                return { ...acc, balance: acc.balance - delta };
              }
              if (String(acc.id) === String(transferToAccountId)) {
                return { ...acc, balance: acc.balance + delta };
              }
              return acc;
            })
          );
        }

        setIsAddModalOpen(false);
        setAmount("");
        setNote("");
        setDate(getLocalDateTimeString());
        bumpChartRefresh();
      } else {
        setMessage({ type: "error", text: json.message || "Failed to record transaction" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const res = await apiFetch(`/api/v1/transactions?id=${id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.success) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        setTotalFilteredCount((prev) => Math.max(0, prev - 1));
        bumpChartRefresh();
        setMessage({ type: "success", text: "Transaction deleted successfully." });
      } else {
        setMessage({ type: "error", text: json.message || "Failed to delete transaction." });
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

      const res = await apiFetch("/api/v1/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: `Successfully imported ${json.result.importedCount} transactions! Refreshing data...`,
        });
        setIsImportModalOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage({ type: "error", text: json.message || "Failed to import CSV" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which transactions to display based on viewMode
  const displayedTransactions = transactions;

  const totalPages = Math.ceil(totalFilteredCount / pageSize);

  const isFilterActive =
    dateFilterMode !== "DAILY" ||
    selectedDay !== todayStr ||
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
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400">Personal Cashflow Ledger</p>
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
              <span>Overview & Charts</span>
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
              <span>Full Ledger</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Privacy: Hide Amount of Cash Button */}
            <button
              onClick={toggleHideAmount}
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title={hideAmount ? "Show Cash Amounts" : "Hide Cash Amounts"}
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
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-500" />
              )}
            </button>

            {/* Categories Button */}
            <Link
              href="/categories"
              className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Manage Categories"
            >
              <Tag className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Categories</span>
            </Link>

            {/* Import Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Import historical CSV"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="hidden md:inline">Import CSV</span>
            </button>

            {/* Catat Transaksi Button (Desktop) */}
            <button
              onClick={handleOpenAddModal}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
              title="Record New Transaction"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Transaction</span>
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
                      <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {theme === "dark" ? "Light" : "Dark"}
                    </span>
                  </button>
                  <Link
                    href="/categories"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    <Tag className="w-4 h-4 text-emerald-500" />
                    <span>Manage Categories</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 pb-28 md:pb-16">
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
            {/* MOBILE ONLY: FAST TRANSACTION ENTRY & COMPACT BALANCE */}
            <div className="md:hidden space-y-4">
              {/* Compact Balance Summary */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Total Saldo
                      </p>
                      <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {hideAmount ? "Rp •••••••••" : formatRupiah(stats.totalBalance)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenRecount()}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer active:scale-95 transition"
                  >
                    <span>Adjust</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-slate-400 text-[11px]">In:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                      {hideAmount ? "Rp •••" : formatRupiah(stats.monthlyIncome)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-slate-400 text-[11px]">Out:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400 truncate">
                      {hideAmount ? "Rp •••" : formatRupiah(stats.monthlyExpense)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast Transaction Input Card */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Input Transaksi Cepat
                    </h2>
                  </div>
                  <span className="text-[10px] text-slate-400">Mobile Fast Entry</span>
                </div>

                <form onSubmit={handleAddTransaction} className="space-y-3">
                  {/* Type Switcher */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTxType("EXPENSE")}
                      className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                        txType === "EXPENSE"
                          ? "bg-rose-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType("INCOME")}
                      className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                        txType === "INCOME"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                      }`}
                    >
                      Income
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType("TRANSFER")}
                      className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                        txType === "TRANSFER"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                      }`}
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>Transfer</span>
                    </button>
                  </div>

                  {/* Nominal Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Nominal (IDR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        ref={mobileAmountInputRef}
                        type="text"
                        readOnly
                        required
                        placeholder="0"
                        value={amount}
                        onClick={() => setIsNumericKeypadOpen(true)}
                        onFocus={(e) => {
                          e.target.blur();
                          setIsNumericKeypadOpen(true);
                        }}
                        className="w-full pl-11 pr-3 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xl focus:outline-none focus:border-emerald-500 transition cursor-pointer select-none"
                      />
                    </div>
                  </div>

                  {/* Account Selection */}
                  {txType === "TRANSFER" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Dari Akun
                        </label>
                        <select
                          required
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Ke Akun
                        </label>
                        <select
                          required
                          value={transferToAccountId}
                          onChange={(e) => setTransferToAccountId(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">Pilih Tujuan</option>
                          {accounts
                            .filter((acc) => String(acc.id) !== String(accountId))
                            .map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Akun / Dompet
                        </label>
                        <select
                          required
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Kategori
                        </label>
                        <CategorySelector
                          value={categoryId}
                          onChange={(val) => setCategoryId(val)}
                          categories={initialData.categories}
                          txType={txType}
                          placeholder="Pilih Kategori"
                          size="sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Note / Payee */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Catatan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Makan siang, bensin, dll."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !amount || !accountId}
                    className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                    <span>Simpan Transaksi</span>
                  </button>
                </form>
              </div>
            </div>

            {/* DESKTOP ONLY: REPORTING & ANALYTICS DASHBOARD */}
            <div className="hidden md:block space-y-6 sm:space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Balance */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition group">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Total Portfolio Balance</span>
                  <Wallet className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {hideAmount ? "Rp •••••••••" : formatRupiah(stats.totalBalance)}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span>Across {accounts.length} accounts & wallets</span>
                  <button
                    onClick={() => handleOpenRecount()}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Adjust</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Monthly Income */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>This Month's Income</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {hideAmount ? "Rp •••••••••" : formatRupiah(stats.monthlyIncome)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Current monthly period</p>
              </div>

              {/* Monthly Expense */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition">
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>This Month's Expense</span>
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {hideAmount ? "Rp •••••••••" : formatRupiah(stats.monthlyExpense)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Including bills & shopping</p>
              </div>

              {/* Total Transactions Count */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Total Transactions</span>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stats.totalTxCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Including imported Wallet history</p>
              </div>
            </div>

            {/* FEATURE: GRAFIK & ANALISIS CASHFLOW (CHART) */}
            <CashflowCharts
              hideAmount={hideAmount}
              formatRupiah={formatRupiah}
              refreshKey={chartRefreshKey}
            />

            {/* Accounts Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">
                    Wallets & Accounts
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({accounts.length} Accounts)
                  </span>
                </div>
                <button
                  onClick={() => handleOpenRecount()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Recount Balance</span>
                </button>
              </div>

              {/* Asset Allocation Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Liquid Cash & Bank
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {hideAmount ? "Rp ••••••" : formatRupiah(accountBreakdown.liquid)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                    Ready to Use
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Investment Portfolio
                      </span>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {hideAmount ? "Rp ••••••" : formatRupiah(accountBreakdown.investment)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-md">
                    Growing Assets
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Target Savings (Goals)
                      </span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {hideAmount ? "Rp ••••••" : formatRupiah(accountBreakdown.goal)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md">
                    Sinking Fund
                  </span>
                </div>
              </div>

              {/* Account Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {accounts.map((acc) => {
                  const accType = (acc.type || "").toUpperCase();
                  let badge = {
                    label: "Liquid Cash",
                    icon: <Wallet className="w-3 h-3" />,
                    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
                  };
                  if (accType === "INVESTMENT") {
                    badge = {
                      label: "Investment",
                      icon: <TrendingUp className="w-3 h-3 text-purple-500" />,
                      color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
                    };
                  } else if (accType === "GOAL" || accType === "SAVING" || accType === "SAVINGS") {
                    badge = {
                      label: "Target / Goal",
                      icon: <Target className="w-3 h-3 text-amber-500" />,
                      color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
                    };
                  } else if (accType === "BANK") {
                    badge = {
                      label: "Bank",
                      icon: <Building2 className="w-3 h-3 text-sky-500" />,
                      color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
                    };
                  } else if (accType === "EWALLET" || accType === "E_WALLET") {
                    badge = {
                      label: "E-Wallet",
                      icon: <Smartphone className="w-3 h-3 text-violet-500" />,
                      color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800",
                    };
                  } else if (accType === "CREDIT_CARD" || accType === "LOAN") {
                    badge = {
                      label: "Credit",
                      icon: <CreditCard className="w-3 h-3 text-rose-500" />,
                      color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
                    };
                  }

                  return (
                    <div
                      key={acc.id}
                      className="p-5 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 transition group relative"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${badge.color}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenRecount(acc.id)}
                          title="Edit / Adjust Balance for this Account"
                          className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {acc.name}
                      </div>
                      <div
                        className={`text-lg font-bold mt-1 ${
                          accType === "INVESTMENT"
                            ? "text-purple-600 dark:text-purple-400"
                            : accType === "GOAL" || accType === "SAVING"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {hideAmount ? "Rp ••••••" : formatRupiah(acc.balance)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Categories Breakdown */}
            {stats.topCategories.length > 0 && (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm space-y-4 transition">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                    TOP EXPENSES THIS MONTH
                  </h2>
                  <Link
                    href="/categories"
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage Categories</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
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
            </div>
          </>
        )}

        {/* SECTION: MUTASI & RIWAYAT TRANSAKSI (USED IN BOTH DASHBOARD & FULL SPA VIEW) */}
        <TransactionHistorySection
          transactions={displayedTransactions}
          totalFilteredCount={totalFilteredCount}
          periodSummary={periodSummary}
          isFetchingFilter={isFetchingFilter}
          isLoadingMore={isLoadingMore}
          viewMode={viewMode}
          setViewMode={setViewMode}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          setPageSize={setPageSize}
          handlePageChange={handlePageChange}
          dateFilterMode={dateFilterMode}
          setDateFilterMode={setDateFilterMode}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          search={search}
          setSearch={setSearch}
          handleResetFilters={handleResetFilters}
          handleDeleteTransaction={handleDeleteTransaction}
          onEditTransaction={(tx) => setEditingTx(tx)}
          hideAmount={hideAmount}
          formatRupiah={formatRupiah}
          formatDate={formatDate}
          getCategoryColor={getCategoryColor}
          categories={initialData.categories}
          accounts={accounts}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(newSortBy, newSortOrder) => {
            setSortBy(newSortBy);
            setSortOrder(newSortOrder);
          }}
        />
      </main>

      {/* MODAL: Catat Transaksi */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white border-t sm:border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto">
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Record New Transaction
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
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTxType("EXPENSE")}
                  className={`py-2 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                    txType === "EXPENSE"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("INCOME")}
                  className={`py-2 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                    txType === "INCOME"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("TRANSFER")}
                  className={`py-2 text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                    txType === "TRANSFER"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Transfer</span>
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Amount (IDR)
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

              {/* Account Dropdown(s) */}
              {txType === "TRANSFER" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      From Account (Source)
                    </label>
                    <select
                      required
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatRupiah(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      To Account (Destination)
                    </label>
                    <select
                      required
                      value={transferToAccountId}
                      onChange={(e) => setTransferToAccountId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">Select Destination Account</option>
                      {accounts
                        .filter((acc) => String(acc.id) !== String(accountId))
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type}) - {formatRupiah(acc.balance)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Wallet / Account
                  </label>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatRupiah(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Dropdown (for Expense/Income) */}
              {txType !== "TRANSFER" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <CategorySelector
                    value={categoryId}
                    onChange={(val) => setCategoryId(val)}
                    categories={initialData.categories}
                    txType={txType}
                    placeholder="Select Category (Optional)"
                    size="md"
                  />
                </div>
              )}

              {/* Note / Payee */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Note / Description
                </label>
                <input
                  type="text"
                  placeholder={
                    txType === "TRANSFER"
                      ? "e.g., Mutual Fund Top Up, Laptop Savings..."
                      : "e.g., Lunch with team, Coffee beans..."
                  }
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Transaction Date & Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setDate(getLocalDateTimeString())}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium transition cursor-pointer"
                  >
                    Set Current Time
                  </button>
                </div>
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
                {isLoading ? "Saving Transaction..." : "Save Transaction"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Import CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white border-t sm:border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto">
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Import Transactions from CSV
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Supports exports from <strong>Wallet App (Budgetbakers)</strong> or standard Cybank CSV format.
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
                    {csvFile ? csvFile.name : "Click to select a .csv file"}
                  </span>
                  <span className="text-[11px] text-slate-400">Maximum size 5MB</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!csvFile || isLoading}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isLoading ? "Importing Data..." : "Start CSV Import"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Recount / Sesuaikan Saldo */}
      <RecountBalanceModal
        isOpen={isRecountModalOpen}
        onClose={() => {
          setIsRecountModalOpen(false);
          setRecountAccountId(null);
        }}
        accounts={accounts}
        formatRupiah={formatRupiah}
        onSuccess={handleRecountSuccess}
        initialAccountId={recountAccountId}
      />

      {/* MODAL: Edit Transaksi */}
      <EditTransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        accounts={accounts}
        categories={initialData.categories}
        formatRupiah={formatRupiah}
        onSuccess={handleUpdateTransactionSuccess}
      />

      {/* MODAL: Logout Confirmation */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white border-t sm:border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-2 mb-3" />

            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Sign Out from Cybank?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your session will be closed and you will be redirected to the login page.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition cursor-pointer"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (PWA / App Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {/* Tab 1: Ringkasan */}
        <button
          type="button"
          onClick={() => {
            setViewMode("dashboard");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            viewMode === "dashboard"
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Overview</span>
        </button>

        {/* Tab 2: Mutasi Lengkap */}
        <button
          type="button"
          onClick={() => {
            setViewMode("full");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            viewMode === "full"
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Ledger</span>
        </button>

        {/* Center Action: FAB Catat Transaksi */}
        <div className="flex flex-col items-center justify-center -mt-6">
          <Link
            href="/transactions/create"
            className="w-13 h-13 rounded-2xl bg-linear-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform cursor-pointer"
            title="Record New Transaction"
          >
            <PlusCircle className="w-7 h-7" />
          </Link>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            Record
          </span>
        </div>

        {/* Tab 3: Category */}
        <Link
          href="/categories"
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
        >
          <Tag className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Category</span>
        </Link>

        {/* Tab 4: Recount Balance */}
        <button
          type="button"
          onClick={() => handleOpenRecount()}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
        >
          <SlidersHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Recount</span>
        </button>
      </nav>

      {/* Mobile Custom Numeric Keypad Sheet */}
      <CustomNumericKeypad
        isOpen={isNumericKeypadOpen}
        onClose={() => setIsNumericKeypadOpen(false)}
        value={amount}
        onChange={(val) => setAmount(val)}
      />
    </div>
  );
}
