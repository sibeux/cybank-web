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
} from "lucide-react";
import { apiUrl } from "@/lib/api";

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
  const [mode, setMode] = useState<"accounts" | "direct">("accounts");

  // State to hold custom balances for each account (accountId -> number)
  const [accountBalances, setAccountBalances] = useState<{ [id: number]: string }>({});
  
  // Direct total target state
  const [directTotalInput, setDirectTotalInput] = useState<string>("");
  const [allocationTarget, setAllocationTarget] = useState<string>("auto"); // 'auto' | accountId string

  // Audit transaction checkbox & note
  const [recordAdjustment, setRecordAdjustment] = useState(true);
  const [note, setNote] = useState("Penyesuaian Saldo (Recount)");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset when modal opens or accounts change
  useEffect(() => {
    if (!isOpen) return;

    const initialMap: { [id: number]: string } = {};
    accounts.forEach((acc) => {
      initialMap[acc.id] = Math.round(acc.balance).toString();
    });
    setAccountBalances(initialMap);

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
      return Math.abs((finalVal ?? acc.balance) - acc.balance) > 0.01;
    });
  }, [accounts, finalAccountValues]);

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
    if (t === "BANK") return <Building2 className="w-4 h-4 text-sky-500" />;
    if (t === "EWALLET" || t === "E_WALLET") return <Smartphone className="w-4 h-4 text-purple-500" />;
    if (t === "CREDIT_CARD") return <CreditCard className="w-4 h-4 text-amber-500" />;
    return <Wallet className="w-4 h-4 text-emerald-500" />;
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
        balance: finalAccountValues[acc.id] ?? acc.balance,
      }));

      const res = await fetch(apiUrl("/api/v1/accounts/recount"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "recount",
          accounts: updates,
          recordAdjustment,
          note: note.trim() || "Penyesuaian Saldo (Recount)",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menyesuaikan saldo.");
      }

      onSuccess(data.data.accounts, data.data.totalBalance);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Terjadi kesalahan saat memproses recount saldo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-3xl w-full max-w-xl my-auto p-5 sm:p-6 space-y-5 shadow-2xl relative text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <SlidersHorizontal className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Recount & Sesuaikan Saldo
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sesuaikan saldo dompet & rekening agar sinkron dengan uang fisik atau bank Anda.
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
                Saldo Saat Ini
              </span>
              <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                {formatRupiah(currentTotal)}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Saldo Hasil Recount
              </span>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatRupiah(newTotal)}
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Selisih Total
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
                    Rp 0 (Sesuai)
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
            <span>Per Rekening & Dompet</span>
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
            <span>Ubah Total Langsung</span>
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
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {accounts.map((acc) => {
                const rawVal = accountBalances[acc.id] ?? Math.round(acc.balance).toLocaleString("id-ID");
                const currentVal = rawVal ? parseFloat(rawVal.replace(/\./g, "")) || 0 : 0;
                const accDiff = currentVal - acc.balance;

                return (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getAccountIcon(acc.type)}
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {acc.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Tercatat: {formatRupiah(acc.balance)}
                          </div>
                        </div>
                      </div>

                      {/* Diff Badge */}
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
                          <span className="text-[11px] text-slate-400">Tidak berubah</span>
                        )}
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
                        title="Kembalikan ke saldo awal"
                        className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetZero(acc)}
                        title="Set saldo ke 0"
                        className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition"
                      >
                        Nol
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: TOTAL SALDO LANGSUNG */}
          {mode === "direct" && (
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/60 dark:border-slate-800/80">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Target Total Saldo Baru (IDR)
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
                    Alokasikan Selisih ({formatRupiah(totalDiff)}) ke:
                  </label>
                  <select
                    value={allocationTarget}
                    onChange={(e) => setAllocationTarget(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={String(acc.id)}>
                        {acc.name} (Saldo sekarang: {formatRupiah(acc.balance)})
                      </option>
                    ))}
                    <option value="split">Bagi rata ke semua rekening ({accounts.length} akun)</option>
                  </select>
                </div>
              )}

              {/* Preview resulting accounts */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">
                  Pratinjau hasil penyesuaian:
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
                  Catat selisih sebagai transaksi Penyesuaian Saldo
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight block">
                  Membuat mutasi pemasukan/pengeluaran otomatis agar riwayat pembukuan tetap seimbang.
                </span>
              </div>
            </label>

            {recordAdjustment && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Catatan Transaksi
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="cth: Recount saldo fisik dompet, Audit akhir bulan..."
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
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !hasChanges}
              className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Saldo...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Terapkan Saldo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
