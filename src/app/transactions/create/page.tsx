"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
  Check,
  Calendar,
  FileText,
  Wallet,
  Delete,
  X,
} from "lucide-react";
import { apiFetch, readJson } from "@/lib/api";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getLocalDateTimeString } from "@/lib/date";

interface Account {
  id: number;
  name: string;
  type: string;
  balance?: number;
  currency?: string;
}

interface Category {
  id: number;
  name: string;
  type?: string | null;
  parent_id?: number | null;
  parentId?: number | null;
  parent_name?: string | null;
  icon?: string | null;
  color?: string | null;
}

type Step = "main" | "parent_category" | "child_category" | "account_picker";

export default function CreateTransactionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form State
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [transferToAccountId, setTransferToAccountId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getLocalDateTimeString);

  // Screen Navigation Stack: 'main' | 'parent_category' | 'child_category' | 'account_picker'
  const [step, setStep] = useState<Step>("main");
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);
  const [pickingAccountType, setPickingAccountType] = useState<"source" | "dest">("source");

  const [isNoteInputFocused, setIsNoteInputFocused] = useState(false);
  const noteInputRef = React.useRef<HTMLInputElement>(null);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [accRes, catRes] = await Promise.all([
          apiFetch("/api/v1/accounts"),
          apiFetch("/api/v1/categories"),
        ]);

        if (accRes.status === 401 || catRes.status === 401) {
          router.replace("/login");
          return;
        }

        const accJson = await readJson<{ success: boolean; data: Account[] }>(accRes);
        const catJson = await readJson<{ success: boolean; data: Category[] }>(catRes);

        const loadedAccounts = accJson?.data || [];
        setAccounts(loadedAccounts);
        if (loadedAccounts.length > 0) {
          setAccountId(String(loadedAccounts[0].id));
          if (loadedAccounts.length > 1) {
            setTransferToAccountId(String(loadedAccounts[1].id));
          }
        }

        const loadedCats = catJson?.data || [];
        setCategories(loadedCats);
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load accounts and categories");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Handle browser back button (PWA popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.pwaStep) {
        setStep(e.state.pwaStep);
      } else {
        setStep("main");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToStep = (nextStep: Step) => {
    window.history.pushState({ pwaStep: nextStep }, "", "");
    setStep(nextStep);
  };

  const navigateBack = () => {
    if (step === "child_category") {
      window.history.back();
      setStep("parent_category");
    } else if (step !== "main") {
      window.history.back();
      setStep("main");
    } else {
      router.back();
    }
  };

  // Numpad Handlers
  const rawDigits = amount.replace(/\D/g, "");

  const handleDigit = (digit: string) => {
    if (rawDigits.length >= 12) return;
    const nextRaw = (rawDigits === "0" ? "" : rawDigits) + digit;
    const num = parseInt(nextRaw, 10);
    setAmount(num > 0 ? num.toLocaleString("id-ID") : "");
  };

  const handleQuickAdd = (addZeros: string) => {
    if (!rawDigits || rawDigits === "0") return;
    if (rawDigits.length + addZeros.length > 12) return;
    const nextRaw = rawDigits + addZeros;
    const num = parseInt(nextRaw, 10);
    setAmount(num > 0 ? num.toLocaleString("id-ID") : "");
  };

  const handleBackspace = () => {
    if (!rawDigits || rawDigits.length <= 1) {
      setAmount("");
      return;
    }
    const nextRaw = rawDigits.slice(0, -1);
    const num = parseInt(nextRaw, 10);
    setAmount(num > 0 ? num.toLocaleString("id-ID") : "");
  };

  const handleClear = () => {
    setAmount("");
  };

  // Categories filtered by txType (EXPENSE/INCOME)
  const availableCategories = useMemo(() => {
    if (txType === "TRANSFER") return [];
    return categories.filter((c) => !c.type || c.type === txType);
  }, [categories, txType]);

  // Parent Categories (parent_id is null / 0)
  const parentCategories = useMemo(() => {
    return availableCategories.filter((c) => !c.parent_id && !c.parentId);
  }, [availableCategories]);

  // Child Categories for selectedParentCategory
  const childCategories = useMemo(() => {
    if (!selectedParentCategory) return [];
    const pId = selectedParentCategory.id;
    return availableCategories.filter((c) => (c.parent_id ?? c.parentId) === pId);
  }, [availableCategories, selectedParentCategory]);

  // Handle Parent Category Click
  const handleSelectParent = (cat: Category) => {
    const children = availableCategories.filter((c) => (c.parent_id ?? c.parentId) === cat.id);
    if (children.length > 0) {
      setSelectedParentCategory(cat);
      navigateToStep("child_category");
    } else {
      // Tidak punya anak, langsung pilih ini dan kembali ke main screen
      setSelectedCategory(cat);
      navigateBack();
    }
  };

  // Handle Child Category Click
  const handleSelectChild = (cat: Category) => {
    setSelectedCategory(cat);
    // Back dua langkah ke main
    window.history.go(-2);
    setStep("main");
  };

  // Handle Pick Parent as Direct Choice
  const handleSelectParentDirect = () => {
    if (selectedParentCategory) {
      setSelectedCategory(selectedParentCategory);
      window.history.go(-2);
      setStep("main");
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!amount) {
      setErrorMsg("Please enter an amount first");
      return;
    }
    if (!accountId) {
      setErrorMsg("Please select a source account");
      return;
    }
    if (txType === "TRANSFER" && (!transferToAccountId || transferToAccountId === accountId)) {
      setErrorMsg("Please select a different destination account");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const parsedAmount = parseFloat(amount.replace(/\./g, ""));
      const res = await apiFetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          transferToAccountId: txType === "TRANSFER" ? transferToAccountId : undefined,
          categoryId: selectedCategory ? selectedCategory.id : undefined,
          amount: parsedAmount,
          type: txType,
          note,
          transactionDate: new Date(date).toISOString(),
        }),
      });

      const json = await readJson<{ success: boolean; message?: string }>(res);
      if (json?.success) {
        router.replace("/dashboard");
      } else {
        setErrorMsg(json?.message || "Failed to save transaction");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("A network error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAccount = accounts.find((a) => String(a.id) === String(accountId));
  const selectedDestAccount = accounts.find((a) => String(a.id) === String(transferToAccountId));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400">
        <Sparkles className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col max-w-md mx-auto relative select-none">
      {/* ============================================================== */}
      {/* SCREEN 1: MAIN TRANSACTION ENTRY WITH INLINE NUMPAD            */}
      {/* ============================================================== */}
      {step === "main" && (
        <div className="h-full flex flex-col justify-between p-3.5 pb-4 overflow-hidden animate-in fade-in duration-150">
          {/* Top Bar */}
          <div className="flex flex-col shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <button
                type="button"
                onClick={navigateBack}
                className="p-1.5 -ml-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Type Segmented Pill */}
              <div className="flex bg-slate-200/80 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-300 dark:border-slate-800">
                {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTxType(t);
                      setSelectedCategory(null);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      txType === t
                        ? t === "EXPENSE"
                          ? "bg-rose-500 text-white shadow-xs"
                          : t === "INCOME"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-blue-500 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {t === "EXPENSE" ? "Expense" : t === "INCOME" ? "Income" : "Transfer"}
                  </button>
                ))}
              </div>

              <div className="w-8" />
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mt-1.5 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 px-2.5 py-1.5 rounded-xl flex items-center justify-between">
                <span>{errorMsg}</span>
                <X className="w-4 h-4 cursor-pointer" onClick={() => setErrorMsg(null)} />
              </div>
            )}

            {/* Display Nominal Card */}
            <div className="my-2 p-3.5 rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-900/40 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
              <div
                className={`absolute inset-x-0 top-0 h-1 ${
                  txType === "EXPENSE"
                    ? "bg-rose-500"
                    : txType === "INCOME"
                    ? "bg-emerald-500"
                    : "bg-blue-500"
                }`}
              />
              <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                Transaction Amount
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-lg font-black tracking-tight ${
                    txType === "EXPENSE"
                      ? "text-rose-500 dark:text-rose-400"
                      : txType === "INCOME"
                      ? "text-emerald-500 dark:text-emerald-400"
                      : "text-blue-500 dark:text-blue-400"
                  }`}
                >
                  Rp
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white min-h-[40px] drop-shadow-xs">
                  {amount || "0"}
                </span>
              </div>
            </div>

            {/* Selection Chips: Category & Accounts */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* Category Pill (Hidden if Transfer) */}
              {txType !== "TRANSFER" ? (
                <button
                  type="button"
                  onClick={() => navigateToStep("parent_category")}
                  className="group flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 active:scale-[0.98] transition-all text-left shadow-xs"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition group-hover:scale-105"
                    style={{
                      backgroundColor: selectedCategory?.color
                        ? `${selectedCategory.color}20`
                        : "#f1f5f9",
                      color: selectedCategory?.color || "#64748b",
                    }}
                  >
                    {selectedCategory ? (
                      <CategoryIcon
                        name={selectedCategory.icon || "Tag"}
                        className="w-4 h-4"
                      />
                    ) : (
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Category</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedCategory ? selectedCategory.name : "Select Category"}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPickingAccountType("dest");
                    navigateToStep("account_picker");
                  }}
                  className="group flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 active:scale-[0.98] transition-all text-left shadow-xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs transition group-hover:scale-105">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">To Account</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedDestAccount?.name || "Select Account"}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                </button>
              )}

              {/* Source Account Pill */}
              <button
                type="button"
                onClick={() => {
                  setPickingAccountType("source");
                  navigateToStep("account_picker");
                }}
                className="group flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 active:scale-[0.98] transition-all text-left shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-xs transition group-hover:scale-105">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    {txType === "TRANSFER" ? "From Account" : "Wallet / Account"}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {selectedAccount?.name || "Select Account"}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
              </button>
            </div>

            {/* Note & Date Details */}
            <div className="relative">
              <div className="flex items-center gap-2">
                {/* Note Input */}
                <div className="relative flex-1 flex items-center gap-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-xs transition-focus focus-within:border-emerald-500 dark:focus-within:border-emerald-500">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    ref={noteInputRef}
                    type="text"
                    enterKeyHint="done"
                    placeholder="Note (optional)..."
                    value={note}
                    onFocus={() => setIsNoteInputFocused(true)}
                    onBlur={() => {
                      // Slight delay to allow tap on accessory button
                      setTimeout(() => setIsNoteInputFocused(false), 150);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        noteInputRef.current?.blur();
                      }
                    }}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none flex-1 min-w-0"
                  />
                  {note && (
                    <button
                      type="button"
                      onClick={() => setNote("")}
                      className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Transaction Date & Time Picker */}
                <div className="relative shrink-0 flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        if (dateInputRef.current && "showPicker" in HTMLInputElement.prototype) {
                          dateInputRef.current.showPicker();
                        } else {
                          dateInputRef.current?.focus();
                        }
                      } catch {
                        dateInputRef.current?.focus();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs cursor-pointer text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 active:scale-95 transition"
                  >
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {new Date(date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {new Date(date).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </span>
                  </button>
                  <input
                    ref={dateInputRef}
                    type="datetime-local"
                    value={date}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDate(e.target.value);
                      }
                    }}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Keyboard Accessory Bar for Note Input */}
              {isNoteInputFocused && (
                <div className="absolute -bottom-8 left-0 right-0 z-20 flex justify-end animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      noteInputRef.current?.blur();
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold shadow-md active:scale-95 transition"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Fixed Area: Inline Numpad & Submit */}
          <div className="flex flex-col gap-2 shrink-0 pt-1">
            {/* Quick Add Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {["000", "0000", "50k", "100k"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    if (chip === "000") handleQuickAdd("000");
                    else if (chip === "0000") handleQuickAdd("0000");
                    else if (chip === "50k") setAmount((50000).toLocaleString("id-ID"));
                    else if (chip === "100k") setAmount((100000).toLocaleString("id-ID"));
                  }}
                  className="py-1 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 transition shadow-xs"
                >
                  {chip === "000" ? "+000" : chip === "0000" ? "+0.000" : `Rp ${chip}`}
                </button>
              ))}
            </div>

            {/* Numpad 3x4 */}
            <div className="grid grid-cols-3 gap-1.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigit(num)}
                  className="h-11 sm:h-12 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/90 active:bg-slate-200 dark:active:bg-slate-800 text-slate-900 dark:text-white text-xl font-semibold flex items-center justify-center border border-slate-200 dark:border-slate-800 active:scale-95 transition shadow-xs select-none"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-11 sm:h-12 rounded-xl bg-rose-100 dark:bg-rose-950/30 hover:bg-rose-200 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-base flex items-center justify-center border border-rose-200 dark:border-rose-800/30 active:scale-95 transition select-none"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleDigit("0")}
                className="h-11 sm:h-12 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-800 text-slate-900 dark:text-white text-xl font-semibold flex items-center justify-center border border-slate-200 dark:border-slate-800 active:scale-95 transition select-none shadow-xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 sm:h-12 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-slate-200 dark:border-slate-800 active:scale-95 transition select-none shadow-xs"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className={`w-full h-11 sm:h-12 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-98 ${
                txType === "EXPENSE"
                  ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 text-white"
                  : txType === "INCOME"
                  ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-white"
                  : "bg-blue-500 hover:bg-blue-600 shadow-blue-500/20 text-white"
              }`}
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              {submitting ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 2: SELECT PARENT CATEGORY (Parent Categories Only)      */}
      {/* ============================================================== */}
      {step === "parent_category" && (
        <div className="flex-1 flex flex-col p-4 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={navigateBack}
              className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Select Parent Category</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose primary category</p>
            </div>
          </div>

          {/* List Induk Kategori */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {parentCategories.map((cat) => {
              const children = availableCategories.filter(
                (c) => (c.parent_id ?? c.parentId) === cat.id
              );
              const hasChildren = children.length > 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectParent(cat)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-98 transition text-left shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                      style={{
                        backgroundColor: cat.color ? `${cat.color}25` : "#f1f5f9",
                        color: cat.color || "#0284c7",
                      }}
                    >
                      <CategoryIcon name={cat.icon || "Tag"} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{cat.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {hasChildren ? `${children.length} sub-categories` : "Direct category"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 3: SELECT CHILD CATEGORY (Sub-Categories)               */}
      {/* ============================================================== */}
      {step === "child_category" && selectedParentCategory && (
        <div className="flex-1 flex flex-col p-4 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={navigateBack}
              className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                style={{
                  backgroundColor: selectedParentCategory.color
                    ? `${selectedParentCategory.color}25`
                    : "#f1f5f9",
                  color: selectedParentCategory.color || "#0284c7",
                }}
              >
                <CategoryIcon
                  name={selectedParentCategory.icon || "Tag"}
                  className="w-4 h-4"
                />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{selectedParentCategory.name}</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose specific sub-category</p>
              </div>
            </div>
          </div>

          {/* List Sub-Kategori */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {/* Opsi: Pilih Induk Langsung */}
            <button
              type="button"
              onClick={handleSelectParentDirect}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-98 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    Use General ({selectedParentCategory.name})
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Without sub-category</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* List Children */}
            {childCategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleSelectChild(sub)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-98 transition text-left shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                    style={{
                      backgroundColor: sub.color ? `${sub.color}25` : "#f1f5f9",
                      color: sub.color || "#64748b",
                    }}
                  >
                    <CategoryIcon name={sub.icon || "Tag"} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{sub.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 4: SELECT ACCOUNT / DOMPET                              */}
      {/* ============================================================== */}
      {step === "account_picker" && (
        <div className="flex-1 flex flex-col p-4 animate-in slide-in-from-right duration-200">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={navigateBack}
              className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {pickingAccountType === "source"
                  ? txType === "TRANSFER"
                    ? "Select Source Account"
                    : "Select Account / Wallet"
                  : "Select Destination Account"}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose balance to use</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {accounts.map((acc) => {
              const isSelected =
                pickingAccountType === "source"
                  ? String(acc.id) === String(accountId)
                  : String(acc.id) === String(transferToAccountId);

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    if (pickingAccountType === "source") {
                      setAccountId(String(acc.id));
                    } else {
                      setTransferToAccountId(String(acc.id));
                    }
                    navigateBack();
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition text-left active:scale-98 shadow-xs ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{acc.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{acc.type}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
