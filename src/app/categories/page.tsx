"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import {
  CategoryIcon,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  getCategoryIconComponent,
} from "@/components/CategoryIcon";
import {
  ArrowLeft,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  AlertCircle,
  X,
  Check,
  CheckCircle2,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";

export interface CategoryItem {
  id: number;
  userId?: number;
  name: string;
  type: "EXPENSE" | "INCOME";
  icon?: string | null;
  color?: string | null;
  envelope_id?: string | null;
  transaction_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function CategoriesPage() {
  const router = useRouter();

  // State
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [formColor, setFormColor] = useState<string>("#10b981");
  const [formIcon, setFormIcon] = useState<string>("tag");
  const [iconSearch, setIconSearch] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Theme
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("cybank_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  // Helper fetch with auth
  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cybank_token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch categories
  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/categories?withCount=1"), {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat kategori:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesType = typeFilter === "ALL" || cat.type === typeFilter;
      const matchesSearch =
        !search || cat.name.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [categories, typeFilter, search]);

  // Counts
  const expenseCount = useMemo(
    () => categories.filter((c) => c.type === "EXPENSE").length,
    [categories]
  );
  const incomeCount = useMemo(
    () => categories.filter((c) => c.type === "INCOME").length,
    [categories]
  );

  // Open Add Modal
  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingCategory(null);
    setFormName("");
    setFormType(typeFilter === "INCOME" ? "INCOME" : "EXPENSE");
    setFormColor(typeFilter === "INCOME" ? "#10b981" : "#f43f5e");
    setFormIcon(typeFilter === "INCOME" ? "wallet" : "shopping-bag");
    setIconSearch("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: CategoryItem) => {
    setModalMode("edit");
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type || "EXPENSE");
    setFormColor(cat.color || (cat.type === "INCOME" ? "#10b981" : "#f43f5e"));
    setFormIcon(cat.icon || "tag");
    setIconSearch("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Nama kategori wajib diisi");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        id: editingCategory?.id,
        name: formName.trim(),
        type: formType,
        color: formColor,
        icon: formIcon,
      };

      const url = apiUrl("/api/v1/categories");
      const method = modalMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan kategori");
      }

      setIsModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Category
  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(apiUrl(`/api/v1/categories?id=${categoryToDelete.id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus kategori");
      }

      setCategoryToDelete(null);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus kategori");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered icons in picker
  const filteredIcons = useMemo(() => {
    if (!iconSearch) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter(
      (item) =>
        item.name.toLowerCase().includes(iconSearch.toLowerCase()) ||
        item.label.toLowerCase().includes(iconSearch.toLowerCase())
    );
  }, [iconSearch]);

  const ActiveFormIcon = getCategoryIconComponent(formIcon);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Kelola Kategori
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Atur nama, warna, dan ikon untuk klasifikasi transaksi Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Ganti Mode Gelap / Terang"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-500" />
              )}
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Kategori
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {categories.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
                Kategori Pengeluaran
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {expenseCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">
                Kategori Pemasukan
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {incomeCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                typeFilter === "ALL"
                  ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Semua ({categories.length})
            </button>
            <button
              onClick={() => setTypeFilter("EXPENSE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                typeFilter === "EXPENSE"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400"
              }`}
            >
              Pengeluaran ({expenseCount})
            </button>
            <button
              onClick={() => setTypeFilter("INCOME")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                typeFilter === "INCOME"
                  ? "bg-emerald-500 text-slate-950 shadow-sm font-bold"
                  : "text-slate-500 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400"
              }`}
            >
              Pemasukan ({incomeCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Memuat data kategori...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-16 px-4 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/80 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Tag className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {search ? "Kategori tidak ditemukan" : "Belum ada kategori"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {search
                  ? `Tidak ada kategori yang cocok dengan pencarian "${search}".`
                  : "Mulai rapikan buku keuangan Anda dengan membuat kategori baru."}
              </p>
            </div>
            {!search && (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kategori Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredCategories.map((cat) => {
              const isExpense = cat.type === "EXPENSE";
              const catColor = cat.color || (isExpense ? "#f43f5e" : "#10b981");
              const txCount = Number(cat.transaction_count || 0);

              return (
                <div
                  key={cat.id}
                  className="group p-4 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Category Icon Badge with custom color */}
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${catColor}18`,
                          color: catColor,
                          border: `1.5px solid ${catColor}40`,
                        }}
                      >
                        <CategoryIcon name={cat.icon} className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {cat.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isExpense
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {isExpense ? "Pengeluaran" : "Pemasukan"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Edit Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCategoryToDelete(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {txCount > 0 ? (
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {txCount} transaksi
                        </span>
                      ) : (
                        <span className="italic">Belum ada transaksi</span>
                      )}
                    </span>
                    <span
                      className="w-3 h-3 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
                      style={{ backgroundColor: catColor }}
                      title={`Warna: ${catColor}`}
                    ></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: Tambah / Edit Kategori */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${formColor}20`,
                    color: formColor,
                  }}
                >
                  <ActiveFormIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {modalMode === "add" ? "Tambah Kategori Baru" : "Edit Kategori"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sesuaikan nama, tipe, warna palet, dan ikon representatif
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Content (Scrollable) */}
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipe Transaksi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("EXPENSE");
                      if (modalMode === "add" && formColor === "#10b981") {
                        setFormColor("#f43f5e");
                      }
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition cursor-pointer ${
                      formType === "EXPENSE"
                        ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Pengeluaran (Expense)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType("INCOME");
                      if (modalMode === "add" && formColor === "#f43f5e") {
                        setFormColor("#10b981");
                      }
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition cursor-pointer ${
                      formType === "INCOME"
                        ? "bg-emerald-500 text-slate-950 font-bold border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Pemasukan (Income)</span>
                  </button>
                </div>
              </div>

              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: Makan & Minum, Tagihan Listrik, Gaji..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Color Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Warna Kategori
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {formColor}
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {CATEGORY_COLORS.map((c) => {
                    const isSelected = formColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setFormColor(c.hex)}
                        title={c.name}
                        className={`w-7 h-7 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-950 scale-110 shadow-sm"
                            : "hover:scale-105 opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Ikon Representatif
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {filteredIcons.length} pilihan
                  </span>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari ikon (makan, mobil, belanja...)"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-6 gap-2 p-2.5 max-h-40 overflow-y-auto rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {filteredIcons.map((item) => {
                    const isSelected = formIcon === item.name;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormIcon(item.name)}
                        title={item.label}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          isSelected
                            ? "bg-white dark:bg-slate-800 text-emerald-500 border-2 border-emerald-500 shadow-sm"
                            : "hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-transparent"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9px] truncate max-w-full font-medium">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Pratinjau Tampilan Badge
                </span>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
                    style={{
                      backgroundColor: `${formColor}20`,
                      color: formColor,
                      border: `1.5px solid ${formColor}40`,
                    }}
                  >
                    <ActiveFormIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {formName.trim() || "Nama Kategori"}
                    </span>
                    <span
                      className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5"
                      style={{
                        backgroundColor: `${formColor}18`,
                        color: formColor,
                      }}
                    >
                      {formType === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{modalMode === "add" ? "Buat Kategori" : "Simpan Perubahan"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Kategori "{categoryToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Kategori ini akan dihapus. Riwayat transaksi Anda tetap aman dan akan otomatis diubah menjadi tanpa kategori (*Uncategorized*).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

