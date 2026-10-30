"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import gitCommitsFeed from "@/data/git-commits.json";
import {
  Wallet,
  ArrowRight,
  GitBranch,
  GitCommit,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Cpu,
  Database,
  Server,
  Code2,
  ExternalLink,
  User,
  Mail,
  Globe,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Sparkles,
  Lock,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  Terminal,
  Check,
  Copy,
  Activity,
  ArrowUpRight,
  Menu,
  X,
  Smartphone,
  Eye,
  DollarSign,
  Briefcase,
  HelpCircle,
  Building2,
  FileText
} from "lucide-react";

/* ---------------------------------------------------------------------------
 * Interactive preview dataset — deterministic mock data for the landing demo.
 * The KPI cards, chart and reconciliation panel all derive from these values,
 * so switching timeframe or account always keeps the numbers self-consistent.
 * ------------------------------------------------------------------------- */

type GitCommitEntry = {
  hash: string;
  date: string;
  tag: string;
  message: string;
  author: string;
};

type PreviewAccount = {
  id: string;
  group: string;
  name: string;
  balance: number;
  kind: string;
  icon: "bank" | "cash" | "wallet" | "invest";
  tint: string;
};

type PreviewTransaction = {
  id: string;
  kind: "IN" | "OUT" | "TRF";
  title: string;
  accountId: string;
  category: string;
  amount: number;
  time: string;
  entryId: string;
  source: string;
  hash: string;
};

type PreviewExpenseCategory = {
  name: string;
  amount: number;
  bar: string;
  entries: number;
  top: string;
};

const PREVIEW_INCOME_TOTAL = 14_800_000;
const PREVIEW_EXPENSE_TOTAL = 6_350_000;
const PREVIEW_DAILY_BUDGET = 250_000;

const PREVIEW_INFLOW_WEIGHTS = [
  40, 65, 30, 85, 95, 45, 60, 75, 50, 90, 100, 70, 80, 65, 88,
  52, 68, 44, 78, 92, 58, 72, 86, 64, 96, 50, 74, 62, 88, 70,
];

const PREVIEW_OUTFLOW_WEIGHTS = [
  55, 32, 78, 41, 66, 52, 29, 71, 48, 60, 35, 74, 45, 58, 50,
  63, 38, 70, 42, 55, 66, 33, 59, 47, 61, 52, 68, 40, 57, 45,
];

// Spreads a period total over daily weights, snapping to Rp 1.000 so the
// chart bars and the summed KPI figures always agree exactly.
function spreadAcrossDays(weights: number[], total: number) {
  const weightSum = weights.reduce((acc, val) => acc + val, 0);
  const days = weights.map((weight) => Math.round(((weight * total) / weightSum) / 1000) * 1000);
  days[days.length - 1] += total - days.reduce((acc, val) => acc + val, 0);
  return days;
}

const PREVIEW_DAYS = (() => {
  const inflow = spreadAcrossDays(PREVIEW_INFLOW_WEIGHTS, PREVIEW_INCOME_TOTAL);
  const outflow = spreadAcrossDays(PREVIEW_OUTFLOW_WEIGHTS, PREVIEW_EXPENSE_TOTAL);
  return inflow.map((value, idx) => ({
    day: idx + 1,
    label: `Oct ${idx + 1}`,
    inflow: value,
    outflow: outflow[idx],
    net: value - outflow[idx],
  }));
})();

const PREVIEW_ACCOUNTS: PreviewAccount[] = [
  { id: "bca", group: "Primary Bank", name: "BCA Prioritas", balance: 24_500_000, kind: "BANK", icon: "bank", tint: "text-blue-600" },
  { id: "jago", group: "Digital Banking", name: "Bank Jago Kantong", balance: 12_750_000, kind: "BANK", icon: "bank", tint: "text-amber-600" },
  { id: "cash", group: "Cash Wallet", name: "Physical Cash", balance: 1_500_000, kind: "CASH", icon: "cash", tint: "text-emerald-600" },
  { id: "gopay", group: "E-Wallet", name: "GoPay Balance", balance: 3_500_000, kind: "EWALLET", icon: "wallet", tint: "text-teal-600" },
  { id: "bibit", group: "Investments", name: "Bibit Mutual Funds", balance: 6_000_000, kind: "INVESTMENT", icon: "invest", tint: "text-indigo-600" },
];

const PREVIEW_EXPENSE_CATEGORIES: PreviewExpenseCategory[] = [
  { name: "Food & Dining", amount: 2_450_000, bar: "bg-amber-500", entries: 14, top: "Purnomo Bites" },
  { name: "Bills & Utilities", amount: 1_800_000, bar: "bg-indigo-500", entries: 6, top: "PLN & Indihome" },
  { name: "Transportation", amount: 1_100_000, bar: "bg-cyan-500", entries: 11, top: "Gojek Commute" },
  { name: "Entertainment & Leisure", amount: 1_000_000, bar: "bg-rose-500", entries: 8, top: "Steam & Netflix" },
];

