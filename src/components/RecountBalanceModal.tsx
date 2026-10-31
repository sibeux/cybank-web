"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Wallet,
  CreditCard,
  Building2,
  Smartphone,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  HelpCircle,
  AlertCircle,
  Check,
  Target,
  Plus,
  Pencil,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useScrollLock } from "@/lib/useScrollLock";

export interface AccountItem {
  id: number;
  name: string;
  currency: string;
  type: string;
  balance: number;
}

interface RecountBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountItem[];
  formatRupiah: (val: number) => string;
  onSuccess: (updatedAccounts: AccountItem[], newTotalBalance: number) => void;
  initialAccountId?: number | null;
}

export default function RecountBalanceModal({
  isOpen,
  onClose,
  accounts,
  formatRupiah,
  onSuccess,
  initialAccountId = null,
}: RecountBalanceModalProps) {
  useScrollLock(isOpen);

  const [mode, setMode] = useState<"accounts" | "direct">("accounts");

  // State to hold custom balances for each account (accountId -> number)
  const [accountBalances, setAccountBalances] = useState<{ [id: number]: string }>({});
  const [accountTypes, setAccountTypes] = useState<{ [id: number]: string }>({});
  const [accountNames, setAccountNames] = useState<{ [id: number]: string }>({});
  const [editingNameId, setEditingNameId] = useState<number | null>(null);

  // New account form state
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("INVESTMENT");
  const [newAccBalance, setNewAccBalance] = useState("");
  const [isCreatingAcc, setIsCreatingAcc] = useState(false);
  
  // Direct total target state
  const [directTotalInput, setDirectTotalInput] = useState<string>("");
  const [allocationTarget, setAllocationTarget] = useState<string>("auto"); // 'auto' | accountId string

  // Audit transaction checkbox & note
  const [recordAdjustment, setRecordAdjustment] = useState(true);
  const [note, setNote] = useState("Balance Adjustment (Recount)");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset when modal opens or accounts change
  useEffect(() => {
    if (!isOpen) return;

    const initialMap: { [id: number]: string } = {};
    const initialTypes: { [id: number]: string } = {};
    const initialNames: { [id: number]: string } = {};

    accounts.forEach((acc) => {
      initialMap[acc.id] = Math.round(acc.balance).toString();
      initialTypes[acc.id] = (acc.type || "CASH").toUpperCase();
      initialNames[acc.id] = acc.name;
    });

    setAccountBalances(initialMap);
    setAccountTypes(initialTypes);
    setAccountNames(initialNames);
    setEditingNameId(null);
    setIsAddingAccount(false);

    const curTotal = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    setDirectTotalInput(Math.round(curTotal).toString());

    if (initialAccountId && accounts.some((a) => a.id === initialAccountId)) {
      setAllocationTarget(String(initialAccountId));
    } else {
      setAllocationTarget(accounts[0] ? String(accounts[0].id) : "auto");
    }

    setErrorMessage(null);
    setIsLoading(false);
  }, [isOpen, accounts, initialAccountId]);

  // Current total balance from original accounts
  const currentTotal = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [accounts]);

  // If in Direct mode, compute the resulting account balances based on target total
  const computedBalancesInDirectMode = useMemo(() => {
    const targetTotal = parseFloat(directTotalInput.replace(/\D/g, "")) || 0;
    const diff = targetTotal - currentTotal;

    const result: { [id: number]: number } = {};

    if (allocationTarget === "split" && accounts.length > 0) {
      // Split diff evenly
      const diffPerAccount = diff / accounts.length;
      accounts.forEach((acc) => {
        result[acc.id] = Math.round(acc.balance + diffPerAccount);
      });
    } else {
      // Allocate entire diff to chosen account
      const chosenId = parseInt(allocationTarget) || accounts[0]?.id || 0;
      accounts.forEach((acc) => {
        if (acc.id === chosenId) {
          result[acc.id] = Math.round(acc.balance + diff);
        } else {
          result[acc.id] = Math.round(acc.balance);
        }
      });
    }

    return result;
  }, [directTotalInput, currentTotal, allocationTarget, accounts]);

  // Calculate new total balance and diff depending on mode
  const { newTotal, totalDiff, finalAccountValues } = useMemo(() => {
    if (mode === "direct") {
      const target = parseFloat(directTotalInput.replace(/\D/g, "")) || 0;
      return {
        newTotal: target,
        totalDiff: target - currentTotal,
        finalAccountValues: computedBalancesInDirectMode,
      };
    } else {
      const vals: { [id: number]: number } = {};
      let sum = 0;
      accounts.forEach((acc) => {
        const raw = accountBalances[acc.id];
        const num = raw !== undefined && raw !== "" ? parseFloat(raw.replace(/\./g, "")) || 0 : acc.balance;
        vals[acc.id] = num;
        sum += num;
      });
      return {
        newTotal: sum,
        totalDiff: sum - currentTotal,
        finalAccountValues: vals,
      };
    }
  }, [mode, directTotalInput, currentTotal, computedBalancesInDirectMode, accounts, accountBalances]);

  // Check if any change was made
  const hasChanges = useMemo(() => {
    return accounts.some((acc) => {
      const finalVal = finalAccountValues[acc.id];
      const balanceChanged = Math.abs((finalVal ?? acc.balance) - acc.balance) > 0.01;
      const typeChanged = (accountTypes[acc.id] ?? acc.type) !== acc.type;
      const nameChanged = (accountNames[acc.id] ?? acc.name) !== acc.name;
      return balanceChanged || typeChanged || nameChanged;
    });
  }, [accounts, finalAccountValues, accountTypes, accountNames]);

  if (!isOpen) return null;

  const handleAccountBalanceChange = (accId: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    setAccountBalances((prev) => ({
      ...prev,
      [accId]: clean ? parseInt(clean, 10).toLocaleString("id-ID") : "",
    }));
  };

  const handleResetAccount = (acc: AccountItem) => {
    setAccountBalances((prev) => ({
      ...prev,
      [acc.id]: Math.round(acc.balance).toLocaleString("id-ID"),
    }));
  };

  const handleSetZero = (acc: AccountItem) => {
    setAccountBalances((prev) => ({
      ...prev,
      [acc.id]: "0",
    }));
  };

  const handleDirectTotalChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    setDirectTotalInput(clean ? parseInt(clean, 10).toLocaleString("id-ID") : "");
  };

  const getAccountIcon = (type: string) => {
    const t = (type || "").toUpperCase();
    if (t === "INVESTMENT") return <TrendingUp className="w-4 h-4 text-purple-500" />;
    if (t === "GOAL" || t === "SAVING" || t === "SAVINGS") return <Target className="w-4 h-4 text-amber-500" />;
    if (t === "BANK") return <Building2 className="w-4 h-4 text-sky-500" />;
    if (t === "EWALLET" || t === "E_WALLET") return <Smartphone className="w-4 h-4 text-violet-500" />;
    if (t === "CREDIT_CARD" || t === "LOAN") return <CreditCard className="w-4 h-4 text-rose-500" />;
    return <Wallet className="w-4 h-4 text-emerald-500" />;
  };

  const handleCreateNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    setIsCreatingAcc(true);
    setErrorMessage(null);

    try {
      const cleanBal = parseFloat(newAccBalance.replace(/\D/g, "")) || 0;
      const res = await apiFetch("/api/v1/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newAccName.trim(),
          type: newAccType,
          currency: "IDR",
          initialBalance: cleanBal,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create new account.");
      }

      const createdAcc: AccountItem = {
        id: data.data.id,
        name: data.data.name,
        type: data.data.type,
        currency: data.data.currency || "IDR",
        balance: Number(data.data.balance) || 0,
      };

      const updatedAccounts = [...accounts, createdAcc];
      const newTotal = updatedAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
      onSuccess(updatedAccounts, newTotal);
      setIsAddingAccount(false);
      setNewAccName("");
      setNewAccBalance("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to create new account.");
      }
    } finally {
      setIsCreatingAcc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const updates = accounts.map((acc) => ({
        id: acc.id,
        name: (accountNames[acc.id] ?? acc.name).trim(),
        type: (accountTypes[acc.id] ?? acc.type).toUpperCase(),
        balance: finalAccountValues[acc.id] ?? acc.balance,
      }));

      const res = await apiFetch("/api/v1/accounts/recount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "recount",
          accounts: updates,
          recordAdjustment,
          note: note.trim() || "Balance Adjustment (Recount)",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to adjust balance.");
      }

      onSuccess(data.data.accounts, data.data.totalBalance);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An error occurred while processing the balance recount.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-t sm:border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-xl my-0 sm:my-auto p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl relative text-slate-900 dark:text-slate-100 max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto"
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />
        
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <SlidersHorizontal className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Recount & Adjust Balance
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Adjust wallet & account balances to stay in sync with your physical cash or bank.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Comparison / Recount Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/80 dark:border-slate-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-center sm:text-left">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current Balance
              </span>
              <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                {formatRupiah(currentTotal)}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Recounted Balance
              </span>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatRupiah(newTotal)}
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Difference
              </span>
              <div className="mt-0.5 flex sm:justify-end items-center justify-center gap-1">
                {totalDiff > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{formatRupiah(totalDiff)}
                  </span>
                ) : totalDiff < 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                    <TrendingDown className="w-3.5 h-3.5" />
                    {formatRupiah(totalDiff)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Check className="w-3.5 h-3.5" />
                    Rp 0 (Matched)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("accounts")}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-2 ${
              mode === "accounts"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Per Account & Wallet</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("direct")}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-2 ${
              mode === "direct"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Set Total Directly</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/80 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* TAB 1: PER REKENING / DOMPET */}
          {mode === "accounts" && (
            <div className="space-y-3">
              {/* Header with Add Account Button */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Account List ({accounts.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingAccount((prev) => !prev)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingAccount ? "Close Form" : "Add New Account"}</span>
                </button>
              </div>

              {/* Form Tambah Akun Baru */}
              {isAddingAccount && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Create New Account / Pocket</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newAccName}
                        onChange={(e) => setNewAccName(e.target.value)}
                        placeholder="e.g. Bibit Mutual Fund, Laptop Savings"
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Account Type
                      </label>
                      <select
                        value={newAccType}
                        onChange={(e) => setNewAccType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="INVESTMENT">🔮 Investment Portfolio</option>
                        <option value="GOAL">🎯 Goal Savings / Sinking Fund</option>
                        <option value="BANK">🔵 Bank Account</option>
                        <option value="CASH">🟢 Cash</option>
                        <option value="EWALLET">🟣 E-Wallet</option>
                        <option value="CREDIT_CARD">💳 Credit Card</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Initial Balance (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={newAccBalance}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setNewAccBalance(val ? parseInt(val).toLocaleString("id-ID") : "");
                        }}
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingAccount(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isCreatingAcc || !newAccName.trim()}
                      onClick={handleCreateNewAccount}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
                    >
                      {isCreatingAcc ? "Saving..." : "Save Account"}
                    </button>
                  </div>
                </div>
              )}

              {/* Accounts Scrollable List */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {accounts.map((acc) => {
                  const rawVal = accountBalances[acc.id] ?? Math.round(acc.balance).toLocaleString("id-ID");
                  const currentVal = rawVal ? parseFloat(rawVal.replace(/\./g, "")) || 0 : 0;
                  const accDiff = currentVal - acc.balance;
                  const currentType = (accountTypes[acc.id] ?? acc.type).toUpperCase();
                  const currentName = accountNames[acc.id] ?? acc.name;
                  const isEditingThisName = editingNameId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getAccountIcon(currentType)}
                          <div className="min-w-0">
                            {isEditingThisName ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={currentName}
                                  onChange={(e) =>
                                    setAccountNames((prev) => ({ ...prev, [acc.id]: e.target.value }))
                                  }
                                  className="px-2 py-0.5 rounded-lg border border-emerald-500 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditingNameId(null)}
                                  className="p-1 rounded-md bg-emerald-500 text-slate-950 cursor-pointer"
                                  title="Finish renaming"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {currentName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingNameId(acc.id)}
                                  className="text-slate-400 hover:text-emerald-500 p-0.5 rounded cursor-pointer"
                                  title="Rename account"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400">
                              Recorded: {formatRupiah(acc.balance)}
                            </div>
                          </div>
                        </div>

                        {/* Right: Type dropdown & Diff Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={currentType}
                            onChange={(e) =>
                              setAccountTypes((prev) => ({
                                ...prev,
                                [acc.id]: e.target.value,
                              }))
                            }
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none transition ${
                              currentType === "INVESTMENT"
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                                : currentType === "GOAL" || currentType === "SAVING"
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                : currentType === "BANK"
                                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
                                : currentType === "EWALLET"
                                ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800"
                                : currentType === "CREDIT_CARD"
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                            }`}
                          >
                            <option value="CASH">Cash</option>
                            <option value="BANK">Bank</option>
                            <option value="EWALLET">E-Wallet</option>
                            <option value="INVESTMENT">Investment</option>
                            <option value="GOAL">Goal / Target</option>
                            <option value="CREDIT_CARD">Credit</option>
                          </select>

                          <div className="text-right">
                            {accDiff !== 0 ? (
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                  accDiff > 0
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                }`}
                              >
                                {accDiff > 0 ? `+${formatRupiah(accDiff)}` : formatRupiah(accDiff)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Tetap</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Input and quick buttons */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            Rp
                          </span>
                          <input
                            type="text"
                            value={accountBalances[acc.id] ?? ""}
                            onChange={(e) => handleAccountBalanceChange(acc.id, e.target.value)}
                            placeholder="0"
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResetAccount(acc)}
                          title="Restore original balance"
                          className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetZero(acc)}
                          title="Set balance to 0"
                          className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition"
                        >
                          Zero
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TOTAL SALDO LANGSUNG */}
          {mode === "direct" && (
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/60 dark:border-slate-800/80">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Target New Total Balance (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    value={directTotalInput}
                    onChange={(e) => handleDirectTotalChange(e.target.value)}
                    placeholder="0"
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {accounts.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Allocate Difference ({formatRupiah(totalDiff)}) to:
                  </label>
                  <select
                    value={allocationTarget}
                    onChange={(e) => setAllocationTarget(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={String(acc.id)}>
                        {acc.name} (Current balance: {formatRupiah(acc.balance)})
                      </option>
                    ))}
                    <option value="split">Split evenly across all accounts ({accounts.length} accounts)</option>
                  </select>
                </div>
              )}

              {/* Preview resulting accounts */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">
                  Preview of adjustment results:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {accounts.map((acc) => {
                    const resBal = computedBalancesInDirectMode[acc.id] ?? acc.balance;
                    return (
                      <div
                        key={acc.id}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-600 dark:text-slate-300 truncate mr-2">
                          {acc.name}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white shrink-0">
                          {formatRupiah(resBal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Audit options */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={recordAdjustment}
                onChange={(e) => setRecordAdjustment(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Record the difference as a Balance Adjustment transaction
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight block">
                  Automatically creates an income/expense entry so the bookkeeping history stays balanced.
                </span>
              </div>
            </label>

            {recordAdjustment && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Transaction Note
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Physical wallet recount, end-of-month audit..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !hasChanges}
              className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Saving Balances...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save & Apply Balance</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
