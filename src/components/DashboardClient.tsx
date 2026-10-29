"use client";

import React, { useState, useMemo } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  PlusCircle,
  Upload,
  Search,
  Filter,
  CreditCard,
  Calendar,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Clock,
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

export default function DashboardClient({ initialData }: { initialData: InitialData }) {
  const [transactions, setTransactions] = useState(initialData.transactions);
  const [stats, setStats] = useState(initialData.stats);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
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

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          categoryId: categoryId || undefined,
          amount: parseFloat(amount),
          type: txType,
          note,
          transactionDate: new Date(date).toISOString(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Transaksi berhasil dicatat!" });
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
        setIsAddModalOpen(false);
        // Reset form
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
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: `Berhasil import ${json.result.importedCount} transaksi! Silakan refresh halaman untuk memuat ulang ringkasan.`,
        });
        setIsImportModalOpen(false);
        window.location.reload();
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Cybank
              </h1>
              <p className="text-xs text-slate-400">Personal Cashflow Ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              Import CSV
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Catat Transaksi
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-emerald-400">
              NW
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Alerts */}
        {message && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 ${
              message.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
                : "bg-rose-950/40 border-rose-800/80 text-rose-300"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Balance */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total Saldo Kas
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">
              {formatRupiah(stats.totalBalance)}
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" />
              Akun: {initialData.accounts[0]?.name || "My Cash"}
            </p>
          </div>

          {/* Monthly Expense */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Pengeluaran Bulan Ini
              </span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-rose-400">
              {formatRupiah(stats.monthlyExpense)}
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Bulan berjalan
            </p>
          </div>

          {/* Monthly Income */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Pemasukan Bulan Ini
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-400">
              {formatRupiah(stats.monthlyIncome)}
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Gaji & Kas Masuk
            </p>
          </div>

          {/* Total Transactions */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total Riwayat Transaksi
              </span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">
              {stats.totalTxCount.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-slate-400 mt-2">Termasuk import riwayat Wallet</p>
          </div>
        </div>

        {/* Top Categories Breakdown */}
        {stats.topCategories.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Pengeluaran Terbesar Bulan Ini</h2>
              <span className="text-xs text-slate-400">Top Kategori</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {stats.topCategories.map((cat, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 truncate">{cat.name}</div>
                  <div className="text-sm font-semibold text-white mt-1">
                    {formatRupiah(cat.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Section */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Mutasi & Riwayat Transaksi</h2>
              <p className="text-xs text-slate-400">
                Menampilkan {filteredTransactions.length} dari total {stats.totalTxCount} transaksi
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari catatan / payee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Type Filter */}
              <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs font-medium">
                <button
                  onClick={() => setSelectedType("ALL")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    selectedType === "ALL" ? "bg-slate-800 text-white" : "text-slate-400"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setSelectedType("EXPENSE")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    selectedType === "EXPENSE" ? "bg-rose-500/20 text-rose-300" : "text-slate-400"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  onClick={() => setSelectedType("INCOME")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    selectedType === "INCOME" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400"
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-emerald-500"
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
          <div className="divide-y divide-slate-800/80">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Tidak ada transaksi yang cocok dengan filter.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isExpense = tx.type === "EXPENSE";
                return (
                  <div
                    key={tx.id}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isExpense
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-emerald-500/10 text-emerald-400"
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
                          <span className="text-sm font-semibold text-white truncate">
                            {tx.note || tx.categoryName}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 font-medium shrink-0">
                            {tx.categoryName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{formatDate(tx.transactionDate)}</span>
                          <span>•</span>
                          <span>{tx.accountName}</span>
                          {tx.payee && (
                            <>
                              <span>•</span>
                              <span className="text-slate-300">{tx.payee}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold ${
                          isExpense ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {isExpense ? "-" : "+"} {formatRupiah(tx.amount)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">
                        {tx.paymentType || "CASH"}
                      </div>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Catat Transaksi Baru</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTxType("EXPENSE")}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    txType === "EXPENSE"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("INCOME")}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    txType === "INCOME"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 25000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Account */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Akun / Dompet</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-sm"
                >
                  {initialData.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-sm"
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
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Makan siang mie ayam"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Tanggal & Jam
                </label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-98 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Import File CSV</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportCsv} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Pilih file export CSV dari aplikasi Wallet (BudgetBakers) atau Cybank untuk memproses
                transaksi ke akun Anda.
              </p>

              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center bg-slate-950/50">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !csvFile}
                  className="w-full py-2.5 rounded-xl font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? "Mengimpor Data..." : "Upload & Proses CSV"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