const PREVIEW_TRANSACTIONS: PreviewTransaction[] = [
  { id: "TXN-9F2C", kind: "IN", title: "Software Engineer Monthly Salary", accountId: "bca", category: "Salary & Wages", amount: 12_500_000, time: "Oct 30, 2026, 09:00", entryId: "LE-20261030-0912", source: "Web SPA", hash: "8f31c0a4" },
  { id: "TXN-4B71", kind: "OUT", title: "VPS Cloud Server Subscription", accountId: "jago", category: "Cloud Infrastructure", amount: -350_000, time: "Oct 30, 2026, 14:15", entryId: "LE-20261030-1415", source: "Web SPA", hash: "2ac9be10" },
  { id: "TXN-1D08", kind: "TRF", title: "Cash Top-up for Daily Operations", accountId: "cash", category: "Internal Transfer", amount: 500_000, time: "Oct 30, 2026, 16:30", entryId: "LE-20261030-1630", source: "Android Kotlin", hash: "f4710dce" },
  { id: "TXN-7E55", kind: "OUT", title: "Warung Lunch & Iced Coffee", accountId: "cash", category: "Food & Dining", amount: -85_000, time: "Oct 30, 2026, 12:40", entryId: "LE-20261030-1240", source: "Android Kotlin", hash: "b5d207fa" },
  { id: "TXN-3A19", kind: "OUT", title: "Gojek Commute to Office", accountId: "gopay", category: "Transportation", amount: -24_000, time: "Oct 30, 2026, 07:55", entryId: "LE-20261030-0755", source: "E-Wallet Sync", hash: "c0e517ad" },
  { id: "TXN-8C62", kind: "IN", title: "Freelance Landing Page Project", accountId: "jago", category: "Freelance Income", amount: 2_100_000, time: "Oct 29, 2026, 18:20", entryId: "LE-20261029-1820", source: "Web SPA", hash: "93ba7c21" },
  { id: "TXN-2F94", kind: "OUT", title: "PLN Postpaid & Internet Bill", accountId: "bca", category: "Bills & Utilities", amount: -820_000, time: "Oct 28, 2026, 10:05", entryId: "LE-20261028-1005", source: "CSV Import", hash: "1de64b8f" },
  { id: "TXN-6D30", kind: "TRF", title: "Bibit Mutual Fund Auto-Deposit", accountId: "bibit", category: "Internal Transfer", amount: 500_000, time: "Oct 28, 2026, 06:00", entryId: "LE-20261028-0600", source: "Scheduler", hash: "7a02fc5d" },
];

const PREVIEW_RECOUNT_LOG = [
  "auth.verify(bearer) → JWT signature OK · user_id resolved",
  "SELECT * FROM cybank_accounts WHERE user_id = ? AND status = 'ACTIVE'",
  "5 accounts loaded · currency guard enforced (IDR only)",
  "SUM(income) - SUM(expense) GROUP BY account_id",
  "Derived mathematical ledger sum from transaction trail",
  "Diff against recorded balances · drift tolerance Rp 1",
  "Audit integrity pass · 0 orphan entries · 0 duplicate hashes",
  "Reconciliation finished · status BALANCED",
];

