"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  CategoryIcon,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  CATEGORY_ICON_GROUPS,
  getCategoryIconComponent,
  normalizeHexColor,
  type CategoryIconGroup,
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
  ArrowRightLeft,
  Sparkles,
  Loader2,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export interface CategoryItem {
  id: number;
  userId?: number;
  name: string;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  icon?: string | null;
  color?: string | null;
  parent_id?: number | null;
  parentId?: number | null;
  parent_name?: string | null;
  children_count?: number;
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
  const [typeFilter, setTypeFilter] = useState<"ALL" | "EXPENSE" | "INCOME" | "TRANSFER">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [formParentId, setFormParentId] = useState<string>("");
  const [formColor, setFormColor] = useState<string>("#10b981");
  // Draft input HEX: null = ikuti warna terpilih (preset / parent / custom picker)
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [formIcon, setFormIcon] = useState<string>("tag");
  const [iconSearch, setIconSearch] = useState("");
  const [iconGroup, setIconGroup] = useState<"ALL" | CategoryIconGroup>("ALL");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Grup kategori yang diciutkan (default: semua terbuka)
  const [collapsedGroups, setCollapsedGroups] = useState<number[]>([]);

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
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute("content", nextTheme === "dark" ? "#020617" : "#ffffff");
      }
    }
  };

  // Lock scroll background saat modal aktif
  useEffect(() => {
    if (isModalOpen || categoryToDelete) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen, categoryToDelete]);

  // Content-Type JSON; header Authorization ditambahkan otomatis oleh apiFetch
  const getAuthHeaders = (): Record<string, string> => ({
    "Content-Type": "application/json",
  });

  // Fetch categories
  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/categories?withCount=1", {
        headers: getAuthHeaders(),
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
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Hierarki kategori: kategori utama (root) + subkategorinya
  const categoryTree = useMemo(() => {
    const knownIds = new Set(categories.map((c) => c.id));
    const childrenByParent = new Map<number, CategoryItem[]>();

    categories.forEach((cat) => {
      const parentId = cat.parent_id ?? cat.parentId ?? null;
      if (parentId && knownIds.has(parentId)) {
        const list = childrenByParent.get(parentId) ?? [];
        list.push(cat);
        childrenByParent.set(parentId, list);
      }
    });

    return categories
      .filter((cat) => {
        const parentId = cat.parent_id ?? cat.parentId ?? null;
        return !parentId || !knownIds.has(parentId);
      })
      .map((root) => ({
        root,
        children: (childrenByParent.get(root.id) ?? []).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
  }, [categories]);

  const parentIdOf = (cat: CategoryItem) => cat.parent_id ?? cat.parentId ?? null;

  // Filter per tipe + pencarian (induk tetap tampil jika salah satu subkategori cocok)
  const filteredTree = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categoryTree
      .map(({ root, children }) => {
        if (typeFilter !== "ALL" && root.type !== typeFilter) return null;

        const rootMatches = !query || root.name.toLowerCase().includes(query);
        const childrenInType = children.filter(
          (child) => typeFilter === "ALL" || child.type === typeFilter
        );
        const visibleChildren =
          query && !rootMatches
            ? childrenInType.filter((child) => child.name.toLowerCase().includes(query))
            : childrenInType;

        if (query && !rootMatches && visibleChildren.length === 0) return null;

        return { root, children: visibleChildren };
      })
      .filter(
        (group): group is { root: CategoryItem; children: CategoryItem[] } => group !== null
      );
  }, [categoryTree, typeFilter, search]);

  // Counts
  const expenseCount = useMemo(
    () => categories.filter((c) => c.type === "EXPENSE").length,
    [categories]
  );
  const incomeCount = useMemo(
    () => categories.filter((c) => c.type === "INCOME").length,
    [categories]
  );
  const transferCount = useMemo(
    () => categories.filter((c) => c.type === "TRANSFER").length,
    [categories]
  );
  const subcategoryCount = useMemo(
    () => categories.filter((c) => parentIdOf(c)).length,
    [categories]
  );

  // Open Add Modal (opsional: tambah subkategori dari grup tertentu)
  const handleOpenAdd = (parent?: CategoryItem) => {
    const nextType = parent?.type ?? (typeFilter === "ALL" ? "EXPENSE" : typeFilter);
    setModalMode("add");
    setEditingCategory(null);
    setFormName("");
    setFormType(nextType);
    setFormParentId(parent ? String(parent.id) : "");
    setFormColor(
      parent?.color ||
        (nextType === "INCOME"
          ? "#10b981"
          : nextType === "TRANSFER"
          ? "#3b82f6"
          : "#f43f5e")
    );
    setHexDraft(null);
    setFormIcon(
      nextType === "INCOME"
        ? "wallet"
        : nextType === "TRANSFER"
        ? "arrow-left-right"
        : "shopping-bag"
    );
    setIconSearch("");
    setIconGroup("ALL");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: CategoryItem) => {
    setModalMode("edit");
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type || "EXPENSE");
    const currentParentId = parentIdOf(cat);
    setFormParentId(currentParentId ? String(currentParentId) : "");
    setFormColor(cat.color || (cat.type === "INCOME" ? "#10b981" : "#f43f5e"));
    setHexDraft(null);
    setFormIcon(cat.icon || "tag");
    setIconSearch("");
    setIconGroup("ALL");
    setFormError(null);
    setIsModalOpen(true);
  };

  const toggleGroup = (id: number) => {
    setCollapsedGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Kategori yang boleh menjadi induk: harus kategori utama & bertipe sama
  const editingHasChildren = useMemo(
    () =>
      editingCategory
        ? categories.some((c) => parentIdOf(c) === editingCategory.id)
        : false,
    [categories, editingCategory]
  );

  const parentOptions = useMemo(() => {
    return categories.filter((cat) => {
      if (parentIdOf(cat)) return false;
      if (cat.type !== formType) return false;
      if (editingCategory && cat.id === editingCategory.id) return false;
      return true;
    });
  }, [categories, formType, editingCategory]);

  // Subkategori selalu mengikuti warna kategori induk (tidak bisa diatur manual)
  const selectedParent = useMemo(
    () => categories.find((cat) => String(cat.id) === formParentId) ?? null,
    [categories, formParentId]
  );
  const selectedParentColor = selectedParent
    ? selectedParent.color || (selectedParent.type === "INCOME" ? "#10b981" : "#f43f5e")
    : null;
  const effectiveFormColor = selectedParentColor ?? formColor;

  // Nilai yang ditampilkan di input HEX + status validasi saat user mengetik
  const hexInputValue = hexDraft ?? effectiveFormColor;
  const hexIsInvalid = hexDraft !== null && normalizeHexColor(hexDraft) === null;

  const applyCustomColor = (raw: string) => {
    setHexDraft(raw);
    const normalized = normalizeHexColor(raw);
    if (normalized) setFormColor(normalized);
  };

  const deleteChildCount = useMemo(
    () =>
      categoryToDelete
        ? categories.filter((c) => parentIdOf(c) === categoryToDelete.id).length
        : 0,
    [categories, categoryToDelete]
  );

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Category name is required");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        id: editingCategory?.id,
        name: formName.trim(),
        type: formType,
        parentId: formParentId ? Number(formParentId) : null,
        color: effectiveFormColor,
        icon: formIcon,
      };

      const url = "/api/v1/categories";
      const method = modalMode === "add" ? "POST" : "PUT";

      const res = await apiFetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save category");
      }

      setIsModalOpen(false);
      if (formParentId) {
        // Pastikan grup induk terbuka agar subkategori baru langsung terlihat
        setCollapsedGroups((prev) => prev.filter((id) => id !== Number(formParentId)));
      }
      await loadCategories();
    } catch (err: any) {
      setFormError(err.message || "System error occurred");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Category
  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);

    try {
      const res = await apiFetch(`/api/v1/categories?id=${categoryToDelete.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete category");
      }

      setCategoryToDelete(null);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || "Failed to delete category");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered icons in picker (grup + pencarian nama/label)
  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    return CATEGORY_ICONS.filter((item) => {
      if (iconGroup !== "ALL" && item.category !== iconGroup) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.label.toLowerCase().includes(query)
      );
    });
  }, [iconSearch, iconGroup]);

  // Jumlah ikon per grup (untuk badge di filter chip)
  const iconGroupCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: CATEGORY_ICONS.length };
    CATEGORY_ICONS.forEach((item) => {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    });
    return counts;
  }, []);

  const ActiveFormIcon = getCategoryIconComponent(formIcon);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Loading Progress Line */}
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent overflow-hidden pointer-events-none">
          <div className="h-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Manage Categories
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Customize names, colors, and icons — subcategories automatically follow their parent color
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Toggle Dark / Light Mode"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-500" />
              )}
            </button>

            <button
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center gap-2 px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
              title="Add New Category"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Add Category</span>
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
                Total Categories
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {categories.length}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {categoryTree.length} groups · {subcategoryCount} subcategories
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
                Expense Categories
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
                Income Categories
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
              All ({categories.length})
            </button>
            <button
              onClick={() => setTypeFilter("EXPENSE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                typeFilter === "EXPENSE"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400"
              }`}
            >
              Expense ({expenseCount})
            </button>
            <button
              onClick={() => setTypeFilter("INCOME")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                typeFilter === "INCOME"
                  ? "bg-emerald-500 text-slate-950 shadow-sm font-bold"
                  : "text-slate-500 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400"
              }`}
            >
              Income ({incomeCount})
            </button>
            <button
              onClick={() => setTypeFilter("TRANSFER")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                typeFilter === "TRANSFER"
                  ? "bg-blue-500 text-white shadow-sm font-bold"
                  : "text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400"
              }`}
            >
              Transfer ({transferCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search categories..."
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

        {/* Category Groups (kategori utama + subkategori) */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Loading category data...</p>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="py-16 px-4 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/80 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Tag className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {search ? "Category not found" : "No categories yet"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {search
                  ? `No categories match your search "${search}".`
                  : "Organize your ledger by adding your first category."}
              </p>
            </div>
            {!search && (
              <button
                onClick={() => handleOpenAdd()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Category</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTree.map(({ root, children }) => {
              const isExpense = root.type === "EXPENSE";
              const groupColor = root.color || (isExpense ? "#f43f5e" : "#10b981");
              const hasChildren = children.length > 0;
              const isCollapsed = !search.trim() && collapsedGroups.includes(root.id);
              const rootTxCount = Number(root.transaction_count || 0);
              const childrenTxCount = children.reduce(
                (total, child) => total + Number(child.transaction_count || 0),
                0
              );
              const totalTxCount = rootTxCount + childrenTxCount;

              return (
                <div
                  key={root.id}
                  className="rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800/80 shadow-sm overflow-hidden"
                >
                  {/* Baris grup (kategori induk) */}
                  <div className="flex items-center gap-1.5 sm:gap-2 pl-2 pr-2 sm:pl-3 sm:pr-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => hasChildren && toggleGroup(root.id)}
                      disabled={!hasChildren}
                      title={hasChildren ? (isCollapsed ? "Expand group" : "Collapse group") : undefined}
                      className={`flex items-center gap-2 sm:gap-3 min-w-0 flex-1 text-left rounded-xl px-1 py-0.5 ${
                        hasChildren
                          ? "cursor-pointer hover:text-slate-900 dark:hover:text-white"
                          : "cursor-default"
                      }`}
                    >
                      <span className="w-4 shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-500">
                        {hasChildren ? (
                          isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        )}
                      </span>

                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${groupColor}18`,
                          color: groupColor,
                          border: `1.5px solid ${groupColor}40`,
                        }}
                      >
                        <CategoryIcon name={root.icon} className="w-[18px] h-[18px]" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {root.name}
                          </span>
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                              isExpense
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isExpense ? "Expense" : "Income"}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          <span className="font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                            {totalTxCount} {totalTxCount === 1 ? "transaction" : "transactions"}
                          </span>
                          {hasChildren && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <Layers className="w-3 h-3" />
                                {children.length} subcategories
                              </span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>

                    {/* Aksi grup */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleOpenAdd(root)}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Add subcategory"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(root)}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCategoryToDelete(root)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subkategori */}
                  {hasChildren && !isCollapsed && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/30">
                      {children.map((child) => {
                        // Warna subkategori selalu sama dengan warna induknya
                        const childColor = groupColor;
                        const childTxCount = Number(child.transaction_count || 0);

                        return (
                          <div
                            key={child.id}
                            className="flex items-center gap-2.5 sm:gap-3 pl-10 sm:pl-14 pr-2 sm:pr-3 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `${childColor}18`,
                                color: childColor,
                                border: `1px solid ${childColor}30`,
                              }}
                            >
                              <CategoryIcon name={child.icon} className="w-3.5 h-3.5" />
                            </span>

                            <span className="min-w-0 flex-1 text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {child.name}
                            </span>

                            <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                              {childTxCount} {childTxCount === 1 ? "transaction" : "transactions"}
                            </span>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() => handleOpenEdit(child)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Edit Subcategory"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setCategoryToDelete(child)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                                title="Delete Subcategory"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: Tambah / Edit Kategori */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl lg:max-w-5xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 h-[92dvh] sm:h-[86vh] sm:max-h-[720px] flex flex-col"
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${effectiveFormColor}20`,
                    color: effectiveFormColor,
                  }}
                >
                  <ActiveFormIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {modalMode === "add"
                      ? formParentId
                        ? "Add Subcategory"
                        : "Add New Category"
                      : editingHasChildren
                      ? "Edit Category Group"
                      : "Edit Category"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formParentId && modalMode === "add"
                      ? `Nested under "${
                          parentOptions.find((p) => String(p.id) === formParentId)?.name ??
                          categories.find((c) => String(c.id) === formParentId)?.name ??
                          "parent"
                        }"`
                      : "Customize name, transaction type, parent group, color, and icon"}
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

            {/* Form Content: 2 Columns on desktop (md:), Single Column with scroll on mobile */}
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto md:overflow-hidden pr-1 md:pr-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0">
                {/* Left Column: Properties & Live Preview */}
                <div className="md:col-span-5 flex flex-col justify-between space-y-3.5 md:space-y-0">
                  <div className="space-y-3">
                    {/* Type Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Transaction Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormType("EXPENSE");
                            setFormParentId("");
                            if (modalMode === "add" && (formColor === "#10b981" || formColor === "#3b82f6")) {
                              setFormColor("#f43f5e");
                            }
                            setHexDraft(null);
                          }}
                          className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition cursor-pointer ${
                            formType === "EXPENSE"
                              ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Expense</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormType("INCOME");
                            setFormParentId("");
                            if (modalMode === "add" && (formColor === "#f43f5e" || formColor === "#3b82f6")) {
                              setFormColor("#10b981");
                            }
                            setHexDraft(null);
                          }}
                          className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition cursor-pointer ${
                            formType === "INCOME"
                              ? "bg-emerald-500 text-slate-950 font-bold border-emerald-600 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Income</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormType("TRANSFER");
                            setFormParentId("");
                            if (modalMode === "add" && (formColor === "#f43f5e" || formColor === "#10b981")) {
                              setFormColor("#3b82f6");
                            }
                            setHexDraft(null);
                          }}
                          className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition cursor-pointer ${
                            formType === "TRANSFER"
                              ? "bg-blue-500 text-white font-bold border-blue-600 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Transfer</span>
                        </button>
                      </div>
                    </div>

                    {/* Parent / Group Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Parent Category
                        </label>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                          optional
                        </span>
                      </div>
                      <select
                        value={formParentId}
                        onChange={(e) => {
                          const nextParentId = e.target.value;
                          setFormParentId(nextParentId);
                          const nextParent = categories.find((c) => String(c.id) === nextParentId);
                          if (nextParent) {
                            setFormColor(
                              nextParent.color || (nextParent.type === "INCOME" ? "#10b981" : "#f43f5e")
                            );
                            setHexDraft(null);
                          }
                        }}
                        disabled={Boolean(editingCategory && editingHasChildren)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="">None — top-level category (group)</option>
                        {parentOptions.map((parent) => (
                          <option key={parent.id} value={parent.id}>
                            {parent.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Category Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g.: Food & Dining, Electricity, Salary..."
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    {/* Color Picker */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {selectedParent ? "Category Color" : "Select Category Color"}
                        </label>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {effectiveFormColor}
                        </span>
                      </div>

                      {selectedParent ? (
                        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700">
                          <span
                            className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor: `${effectiveFormColor}18`,
                              border: `1.5px solid ${effectiveFormColor}40`,
                            }}
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: effectiveFormColor }}
                            />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                              Inherited from &ldquo;{selectedParent.name}&rdquo;
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              Follows parent color automatically.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            {CATEGORY_COLORS.map((c) => {
                              const isSelected = effectiveFormColor.toLowerCase() === c.hex.toLowerCase();
                              return (
                                <button
                                  key={c.hex}
                                  type="button"
                                  onClick={() => {
                                    setFormColor(c.hex);
                                    setHexDraft(null);
                                  }}
                                  title={c.name}
                                  className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                                    isSelected
                                      ? "ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-950 scale-110 shadow-sm"
                                      : "hover:scale-105 opacity-80 hover:opacity-100"
                                  }`}
                                  style={{ backgroundColor: c.hex }}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white drop-shadow-md" />}
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-1.5 flex items-center gap-2">
                            <label
                              className="relative w-7 h-7 rounded-lg shrink-0 overflow-hidden cursor-pointer border border-slate-300 dark:border-slate-700 shadow-sm"
                              style={{ backgroundColor: hexIsInvalid ? formColor : effectiveFormColor }}
                              title="Pick a custom color"
                            >
                              <input
                                type="color"
                                value={effectiveFormColor}
                                onChange={(e) => {
                                  setFormColor(e.target.value);
                                  setHexDraft(null);
                                }}
                                aria-label="Custom color picker"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                            </label>

                            <div
                              className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border ${
                                hexIsInvalid
                                  ? "border-rose-500"
                                  : "border-slate-200 dark:border-slate-800"
                              }`}
                            >
                              <span className="text-[10px] font-bold text-slate-400 shrink-0">HEX</span>
                              <input
                                type="text"
                                value={hexInputValue}
                                onChange={(e) => applyCustomColor(e.target.value)}
                                onBlur={() => setHexDraft(null)}
                                maxLength={7}
                                spellCheck={false}
                                placeholder="#0f766e"
                                className="w-full bg-transparent text-xs font-mono font-semibold uppercase text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setFormColor(formType === "INCOME" ? "#10b981" : "#f43f5e");
                                setHexDraft(null);
                              }}
                              title="Reset default color"
                              className="px-2 py-1 text-[10px] font-semibold rounded-lg shrink-0 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              Default
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Live Badge Preview
                    </span>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0"
                        style={{
                          backgroundColor: `${effectiveFormColor}20`,
                          color: effectiveFormColor,
                          border: `1.5px solid ${effectiveFormColor}40`,
                        }}
                      >
                        <ActiveFormIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        {formParentId && (
                          <span className="block text-[10px] font-semibold text-slate-400 truncate">
                            {selectedParent?.name ?? "Group"}{" ›"}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {formName.trim() || "Category Name"}
                        </span>
                        <span
                          className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5"
                          style={{
                            backgroundColor: `${effectiveFormColor}18`,
                            color: effectiveFormColor,
                          }}
                        >
                          {formType === "EXPENSE" ? "Expense" : "Income"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Icon Picker */}
                <div className="md:col-span-7 flex flex-col min-h-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Select Icon
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {filteredIcons.length} choices
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search icons (food, car, shopping...)"
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Filter grup ikon */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: "ALL" as const, label: "All" },
                      ...CATEGORY_ICON_GROUPS,
                    ].map((group) => {
                      const isActive = iconGroup === group.key;
                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => setIconGroup(group.key)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                            isActive
                              ? "bg-emerald-500 text-slate-950 border-emerald-600"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          {group.label}
                          <span className="ml-1 opacity-70 tabular-nums">
                            {iconGroupCounts[group.key] ?? 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Icon Grid (fixed height container, scrollable inside) */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-7 gap-1.5 p-2 flex-1 min-h-[300px] content-start overflow-y-auto rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    {filteredIcons.length === 0 ? (
                      <p className="col-span-full py-8 text-center text-[11px] text-slate-500 dark:text-slate-400">
                        No icons match “{iconSearch}”. Try another keyword.
                      </p>
                    ) : (
                      filteredIcons.map((item) => {
                        const isSelected = formIcon === item.name;
                        const IconComp = item.icon;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setFormIcon(item.name)}
                            title={`${item.label} (${item.name})`}
                            className={`p-1.5 rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer border-2 ${
                              isSelected
                                ? "bg-white dark:bg-slate-800 text-emerald-500 border-emerald-500 shadow-sm"
                                : "hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-transparent"
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                            <span className="text-[9px] truncate max-w-full font-medium">
                              {item.name}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{modalMode === "add" ? "Create Category" : "Save Changes"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus */}
      {categoryToDelete && (
        <div
          onClick={() => setCategoryToDelete(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200"
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-2 mb-3" />

            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Category "{categoryToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {deleteChildCount > 0
                  ? `This category will be deleted and its ${deleteChildCount} subcategor${
                      deleteChildCount > 1 ? "ies" : "y"
                    } will move to the top level. Existing transactions stay safe and become Uncategorized.`
                  : "This category will be deleted. Your existing transactions will remain safe and be automatically set to Uncategorized."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

