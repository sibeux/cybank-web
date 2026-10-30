"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Edit3,
  Calendar,
  Wallet,
  Tag,
  CreditCard,
  FileText,
  Building2,
  AlertCircle,
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { getLocalDateTimeString } from "@/lib/date";
import { buildCategorySelectGroups } from "@/lib/categories";
import { AccountItem } from "./RecountBalanceModal";

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
  categoryName: string;
  transferToAccountId?: number | null;
  transferToAccountName?: string | null;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
  accounts: AccountItem[];
  categories: Array<{ id: number; name: string; type: string; parent_id?: number | null }>;
  formatRupiah: (val: number) => string;
  onSuccess: (updatedTx: TransactionItem, accounts?: AccountItem[], newTotalBalance?: number) => void;
}

export default function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  accounts,
  categories,
  formatRupiah,
  onSuccess,
}: EditTransactionModalProps) {
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [transferToAccountId, setTransferToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [payee, setPayee] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when transaction prop changes
  useEffect(() => {
    if (!transaction) return;

    const rawType = (transaction.type || "EXPENSE").toUpperCase();
    const resolvedType = rawType === "INCOME" || rawType === "TRANSFER" ? rawType : "EXPENSE";
    setTxType(resolvedType as "EXPENSE" | "INCOME" | "TRANSFER");

    // Format amount with dots
    const intAmount = Math.round(Number(transaction.amount) || 0);
    setAmount(intAmount > 0 ? intAmount.toLocaleString("id-ID") : "");

    // Account ID fallback by matching accountName
    let matchedAccId = transaction.accountId ? String(transaction.accountId) : "";
    if (!matchedAccId && transaction.accountName) {
      const found = accounts.find((a) => a.name.toLowerCase() === transaction.accountName.toLowerCase());
      if (found) matchedAccId = String(found.id);
    }
    if (!matchedAccId && accounts.length > 0) {
      matchedAccId = String(accounts[0].id);
    }
    setAccountId(matchedAccId);

    // Transfer target account
    let matchedTransferId = transaction.transferToAccountId ? String(transaction.transferToAccountId) : "";
    if (!matchedTransferId && transaction.transferToAccountName) {
      const foundTta = accounts.find((a) => a.name.toLowerCase() === (transaction.transferToAccountName || "").toLowerCase());
      if (foundTta) matchedTransferId = String(foundTta.id);
    }
    if (!matchedTransferId) {
      const altAcc = accounts.find((a) => String(a.id) !== matchedAccId);
      if (altAcc) matchedTransferId = String(altAcc.id);
    }
    setTransferToAccountId(matchedTransferId);

    // Category ID fallback by matching categoryName
    let matchedCatId = transaction.categoryId ? String(transaction.categoryId) : "";
    if (!matchedCatId && transaction.categoryName && transaction.categoryName !== "General" && transaction.categoryName !== "Transfer") {
      const foundCat = categories.find((c) => c.name.toLowerCase() === transaction.categoryName.toLowerCase());
      if (foundCat) matchedCatId = String(foundCat.id);
    }
    setCategoryId(matchedCatId);

    setPaymentType(transaction.paymentType || (resolvedType === "TRANSFER" ? "TRANSFER" : "CASH"));
    setPayee(transaction.payee || "");
    setNote(transaction.note || "");

    // Format date for datetime-local (YYYY-MM-DDTHH:mm)
    try {
      const d = new Date(transaction.transactionDate);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDate(formattedDate);
      } else {
        setDate(getLocalDateTimeString());
      }
    } catch {
      setDate(getLocalDateTimeString());
    }

    setErrorMessage(null);
  }, [transaction, accounts, categories]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount.replace(/\./g, ""));
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage("Transaction amount must be greater than 0.");
      return;
    }

    if (!accountId) {
      setErrorMessage("Select a transaction account/wallet.");
      return;
    }

    if (txType === "TRANSFER" && (!transferToAccountId || transferToAccountId === accountId)) {
      setErrorMessage("Select a different destination account for the transfer.");
      return;
    }

    setIsLoading(true);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cybank_token") : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        id: transaction.id,
        accountId: parseInt(accountId),
        transferToAccountId: txType === "TRANSFER" ? parseInt(transferToAccountId) : null,
        categoryId: txType !== "TRANSFER" && categoryId ? parseInt(categoryId) : null,
        amount: parsedAmount,
        type: txType,
        paymentType: paymentType || (txType === "TRANSFER" ? "TRANSFER" : "CASH"),
        payee: payee.trim() || null,
        note: note.trim() || null,
        transactionDate: new Date(date).toISOString(),
      };

      const res = await fetch(apiUrl("/api/v1/transactions"), {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update transaction.");
      }

      // Build updated transaction item
      const updatedTx: TransactionItem = json.data || {
        ...transaction,
        amount: parsedAmount,
        type: txType,
        paymentType: payload.paymentType,
        note: payload.note,
        payee: payload.payee,
        transactionDate: payload.transactionDate,
        accountId: payload.accountId,
        accountName: accounts.find((a) => String(a.id) === accountId)?.name || transaction.accountName,
        transferToAccountId: payload.transferToAccountId,
        transferToAccountName: txType === "TRANSFER" ? accounts.find((a) => String(a.id) === transferToAccountId)?.name || null : null,
        categoryId: payload.categoryId,
        categoryName: txType === "TRANSFER" ? "Transfer" : categories.find((c) => String(c.id) === categoryId)?.name || "General",
      };

      onSuccess(updatedTx, json.accounts, json.totalBalance);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while saving changes.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border-t sm:border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Transaction
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transaction ID #{transaction.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Transaction Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTxType("EXPENSE")}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  txType === "EXPENSE"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Expense</span>
              </button>
              <button
                type="button"
                onClick={() => setTxType("INCOME")}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  txType === "INCOME"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Income</span>
              </button>
              <button
                type="button"
                onClick={() => setTxType("TRANSFER")}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  txType === "TRANSFER"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Transfer</span>
              </button>
            </div>
          </div>

          {/* 2. Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Amount (IDR) <span className="text-rose-500">*</span>
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
                className={`w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-100 border text-lg font-bold focus:outline-none transition ${
                  txType === "EXPENSE"
                    ? "border-rose-200 dark:border-rose-900/40 focus:border-rose-500 text-rose-600 dark:text-rose-400"
                    : txType === "INCOME"
                    ? "border-emerald-200 dark:border-emerald-900/40 focus:border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-indigo-200 dark:border-indigo-900/40 focus:border-indigo-500 text-indigo-600 dark:text-indigo-400"
                } dark:bg-slate-950`}
              />
            </div>
          </div>

          {/* 3. Account Selection */}
          {txType === "TRANSFER" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  From Account (Source) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                  To Account (Destination) <span className="text-rose-500">*</span>
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
                        {acc.name} ({formatRupiah(acc.balance)})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Wallet / Account <span className="text-rose-500">*</span>
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

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Select Category (Optional)</option>
                  {buildCategorySelectGroups(categories, txType).map((group) =>
                    group.parent ? (
                      <optgroup key={group.parent.id} label={group.parent.name}>
                        {group.items.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.id === group.parent!.id
                              ? `${cat.name} (general)`
                              : `— ${cat.name}`}
                          </option>
                        ))}
                      </optgroup>
                    ) : (
                      <option key={group.items[0].id} value={group.items[0].id}>
                        {group.items[0].name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          )}

          {/* 4. Payment Method & Payee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
                <option value="EWALLET">E-Wallet (GoPay, OVO, ShopeePay)</option>
                <option value="QRIS">QRIS</option>
                <option value="CREDIT_CARD">Credit / Debit Card</option>
                <option value="TRANSFER">Inter-Account Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Payee / Merchant
              </label>
              <input
                type="text"
                placeholder="e.g. Indomaret, Tokopedia, Office..."
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 5. Note / Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Note / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Lunch, weekly groceries, salary..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 6. Date & Time */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Transaction Date & Time <span className="text-rose-500">*</span>
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
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