function formatPreviewRupiah(val: number) {
  const isNegative = val < 0;
  const absVal = Math.round(Math.abs(val));
  const parts = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${isNegative ? "-" : ""}Rp ${parts}`;
}

function getPreviewAccount(id: string) {
  return PREVIEW_ACCOUNTS.find((account) => account.id === id) ?? null;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"overview" | "accounts" | "transactions" | "recount">("overview");
  const [copiedClone, setCopiedClone] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Interactive dashboard-preview controls (local mock state, no API calls)
  const [previewRange, setPreviewRange] = useState<7 | 14 | 30>(30);
  const [previewMasked, setPreviewMasked] = useState(false);
  const [previewSeries, setPreviewSeries] = useState({ inflow: true, outflow: true, budget: true });
  const [previewHoverDay, setPreviewHoverDay] = useState<number | null>(null);
  const [previewSelectedDay, setPreviewSelectedDay] = useState<number | null>(null);
  const [previewSelectedCategory, setPreviewSelectedCategory] = useState<string | null>(null);
  const [previewSelectedAccount, setPreviewSelectedAccount] = useState<string | null>(null);
  const [previewTxKind, setPreviewTxKind] = useState<"all" | "IN" | "OUT" | "TRF">("all");
  const [previewExpandedTx, setPreviewExpandedTx] = useState<string | null>(null);
  const [previewRecountRunning, setPreviewRecountRunning] = useState(false);
  const [previewRecountStep, setPreviewRecountStep] = useState(0);

  useEffect(() => {
    // Check if user is already logged in
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("cybank_token");
      if (token) {
        setIsLoggedIn(true);
      }
    }
  }, []);

  useEffect(() => {
    // Streams the simulated reconciliation engine output line by line
    if (!previewRecountRunning) return;
    const timer = setTimeout(() => {
      if (previewRecountStep >= PREVIEW_RECOUNT_LOG.length) {
        setPreviewRecountRunning(false);
      } else {
        setPreviewRecountStep((step) => step + 1);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [previewRecountRunning, previewRecountStep]);

  const previewVisibleDays = PREVIEW_DAYS.slice(-previewRange);
  const previewIncomeTotal = previewVisibleDays.reduce((acc, day) => acc + day.inflow, 0);
  const previewExpenseTotal = previewVisibleDays.reduce((acc, day) => acc + day.outflow, 0);
  const previewNetTotal = previewIncomeTotal - previewExpenseTotal;
  const previewBarMax = Math.max(
    1,
    ...previewVisibleDays.flatMap((day) => [
      previewSeries.inflow ? day.inflow : 0,
      previewSeries.outflow ? day.outflow : 0,
    ]),
  );
  const previewPortfolioBalance = PREVIEW_ACCOUNTS.reduce((acc, account) => acc + account.balance, 0);
  const previewBudgetLine = Math.min(100, (PREVIEW_DAILY_BUDGET / previewBarMax) * 100);
  const previewExpenseRatio =
    previewIncomeTotal > 0 ? ((previewExpenseTotal / previewIncomeTotal) * 100).toFixed(1) : "0";
  const previewMask = (val: number) => (previewMasked ? "Rp ••••••" : formatPreviewRupiah(val));
  const previewAccount = previewSelectedAccount ? getPreviewAccount(previewSelectedAccount) : null;
  const previewHoveredData = PREVIEW_DAYS.find((day) => day.day === previewHoverDay) ?? null;
  const previewSelectedData = PREVIEW_DAYS.find((day) => day.day === previewSelectedDay) ?? null;
  const previewTransactions = PREVIEW_TRANSACTIONS.filter(
    (tx) =>
      (!previewSelectedAccount || tx.accountId === previewSelectedAccount) &&
      (previewTxKind === "all" || tx.kind === previewTxKind),
  );
  const previewRecountFinished = previewRecountStep >= PREVIEW_RECOUNT_LOG.length;
  const previewRecountProgress = Math.round((previewRecountStep / PREVIEW_RECOUNT_LOG.length) * 100);

  const runPreviewRecount = () => {
    setPreviewRecountStep(0);
    setPreviewRecountRunning(true);
  };

  const togglePreviewSeries = (series: keyof typeof previewSeries) => {
    setPreviewSeries((current) => ({ ...current, [series]: !current[series] }));
  };

  const copyCloneCommand = () => {
    navigator.clipboard.writeText("git clone https://github.com/sibeux/cybank-web.git");
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  /* Commit feed is generated at build time by scripts/generate-git-commits.mjs
   * (npm run gen:commits), wired into .github/workflows/deploy.yml, so this
   * section always reflects the git history of the commit being deployed. */
  const gitCommits: GitCommitEntry[] = gitCommitsFeed.commits;
  const gitBranch = gitCommitsFeed.branch || "origin/main";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-xs font-medium py-2 px-4 text-center border-b border-emerald-500/20">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide">
            <Sparkles className="w-3 h-3 text-emerald-200" />
            CYBANK ENTERPRISE v0.1.0
          </span>
          <span>High-Performance Personal Finance & Cashflow Ledger.</span>
          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="underline underline-offset-2 hover:text-emerald-100 font-semibold inline-flex items-center gap-0.5 ml-1"
          >
            {isLoggedIn ? "Access Dashboard" : "Get Started Now"} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-200">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  Cybank
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md">
                  Web & API
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-none">
                Enterprise Cashflow Ledger
              </p>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">
              Features
            </a>
            <a href="#preview" className="hover:text-emerald-600 transition-colors">
              Live Mockup
            </a>
            <a href="#architecture" className="hover:text-emerald-600 transition-colors">
              Architecture
            </a>
            <a href="#git-status" className="hover:text-emerald-600 transition-colors flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              Git & Releases
            </a>
            <a href="#developer" className="hover:text-emerald-600 transition-colors">
              Developer
            </a>
            <a href="#api-docs" className="hover:text-emerald-600 transition-colors">
              API
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href="https://github.com/sibeux/cybank-web"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition"
            >
              <Code2 className="w-4 h-4 text-slate-600" />
              GitHub
              <span className="ml-1 px-1.5 py-0.2 bg-white text-slate-600 rounded text-[10px] font-mono border border-slate-200">
                28
              </span>
            </a>

            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/25 transition active:scale-95"
              >
                <span>Launch Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition active:scale-95"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                Features
              </a>
              <a
                href="#preview"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                Live Mockup
              </a>
              <a
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                System Architecture
              </a>
              <a
                href="#git-status"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Git & Releases Telemetri</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600 font-mono">28 Commits</span>
              </a>
              <a
                href="#developer"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                Developer Profile
              </a>
              <a
                href="#api-docs"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                API Endpoints
              </a>
            </nav>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <a
                href="https://github.com/sibeux/cybank-web"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl"
              >
                View on GitHub
              </a>
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="w-full text-center py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-xl"
              >
                {isLoggedIn ? "Launch Dashboard" : "Sign In"}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Glow ambient effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-200/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-teal-100/50 rounded-full blur-2xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 text-xs font-medium shadow-xs mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-500 font-normal">Sibeux Enterprise Ecosystem:</span>
              <span className="font-semibold text-emerald-700">Cybank Web & Android Platform</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
              Master Your Personal Cashflow & Finances with{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Enterprise Standards
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              High-performance multi-account ledger with audit trails, automatic balance reconciliation, visual cashflow analytics, and seamless Cybeat SSO authentication.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <span>{isLoggedIn ? "Launch My Dashboard" : "Access Demo & Dashboard"}</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </Link>

              <a
                href="#preview"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm border border-slate-200 shadow-xs transition"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span>Explore Live Mockup</span>
              </a>

              <a
                href="#git-status"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 font-semibold text-sm border border-emerald-200/80 transition"
              >
                <GitBranch className="w-4 h-4 text-emerald-600" />
                <span>Git Telemetri</span>
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
              <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Balance Accuracy</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">100%</p>
                <p className="text-[11px] text-emerald-600 font-medium">Auto Recount Balance</p>
              </div>
              <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Architecture</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">Decoupled</p>
                <p className="text-[11px] text-slate-500">Next.js 16 + PHP REST</p>
              </div>
              <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Authentication</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">Cybeat SSO</p>
                <p className="text-[11px] text-teal-600 font-medium">Stateless JWT Bearer</p>
              </div>
              <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Supported Clients</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">Web + Mobile</p>
                <p className="text-[11px] text-slate-500">SPA & Android Kotlin</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Enterprise Live Preview Section */}
      <section id="preview" className="py-16 bg-white border-y border-slate-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Enterprise Dashboard Simulation
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                Interactive Cybank Dashboard Preview
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Simulated ledger data — switch timeframes, pin a chart column, scope an account and run the recount
                engine without leaving this page.
              </p>
            </div>

            {/* Preview Navigation Tabs */}
            <div className="flex min-w-0 max-w-full overflow-x-auto p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActivePreviewTab("overview")}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activePreviewTab === "overview"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cash Overview
              </button>
              <button
                onClick={() => setActivePreviewTab("accounts")}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activePreviewTab === "accounts"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Multi-Account
              </button>
              <button
                onClick={() => setActivePreviewTab("transactions")}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activePreviewTab === "transactions"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Transaction History
              </button>
              <button
                onClick={() => setActivePreviewTab("recount")}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activePreviewTab === "recount"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Audit & Recount
              </button>
            </div>
          </div>

          {/* Simulated App Container */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50 shadow-xl overflow-hidden">
            {/* Window chrome topbar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="ml-2 text-xs font-mono text-slate-400">
                  cybank.sibeux.my.id/dashboard
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  SSO Connected
                </span>
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                >
                  Open Full App <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Inner Content based on activePreviewTab */}
            <div className="p-6">
              {activePreviewTab === "overview" && (
                <div className="space-y-6">
                  {/* Period & Privacy Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 max-w-full overflow-x-auto p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                      {([7, 14, 30] as const).map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => {
                            setPreviewRange(range);
                            setPreviewSelectedDay(null);
                            setPreviewHoverDay(null);
                          }}
                          className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition cursor-pointer ${
                            previewRange === range
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Last {range} Days
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewMasked((masked) => !masked)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        previewMasked
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {previewMasked ? "Amounts Hidden" : "Hide Amounts"}
                    </button>
                  </div>

                  {/* Top 4 KPI Metrics — every figure derives from the active timeframe */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Total Portfolio Balance</span>
                        <Wallet className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-2xl font-bold text-slate-950 mt-1">{previewMask(previewPortfolioBalance)}</p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{previewMask(previewNetTotal)} net · last {previewRange} days</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>{`Income · Last ${previewRange} Days`}</span>
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">+{previewMask(previewIncomeTotal)}</p>
                      <p className="mt-2 text-[11px] text-slate-500">Salary, Freelance, & Dividends</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>{`Expense · Last ${previewRange} Days`}</span>
                        <BarChart3 className="w-4 h-4 text-rose-500" />
                      </div>
                      <p className="text-2xl font-bold text-rose-600 mt-1">{previewMask(-previewExpenseTotal)}</p>
                      <p className="mt-2 text-[11px] text-slate-500">{previewExpenseRatio}% of total income</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Net Cashflow</span>
                        <CheckCircle2
                          className={`w-4 h-4 ${previewNetTotal >= 0 ? "text-teal-600" : "text-rose-500"}`}
                        />
                      </div>
                      <p
                        className={`text-2xl font-bold mt-1 ${
                          previewNetTotal >= 0 ? "text-slate-950" : "text-rose-600"
                        }`}
                      >
                        {previewMask(previewNetTotal)}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-teal-700 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span>{previewNetTotal >= 0 ? "Surplus retained" : "Deficit this period"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cashflow Graphic Simulation */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm">{`Cashflow Trend · Last ${previewRange} Days`}</h4>
                          <p className="text-xs text-slate-500">Hover a column for exact figures, click to pin it</p>
                        </div>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                            previewNetTotal >= 0
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-rose-700 bg-rose-50 border-rose-200"
                          }`}
                        >
                          {previewNetTotal >= 0 ? "Positive Surplus" : "Negative Drift"}
                        </span>
                      </div>
                      {/* Interactive Chart Bars */}
                      <div className="relative h-44 flex items-end gap-1 sm:gap-1.5 pt-8 pb-2 border-b border-slate-100">
                        {previewSeries.budget && (
                          <div
                            className="absolute inset-x-0 border-t border-dashed border-slate-300 pointer-events-none"
                            style={{ bottom: `${previewBudgetLine}%` }}
                          >
                            <span className="absolute -top-4 right-0 text-[9px] font-mono text-slate-400">
                              {`budget ${formatPreviewRupiah(PREVIEW_DAILY_BUDGET)}/day`}
                            </span>
                          </div>
                        )}

                        {previewVisibleDays.map((day) => {
                          const pinned = previewSelectedDay === day.day;
                          return (
                            <button
                              key={day.day}
                              type="button"
                              onMouseEnter={() => setPreviewHoverDay(day.day)}
                              onMouseLeave={() => setPreviewHoverDay(null)}
                              onFocus={() => setPreviewHoverDay(day.day)}
                              onBlur={() => setPreviewHoverDay(null)}
                              onClick={() => setPreviewSelectedDay(pinned ? null : day.day)}
                              aria-pressed={pinned}
                              aria-label={`${day.label} cashflow`}
                              className={`flex-1 h-full flex items-end justify-center gap-0.5 rounded-md transition cursor-pointer ${
                                pinned ? "bg-emerald-50 ring-1 ring-emerald-300" : "hover:bg-slate-50"
                              }`}
                            >
                              {previewSeries.inflow && (
                                <div
                                  style={{ height: `${Math.max(4, (day.inflow / previewBarMax) * 100)}%` }}
                                  className="w-1/2 max-w-[9px] bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-sm"
                                ></div>
                              )}
                              {previewSeries.outflow && (
                                <div
                                  style={{ height: `${Math.max(4, (day.outflow / previewBarMax) * 100)}%` }}
                                  className="w-1/2 max-w-[9px] bg-gradient-to-t from-rose-500 to-rose-300 rounded-t-sm"
                                ></div>
                              )}
                            </button>
                          );
                        })}

                        {/* Hover / pinned tooltip */}
                        {(() => {
                          const tipDay = previewHoveredData ?? previewSelectedData;
                          if (!tipDay) return null;
                          const tipIndex = previewVisibleDays.findIndex((day) => day.day === tipDay.day);
                          if (tipIndex < 0) return null;
                          const tipLeft = Math.min(
                            86,
                            Math.max(14, ((tipIndex + 0.5) / previewVisibleDays.length) * 100),
                          );
                          return (
                            <div
                              className="absolute top-0 z-10 -translate-x-1/2 pointer-events-none rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 shadow-md"
                              style={{ left: `${tipLeft}%` }}
                            >
                              <p className="text-[10px] font-bold text-slate-900">{tipDay.label}</p>
                              <p className="text-[10px] font-mono text-emerald-600">+{previewMask(tipDay.inflow)}</p>
                              <p className="text-[10px] font-mono text-rose-600">{previewMask(-tipDay.outflow)}</p>
                              <p
                                className={`text-[10px] font-mono font-bold ${
                                  tipDay.net >= 0 ? "text-slate-900" : "text-rose-600"
                                }`}
                              >
                                net {previewMask(tipDay.net)}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-slate-500">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => togglePreviewSeries("inflow")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition cursor-pointer ${
                              previewSeries.inflow
                                ? "text-slate-700 hover:bg-slate-100"
                                : "text-slate-400 line-through hover:bg-slate-100"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Cash Inflow
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePreviewSeries("outflow")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition cursor-pointer ${
                              previewSeries.outflow
                                ? "text-slate-700 hover:bg-slate-100"
                                : "text-slate-400 line-through hover:bg-slate-100"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Cash Outflow
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePreviewSeries("budget")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition cursor-pointer ${
                              previewSeries.budget
                                ? "text-slate-700 hover:bg-slate-100"
                                : "text-slate-400 line-through hover:bg-slate-100"
                            }`}
                          >
                            <span className="w-3 border-t-2 border-dashed border-slate-400"></span> Budget Threshold
                          </button>
                        </div>
                        <span className="text-[11px] font-mono">
                          {`${previewVisibleDays[0].label} – ${previewVisibleDays[previewVisibleDays.length - 1].label}`}
                        </span>
                      </div>

                      {previewSelectedData ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs">
                          <div className="flex flex-wrap items-center gap-2 text-slate-700">
                            <span className="font-bold text-slate-900">{previewSelectedData.label}</span>
                            <span className="font-mono">In {previewMask(previewSelectedData.inflow)}</span>
                            <span className="font-mono">Out {previewMask(previewSelectedData.outflow)}</span>
                            <span
                              className={`font-mono font-semibold ${
                                previewSelectedData.net >= 0 ? "text-emerald-700" : "text-rose-600"
                              }`}
                            >
                              Net {previewMask(previewSelectedData.net)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewSelectedDay(null)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          >
                            <X className="w-3 h-3" /> Unpin Day
                          </button>
                        </div>
                      ) : (
                        <p className="mt-4 text-[11px] text-slate-500">
                          Tip: pin a column to freeze its figures, or toggle a series in the legend to isolate inflow
                          versus outflow.
                        </p>
                      )}
                    </div>

                    {/* Breakdown by Category — clickable drill-down */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900 text-sm">Expense Distribution</h4>
                        <span className="text-[11px] font-mono text-slate-400">October 2026</span>
                      </div>
                      <div className="space-y-2">
                        {PREVIEW_EXPENSE_CATEGORIES.map((category) => {
                          const share = (category.amount / PREVIEW_EXPENSE_TOTAL) * 100;
                          const isSelected = previewSelectedCategory === category.name;
                          const dimmed = previewSelectedCategory !== null && !isSelected;
                          return (
                            <button
                              key={category.name}
                              type="button"
                              onClick={() => setPreviewSelectedCategory(isSelected ? null : category.name)}
                              aria-pressed={isSelected}
                              className={`block w-full rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                                isSelected ? "bg-slate-50 ring-1 ring-slate-300" : "hover:bg-slate-50"
                              } ${dimmed ? "opacity-45" : "opacity-100"}`}
                            >
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-slate-700">{category.name}</span>
                                <span className="font-semibold text-slate-900">
                                  {`${previewMask(category.amount)} (${share.toFixed(0)}%)`}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`${category.bar} h-full rounded-full transition-all duration-500`}
                                  style={{ width: `${share}%` }}
                                ></div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {(() => {
                        const focus =
                          PREVIEW_EXPENSE_CATEGORIES.find((category) => category.name === previewSelectedCategory) ??
                          null;
                        if (!focus) {
                          return (
                            <p className="text-[11px] text-slate-500 mt-3">
                              Select a category to drill into its ledger entries.
                            </p>
                          );
                        }
                        const focusShare = (focus.amount / PREVIEW_EXPENSE_TOTAL) * 100;
                        return (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[11px] space-y-1">
                            <p className="flex items-center gap-1.5 font-bold text-slate-900">
                              <PieChart className="w-3.5 h-3.5 text-emerald-600" />
                              {focus.name}
                            </p>
                            <p className="text-slate-600">
                              {`${focus.entries} entries · top merchant ${focus.top}`}
                            </p>
                            <p className="text-slate-600">
                              {`${previewMask(focus.amount)} · ${focusShare.toFixed(1)}% of October spend`}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewTxKind("OUT");
                                setActivePreviewTab("transactions");
                              }}
                              className="mt-1 inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                            >
                              Inspect expense entries <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "accounts" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900">Wallets & Bank Accounts</h4>
                      <p className="text-xs text-slate-500">
                        Isolated per user with IDR currency validation · click an account to scope its ledger
                      </p>
                    </div>
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md">
                      {`${PREVIEW_ACCOUNTS.length} Active Accounts · ${previewMask(previewPortfolioBalance)}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {PREVIEW_ACCOUNTS.map((account) => {
                      const selected = previewSelectedAccount === account.id;
                      const share = (account.balance / previewPortfolioBalance) * 100;
                      const AccountIcon =
                        account.icon === "cash"
                          ? DollarSign
                          : account.icon === "wallet"
                            ? Smartphone
                            : account.icon === "invest"
                              ? TrendingUp
                              : Building2;
                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => setPreviewSelectedAccount(selected ? null : account.id)}
                          aria-pressed={selected}
                          className={`text-left bg-white p-4 rounded-xl border transition cursor-pointer ${
                            selected
                              ? "border-emerald-400 ring-2 ring-emerald-100 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {account.group}
                            </span>
                            <AccountIcon className={`w-4 h-4 ${account.tint}`} />
                          </div>
                          <p className="text-sm font-bold text-slate-900 mt-2">{account.name}</p>
                          <p className="text-xl font-mono font-bold text-slate-950 mt-1">{previewMask(account.balance)}</p>
                          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${share}%` }}
                            ></div>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span>{`${account.kind} · ${share.toFixed(0)}% of net worth`}</span>
                            <span className={selected ? "text-emerald-700 font-bold" : "text-emerald-600 font-medium"}>
                              {selected ? "Filtering" : "Verified"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs">
                    {previewAccount ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2 text-slate-700">
                          <span className="font-bold text-slate-900">{previewAccount.name}</span>
                          <span className="font-mono">{previewMask(previewAccount.balance)}</span>
                          <span className="text-slate-500">
                            {`${previewTransactions.length} linked ledger entr${
                              previewTransactions.length === 1 ? "y" : "ies"
                            } on this account`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewTxKind("all");
                              setActivePreviewTab("transactions");
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          >
                            Open its ledger <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewSelectedAccount(null)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <X className="w-3 h-3" /> Clear filter
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-500">
                        No account filter active — select a wallet above to scope the transaction history view.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activePreviewTab === "transactions" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Recent Ledger Entries & Audit Trail</h4>
                      <p className="text-xs text-slate-500">
                        Recorded with local timestamps and verified category labels · click a row to expand its audit trail
                      </p>
                    </div>
                    <div className="flex min-w-0 max-w-full overflow-x-auto p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                      {([
                        { key: "all", label: "All" },
                        { key: "IN", label: "Income" },
                        { key: "OUT", label: "Expense" },
                        { key: "TRF", label: "Transfer" },
                      ] as const).map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => setPreviewTxKind(chip.key)}
                          className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition cursor-pointer ${
                            previewTxKind === chip.key
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {previewAccount && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-[11px]">
                      <span className="text-slate-700">
                        {`Scoped to ${previewAccount.name} · ${previewTransactions.length} of ${PREVIEW_TRANSACTIONS.length} entries match`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewSelectedAccount(null)}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Remove account scope
                      </button>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {previewTransactions.map((tx) => {
                      const account = getPreviewAccount(tx.accountId);
                      const expanded = previewExpandedTx === tx.id;
                      const badge =
                        tx.kind === "IN"
                          ? "bg-emerald-100 text-emerald-700"
                          : tx.kind === "OUT"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-blue-100 text-blue-700";
                      const amountTone =
                        tx.kind === "IN"
                          ? "text-emerald-600"
                          : tx.kind === "OUT"
                            ? "text-rose-600"
                            : "text-blue-600";
                      return (
                        <div key={tx.id}>
                          <button
                            type="button"
                            onClick={() => setPreviewExpandedTx(expanded ? null : tx.id)}
                            aria-expanded={expanded}
                            className="w-full p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 shrink-0 rounded-lg ${badge} flex items-center justify-center font-bold text-xs`}
                              >
                                {tx.kind}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">{tx.title}</p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {`${account?.name ?? "Unassigned"} • ${tx.category}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <p className={`text-xs font-bold ${amountTone}`}>
                                  {`${tx.kind === "IN" ? "+" : ""}${previewMask(tx.amount)}`}
                                </p>
                                <p className="text-[10px] text-slate-400">{tx.time}</p>
                              </div>
                              <ChevronRight
                                className={`w-4 h-4 text-slate-400 transition-transform ${
                                  expanded ? "rotate-90" : ""
                                }`}
                              />
                            </div>
                          </button>

                          {expanded && (
                            <div className="bg-slate-50 px-3.5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[11px] border-t border-slate-100">
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Entry ID</span>
                                <span className="text-slate-900 font-semibold">{tx.entryId}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Ledger hash</span>
                                <span className="text-slate-900">{tx.hash}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Source client</span>
                                <span className="text-slate-900">{tx.source}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Account type</span>
                                <span className="text-slate-900">{account?.kind ?? "-"}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Balance recalc</span>
                                <span className="text-emerald-700 font-semibold">Auto-recount applied</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-500">Sync status</span>
                                <span className="inline-flex items-center gap-1 text-teal-700">
                                  <Check className="w-3 h-3" /> Committed (1/1)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {previewTransactions.length === 0 && (
                      <div className="p-6 text-center">
                        <p className="text-xs font-semibold text-slate-700">No ledger entries match this filter</p>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewSelectedAccount(null);
                            setPreviewTxKind("all");
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Reset filters
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {`Showing ${previewTransactions.length} of ${PREVIEW_TRANSACTIONS.length} mocked entries.`}
                  </p>
                </div>
              )}

              {activePreviewTab === "recount" && (
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                        <RefreshCw
                          className={`w-5 h-5 text-teal-700 ${previewRecountRunning ? "animate-spin" : ""}`}
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">Balance Reconciliation & Recount Engine</h4>
                        <p className="text-xs text-slate-500">
                          Automated audit engine that compares mathematical transaction sums against recorded balances
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={runPreviewRecount}
                      disabled={previewRecountRunning}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      {previewRecountRunning
                        ? "Reconciling…"
                        : previewRecountFinished
                          ? "Re-run Engine"
                          : "Run Recount"}
                    </button>
                  </div>

                  <div className="mb-4 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${previewRecountRunning && previewRecountStep === 0 ? 3 : previewRecountProgress}%` }}
                    ></div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-slate-300 space-y-1">
                    <p className="text-emerald-400">$ cybank reconcile --user=session --strict</p>
                    {previewRecountStep === 0 && !previewRecountRunning && (
                      <p className="text-slate-500">Engine idle — press “Run Recount” to execute the audit pass.</p>
                    )}
                    {PREVIEW_RECOUNT_LOG.slice(0, previewRecountStep).map((line) => (
                      <p
                        key={line}
                        className={line.includes("BALANCED") ? "text-emerald-400 font-bold" : "text-slate-300"}
                      >
                        {`› ${line}`}
                      </p>
                    ))}
                    {previewRecountRunning && (
                      <p className="text-slate-500 animate-pulse">▋ processing…</p>
                    )}
                  </div>

                  {previewRecountStep > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Per-Account Variance Report</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {`tolerance Rp 1 · ${PREVIEW_ACCOUNTS.length} accounts`}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {PREVIEW_ACCOUNTS.map((account) => (
                          <div
                            key={account.id}
                            className="px-4 py-2.5 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-800">{account.name}</span>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-slate-500">{previewMask(account.balance)}</span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold ${
                                  previewRecountFinished
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                {previewRecountFinished ? (
                                  <>
                                    <Check className="w-3 h-3" /> Rp 0
                                  </>
                                ) : (
                                  "pending"
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 font-mono text-xs mt-4 transition-opacity ${
                      previewRecountFinished ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Verified Active Accounts:</span>
                      <span className="font-bold text-slate-900">{`${PREVIEW_ACCOUNTS.length} Accounts`}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Mathematical Ledger Sum:</span>
                      <span className="font-bold text-slate-900">{previewMask(previewPortfolioBalance)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Recorded Physical Balance:</span>
                      <span className="font-bold text-slate-900">{previewMask(previewPortfolioBalance)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Variance & Drift Status:</span>
                      {previewRecountFinished ? (
                        <span className="bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                          Rp 0 (100% Balanced)
                        </span>
                      ) : (
                        <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-500">awaiting run</span>
                      )}
                    </div>
                  </div>

                  {previewRecountFinished ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                      <p className="text-xs text-slate-700">
                        Zero drift detected, so no adjustment entry was written. When a variance is found the engine
                        posts a 1-click auto-adjustment entry that stays visible in the audit trail.
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <ShieldCheck className="w-4 h-4" /> Ledger Integrity Verified
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-4">
                      If an unrecorded physical variance is found, the system provides a 1-click Auto-Adjustment
                      mechanism to keep the general ledger strictly accurate and auditable.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core Enterprise Features Grid */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
              Core Capabilities
            </span>
            <h2 className="text-3xl font-bold text-slate-950 mt-3 tracking-tight">
              Enterprise-Grade Financial Control
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Engineered for professionals who need daily, weekly, and monthly cashflow clarity without friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Auto Recount Balance Engine</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                The Recount Balance engine cross-examines stored account balances against mathematical transaction histories in real-time, instantly offering 1-click audit adjustments.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero Calculation Drift</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-5">
                <PieChart className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Interactive Doughnut & Cashflow Analytics</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Dynamic category breakdowns with interactive hover overlays, net cashflow indicators, and flexible timeframes: 1-day, 7-day, 30-day, 6-month, 1-year, or all-time.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Chart.js 4 Engine</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-5">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Manajemen Multi-Account</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Isolate liquid operating accounts, emergency funds, digital wallets, cash reserves, and investment goals with specific account types and synchronized balances.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-sky-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Unlimited Accounts</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Batch CSV Migration Engine</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Seamlessly import thousands of historical records from external tools like BudgetBakers Wallet CSV with intelligent category matching and ISO timestamp parsing.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>High Throughput PapaParse</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Cybeat SSO Integration</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Protected by stateless JWT Bearer token authentication via Cybeat Single Sign-On, securing your personal identity and sensitive financial data end-to-end.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Stateless Bearer Guard</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-5">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Native Android Ready</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                The lightweight RESTful backend delivers a unified Single Source of Truth API contract for both the Next.js Web SPA and the upcoming Native Android Kotlin app.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Kotlin & Retrofit Compatible</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Git & Engineering Telemetry Section */}
      <section id="git-status" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Engineering & Git Telemetry
              </span>
              <h2 className="text-3xl font-bold text-slate-950 mt-3 tracking-tight">
                Repository Status & Git Activity
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Full transparency with precisely tracked open development commits and releases.
              </p>
            </div>

            {/* Quick Git Clone Snippet */}
            <div className="flex items-center gap-2 bg-slate-900 text-slate-200 px-3.5 py-2 rounded-xl font-mono text-xs shadow-inner">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>git clone https://github.com/sibeux/cybank-web.git</span>
              <button
                onClick={copyCloneCommand}
                className="ml-2 p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition cursor-pointer"
                title="Copy Command"
              >
                {copiedClone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Git Metadata Card */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">sibeux/cybank-web</h3>
                    <p className="text-[11px] text-slate-500">Public GitHub Repository</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Clean Tree
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans">Active Branch:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-600" /> main
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans">Total Commits:</span>
                  <span className="font-bold text-slate-900">28 Commits</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans">Latest Hash:</span>
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-emerald-700 font-bold">
                    7335ee0
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans">CI/CD Pipeline:</span>
                  <span className="text-emerald-700 font-semibold font-sans flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SSH Deploy Active
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 font-sans">Build Target:</span>
                  <span className="font-sans font-medium text-slate-700">Next.js 16 Static Export</span>
                </div>
              </div>

              <a
                href="https://github.com/sibeux/cybank-web"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold transition"
              >
                <span>View Repository on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>

            {/* Commits Timeline Feed */}
            <div className="lg:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-emerald-600" />
                  Recent Commit History
                </h3>
                <span className="text-xs text-slate-500 font-mono">Branch: {gitBranch}</span>
              </div>

              <div className="space-y-3">
                {gitCommits.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No commit history available yet.
                  </p>
                )}
                {gitCommits.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.hash}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.tag}
                          </span>
                          <span className="text-xs text-slate-400">{item.date}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-800">
                          {item.message}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 shrink-0">
                        {item.author}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Profile Section */}
      <section id="developer" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
              Developer Profile
            </span>
            <h2 className="text-3xl font-bold text-slate-950 mt-3 tracking-tight">
              Created & Maintained by Developer
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Meet the engineer behind the Cybank Web platform, REST Backend, and Sibeux ecosystem.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-8 sm:p-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Developer Avatar Badge */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-slate-900 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-600/20">
                    NW
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Active Maintainer">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Developer Info Content */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-950">Nasrul Wahabi</h3>
                      <p className="text-sm font-semibold text-emerald-700">
                        Lead Fullstack & Mobile Engineer • Founder of Sibeux
                      </p>
                    </div>

                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      <span>Indonesia</span>
                    </div>
                  </div>

                  <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Independent software engineer specializing in high-throughput systems, isolated personal finance ledgers, and decoupled web architectures. Developed Cybank as an auditable personal finance platform seamlessly integrating Next.js 16 SPA, Native PHP REST API, and Android Native (Kotlin).
                  </p>

                  {/* Skills tags */}
                  <div className="mt-5 flex flex-wrap justify-center sm:justify-start gap-2">
                    {["Next.js 16", "React 19", "TypeScript", "PHP Native REST", "PDO MariaDB", "Tailwind CSS v4", "Android Kotlin", "JWT Security", "CI/CD Actions"].map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Contact & Social Links */}
                  <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center sm:justify-start gap-4">
                    <a
                      href="mailto:wahabinasrul@gmail.com"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition"
                    >
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span>wahabinasrul@gmail.com</span>
                    </a>

                    <a
                      href="https://github.com/sibeux"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition"
                    >
                      <Code2 className="w-4 h-4 text-slate-500" />
                      <span>github.com/sibeux</span>
                    </a>

                    <a
                      href="https://sibeux.my.id"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition"
                    >
                      <Globe className="w-4 h-4 text-slate-500" />
                      <span>sibeux.my.id</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Architecture Section */}
      <section id="architecture" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Architecture Design
            </span>
            <h2 className="text-3xl font-bold text-slate-950 mt-3 tracking-tight">
              Single Source of Truth Architecture
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              A single native REST API backend powering both the Next.js 16 Web Client and Android Native Kotlin app.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm mb-4">
                01
              </div>
              <h3 className="font-bold text-base text-slate-900">Frontend Client Layer</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Next.js 16 Static SPA exported deterministically (<code className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">output: &quot;export&quot;</code>) with zero runtime overhead, served directly via a static web server or CDN.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Next.js 16 App Router SPA
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Tailwind CSS v4 Utility Styling
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Android Kotlin Client (Retrofit)
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm mb-4">
                02
              </div>
              <h3 className="font-bold text-base text-slate-900">Stateless REST API Engine</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Lightweight native PHP backend without a node.js daemon overhead, ideal for cPanel/Apache server resource efficiency with fast routing and safe PDO execution.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-600" /> Centralized router at <code className="font-mono text-[11px]">/api/v1</code>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-600" /> Cybeat SSO Bearer Validation
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-600" /> PDO Prepared Statements Anti-SQLi
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm mb-4">
                03
              </div>
              <h3 className="font-bold text-base text-slate-900">Isolated MariaDB Layer</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Database schema with an explicit <code className="font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">cybank_*</code> prefix to prevent name collisions in shared database environments.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-600" /> <code className="font-mono text-[11px]">cybank_accounts</code>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-600" /> <code className="font-mono text-[11px]">cybank_categories</code>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-600" /> <code className="font-mono text-[11px]">cybank_transactions</code>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* REST API Endpoints Specification Section */}
      <section id="api-docs" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
              RESTful Endpoint Directory
            </span>
            <h2 className="text-3xl font-bold text-slate-950 mt-3 tracking-tight">
              API Specification & Endpoints
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Stateless JSON endpoints fully secured and ready for web clients and native mobile apps.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4">Endpoint Path</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Authentication</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-700">POST</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">/api/v1/auth/login</td>
                    <td className="py-3 px-4 font-sans text-slate-600">Cybeat SSO authentication and JWT issuance</td>
                    <td className="py-3 px-4 font-sans text-slate-400">Public</td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">GET</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">/api/v1/dashboard</td>
                    <td className="py-3 px-4 font-sans text-slate-600">Retrieve portfolio balances, accounts, latest ledger, and KPIs</td>
                    <td className="py-3 px-4 font-sans text-emerald-700 font-semibold">Bearer Token</td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">GET</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">/api/v1/accounts</td>
                    <td className="py-3 px-4 font-sans text-slate-600">Fetch all registered accounts, wallet types, and current balances</td>
                    <td className="py-3 px-4 font-sans text-emerald-700 font-semibold">Bearer Token</td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-700">POST</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">/api/v1/accounts/recount</td>
                    <td className="py-3 px-4 font-sans text-slate-600">Perform mathematical audit and adjust account balance variances</td>
                    <td className="py-3 px-4 font-sans text-emerald-700 font-semibold">Bearer Token</td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">GET</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">/api/v1/categories</td>
                    <td className="py-3 px-4 font-sans text-slate-600">Fetch category directory with color tags and icons</td>
                    <td className="py-3 px-4 font-sans text-emerald-700 font-semibold">Bearer Token</td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-700">POST</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">/api/v1/transactions</td>
                    <td className="py-3 px-4 font-sans text-slate-600">Record a new transaction (Expense, Income, or Transfer)</td>
                    <td className="py-3 px-4 font-sans text-emerald-700 font-semibold">Bearer Token</td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-700">PUT</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">/api/v1/transactions</td>
                    <td className="py-3 px-4 font-sans text-slate-600">Update transaction amount, category, notes, or date</td>
                    <td className="py-3 px-4 font-sans text-emerald-700 font-semibold">Bearer Token</td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-700">DELETE</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">/api/v1/transactions</td>
                    <td className="py-3 px-4 font-sans text-slate-600">Delete transaction and reverse balances on affected accounts</td>
                    <td className="py-3 px-4 font-sans text-emerald-700 font-semibold">Bearer Token</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Call to Action */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-100 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            {/* Ambient pattern */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Start Managing Cashflow Today
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Elevate Your Personal Financial Clarity to the Next Level.
              </h2>
              <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
                Enjoy effortless recording, automated multi-account balance reconciliation, and real-time cashflow intelligence with Cybank.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href={isLoggedIn ? "/dashboard" : "/login"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/30 transition active:scale-95"
                >
                  <span>{isLoggedIn ? "Enter Dashboard" : "Sign In to Cybank"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="https://github.com/sibeux/cybank-web"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Explore GitHub Project</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-lg text-slate-900 tracking-tight">Cybank</span>
                  <span className="ml-2 text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    v0.1.0
                  </span>
                </div>
              </div>
              <p className="text-slate-500 leading-relaxed text-xs max-w-sm">
                Enterprise-grade personal cashflow ledger and portfolio tracking application built for speed, transparency, and single-source-of-truth reliability.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>All systems operational</span>
              </div>
            </div>

            {/* Column 1: Fitur */}
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">Product Modules</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className="hover:text-emerald-700 transition">
                    Financial Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/categories" className="hover:text-emerald-700 transition">
                    Category Management
                  </Link>
                </li>
                <li>
                  <a href="#preview" className="hover:text-emerald-700 transition">
                    Balance Reconciliation
                  </a>
                </li>
                <li>
                  <a href="#preview" className="hover:text-emerald-700 transition">
                    Cashflow Analytics
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2: Engineering */}
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">Engineering</p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://github.com/sibeux/cybank-web"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-700 transition flex items-center gap-1"
                  >
                    GitHub Repository <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </li>
                <li>
                  <a href="#git-status" className="hover:text-emerald-700 transition">
                    Git Telemetry (28 Commits)
                  </a>
                </li>
                <li>
                  <a href="#architecture" className="hover:text-emerald-700 transition">
                    Next.js 16 Static SPA
                  </a>
                </li>
                <li>
                  <a href="#api-docs" className="hover:text-emerald-700 transition">
                    PHP Native REST API
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Developer */}
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">Developer</p>
              <ul className="space-y-2">
                <li>
                  <span className="font-medium text-slate-800">Nasrul Wahabi</span>
                </li>
                <li>
                  <a href="mailto:wahabinasrul@gmail.com" className="hover:text-emerald-700 transition">
                    wahabinasrul@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/sibeux"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-700 transition"
                  >
                    GitHub: @sibeux
                  </a>
                </li>
                <li>
                  <a
                    href="https://sibeux.my.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-700 transition"
                  >
                    sibeux.my.id
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>
              © 2026 <strong className="text-slate-800">Cybank</strong> by <a href="https://github.com/sibeux" className="hover:underline text-slate-700 font-medium">Nasrul Wahabi (Sibeux)</a>. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span>Light Mode Enterprise Edition</span>
              <span>•</span>
              <a href="#git-status" className="hover:text-slate-700">Branch: main</a>
              <span>•</span>
              <span>Cybeat SSO Protected</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
