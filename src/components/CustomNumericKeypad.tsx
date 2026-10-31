"use client";

import React, { useEffect } from "react";
import { Delete, Check } from "lucide-react";

interface CustomNumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // e.g. "50.000" or raw
  onChange: (formattedValue: string) => void;
  title?: string;
}

export function CustomNumericKeypad({
  isOpen,
  onClose,
  value,
  onChange,
  title = "Masukkan Nominal",
}: CustomNumericKeypadProps) {
  // Prevent body scroll when keypad modal/sheet is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const rawDigits = value.replace(/\D/g, "");

  const handleDigit = (digit: string) => {
    if (rawDigits.length >= 12) return; // limit 999 milyar
    const nextRaw = (rawDigits === "0" ? "" : rawDigits) + digit;
    const num = parseInt(nextRaw, 10);
    onChange(num > 0 ? num.toLocaleString("id-ID") : "");
  };

  const handleQuickAdd = (addZeros: string) => {
    if (!rawDigits || rawDigits === "0") return;
    if (rawDigits.length + addZeros.length > 12) return;
    const nextRaw = rawDigits + addZeros;
    const num = parseInt(nextRaw, 10);
    onChange(num > 0 ? num.toLocaleString("id-ID") : "");
  };

  const handleBackspace = () => {
    if (!rawDigits || rawDigits.length <= 1) {
      onChange("");
      return;
    }
    const nextRaw = rawDigits.slice(0, -1);
    const num = parseInt(nextRaw, 10);
    onChange(num > 0 ? num.toLocaleString("id-ID") : "");
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop area */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet Content */}
      <div className="w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
        {/* Header handle & display */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-1 bg-slate-700 rounded-full mb-2 cursor-pointer" onClick={onClose} />
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-emerald-400">Rp</span>
            <span className="text-3xl font-extrabold tracking-tight text-white min-h-[38px]">
              {value || "0"}
            </span>
          </div>
        </div>

        {/* Quick add chips */}
        <div className="grid grid-cols-4 gap-2">
          {["000", "0000", "50rb", "100rb"].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                if (chip === "000") handleQuickAdd("000");
                else if (chip === "0000") handleQuickAdd("0000");
                else if (chip === "50rb") onChange((50000).toLocaleString("id-ID"));
                else if (chip === "100rb") onChange((100000).toLocaleString("id-ID"));
              }}
              className="py-1.5 text-xs font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 active:scale-95 transition"
            >
              {chip === "000" ? "+000" : chip === "0000" ? "+0.000" : `Rp ${chip}`}
            </button>
          ))}
        </div>

        {/* Numeric grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700/80 active:bg-slate-700 text-white text-2xl font-semibold flex items-center justify-center shadow-xs border border-slate-700/40 active:scale-95 transition select-none"
            >
              {num}
            </button>
          ))}

          {/* Row 4: C, 0, Backspace */}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 font-bold text-lg flex items-center justify-center border border-rose-800/30 active:scale-95 transition select-none"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700/80 active:bg-slate-700 text-white text-2xl font-semibold flex items-center justify-center shadow-xs border border-slate-700/40 active:scale-95 transition select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700/80 text-amber-400 flex items-center justify-center border border-slate-700/40 active:scale-95 transition select-none"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Done / OK button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          Selesai
        </button>
      </div>
    </div>
  );
}

