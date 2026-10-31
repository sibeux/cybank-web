"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Tag,
  Search,
  X,
  Check,
  ChevronDown,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { buildCategorySelectGroups, type CategoryOption } from "@/lib/categories";
import { useScrollLock } from "@/lib/useScrollLock";

export interface CategoryItem extends CategoryOption {
  id: number;
  name: string;
  type?: string | null;
  icon?: string | null;
  color?: string | null;
  parent_id?: number | null;
  parentId?: number | null;
  parent_name?: string | null;
}

interface CategorySelectorProps {
  value: string | number | null | undefined;
  onChange: (categoryId: string) => void;
  categories: CategoryItem[];
  txType?: string;
  placeholder?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

export default function CategorySelector({
  value,
  onChange,
  categories,
  txType = "EXPENSE",
  placeholder = "Pilih Kategori",
  size = "md",
  disabled = false,
  className = "",
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useScrollLock(isOpen);

  // Reset search when modal opens/closes (no auto-focus to prevent mobile keyboard popping up)
  useEffect(() => {
    if (isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Current selected category item
  const selectedCategory = useMemo(() => {
    if (!value) return null;
    return categories.find((c) => String(c.id) === String(value)) || null;
  }, [value, categories]);

  // Find parent of selected category if it's a child
  const selectedParentCategory = useMemo(() => {
    if (!selectedCategory) return null;
    const parentId = selectedCategory.parent_id ?? selectedCategory.parentId;
    if (!parentId) return null;
    return categories.find((c) => c.id === parentId) || null;
  }, [selectedCategory, categories]);

  // Grouped categories for current txType
  const categoryGroups = useMemo(() => {
    return buildCategorySelectGroups(categories, txType);
  }, [categories, txType]);

  // Filtered categories for search
  const filteredSearchItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const available = txType
      ? categories.filter((c) => !c.type || c.type === txType)
      : categories;

    return available.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const parentMatch = c.parent_name
        ? c.parent_name.toLowerCase().includes(q)
        : false;
      return nameMatch || parentMatch;
    });
  }, [categories, txType, search]);

  const handleSelect = (catId: string) => {
    onChange(catId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const isSm = size === "sm";

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className={`w-full text-left transition flex items-center justify-between gap-2 cursor-pointer ${
          isSm
            ? "px-2.5 py-2 rounded-xl text-xs font-medium"
            : "px-3.5 py-2.5 rounded-2xl text-xs font-semibold"
        } bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white hover:border-emerald-500/50 focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedCategory ? (
            <>
              <span
                className={`${
                  isSm ? "w-5 h-5 rounded-md" : "w-6 h-6 rounded-lg"
                } flex items-center justify-center shrink-0 shadow-xs`}
                style={{
                  backgroundColor: `${selectedCategory.color || "#10b981"}20`,
                  color: selectedCategory.color || "#10b981",
                  border: `1px solid ${selectedCategory.color || "#10b981"}40`,
                }}
              >
                <CategoryIcon
                  name={selectedCategory.icon}
                  className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"}
                />
              </span>
              <div className="min-w-0 flex-1 truncate">
                {selectedParentCategory && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight truncate">
                    {selectedParentCategory.name} &gt;
                  </span>
                )}
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {selectedCategory.name}
                </span>
              </div>
            </>
          ) : (
            <>
              <Tag
                className={`${
                  isSm ? "w-3.5 h-3.5" : "w-4 h-4"
                } text-slate-400 shrink-0`}
              />
              <span className="text-slate-400 dark:text-slate-500 truncate">
                {placeholder}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedCategory && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              title="Hapus kategori"
              className="p-0.5 hover:text-rose-500 rounded-md transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </div>
      </button>

      {/* Modal / Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          {/* Backdrop Click */}
          <div
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in slide-in-from-bottom duration-200">
            {/* Mobile Drag Pill */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Pilih Kategori
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {txType === "EXPENSE"
                      ? "Kategori Pengeluaran"
                      : txType === "INCOME"
                      ? "Kategori Pemasukan"
                      : "Semua Kategori"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kategori atau subkategori..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-emerald-500 placeholder-slate-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick option: Tanpa Kategori */}
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSelect("")}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    !value
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>Tanpa Kategori</span>
                  {!value && <Check className="w-3 h-3 ml-0.5" />}
                </button>
                <span className="text-[10px] text-slate-400">
                  {search ? `${filteredSearchItems.length} hasil` : `${categories.length} total`}
                </span>
              </div>
            </div>

            {/* Category List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 overscroll-contain">
              {search.trim() ? (
                /* Search Results View */
                filteredSearchItems.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Kategori tidak ditemukan
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tidak ada kategori dengan kata &ldquo;{search}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredSearchItems.map((cat) => {
                      const isSelected = String(cat.id) === String(value);
                      const catColor = cat.color || "#10b981";
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelect(String(cat.id))}
                          className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                              : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-900 dark:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `${catColor}18`,
                                color: catColor,
                                border: `1px solid ${catColor}35`,
                              }}
                            >
                              <CategoryIcon name={cat.icon} className="w-4 h-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              {cat.parent_name && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                                  {cat.parent_name} &gt;
                                </p>
                              )}
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {cat.name}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Grouped Hierarchical View */
                categoryGroups.map((group) => {
                  const hasParent = Boolean(group.parent);
                  const parentItem = group.parent;
                  const parentColor = parentItem?.color || "#10b981";

                  return (
                    <div
                      key={parentItem ? `group-${parentItem.id}` : `group-root-${group.items[0].id}`}
                      className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-950/30 p-2 space-y-1.5"
                    >
                      {/* Group Header (if has subcategories) */}
                      {hasParent && parentItem && (
                        <div className="px-2 py-1 flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5">
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-xs"
                            style={{
                              backgroundColor: `${parentColor}18`,
                              color: parentColor,
                            }}
                          >
                            <CategoryIcon name={parentItem.icon} className="w-3 h-3" />
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider truncate flex-1">
                            {parentItem.name}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                            {group.items.length - 1} sub
                          </span>
                        </div>
                      )}

                      {/* Items in this group */}
                      <div className="space-y-1">
                        {group.items.map((cat, idx) => {
                          const isRootItself = hasParent && idx === 0;
                          const isSelected = String(cat.id) === String(value);
                          const catColor = cat.color || parentColor || "#10b981";

                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleSelect(String(cat.id))}
                              className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2.5 cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-500/10 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                                  : "bg-white dark:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 text-slate-800 dark:text-slate-200"
                              } ${!isRootItself && hasParent ? "pl-4" : ""}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {!isRootItself && hasParent && (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs select-none">
                                    ↳
                                  </span>
                                )}
                                <span
                                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                                  style={{
                                    backgroundColor: `${catColor}18`,
                                    color: catColor,
                                    border: `1px solid ${catColor}30`,
                                  }}
                                >
                                  <CategoryIcon
                                    name={cat.icon || (isRootItself ? parentItem?.icon : undefined)}
                                    className="w-3.5 h-3.5"
                                  />
                                </span>
                                <div className="min-w-0 flex-1 truncate">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                    {cat.name}
                                  </span>
                                  {isRootItself && (
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      (Umum / Kategori Utama)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

