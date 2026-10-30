"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"overview" | "accounts" | "transactions" | "recount">("overview");
  const [copiedClone, setCopiedClone] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("cybank_token");
      if (token) {
        setIsLoggedIn(true);
      }
    }
  }, []);

  const copyCloneCommand = () => {
    navigator.clipboard.writeText("git clone https://github.com/sibeux/cybank-web.git");
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  const gitCommits = [
    {
      hash: "7335ee0",
      date: "Oct 30, 2026",
      tag: "feat",
      message: "implement authentication and dashboard client components with SSO integration",
      author: "Nasrul Wahabi",
    },
    {
      hash: "b2deddb",
      date: "Oct 30, 2026",
      tag: "style",
      message: "add viewport meta settings with color scheme support",
      author: "Nasrul Wahabi",
    },
    {
      hash: "05eb55b",
      date: "Oct 30, 2026",
      tag: "feat",
      message: "implement full CRUD with count and UI for category management",
      author: "Nasrul Wahabi",
    },
    {
      hash: "b0fb69d",
      date: "Oct 30, 2026",
      tag: "feat",
      message: "add center info overlay with hover fade on doughnut chart",
      author: "Nasrul Wahabi",
    },
    {
      hash: "550dedc",
      date: "Oct 30, 2026",
      tag: "feat",
      message: "add 1-day timeframe support and update default selection",
      author: "Nasrul Wahabi",
    },
    {
      hash: "c5406f8",
      date: "Oct 30, 2026",
      tag: "docs",
      message: "update architecture and usage to Next.js 16 and PHP API backend",
      author: "Nasrul Wahabi",
    },
  ];

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
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
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
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
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
      <section id="preview" className="py-16 bg-white border-y border-slate-200">
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
                Explore transaction recording, multi-account ledger, and real-time reconciliation directly.
              </p>
            </div>

            {/* Preview Navigation Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActivePreviewTab("overview")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activePreviewTab === "overview"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cash Overview
              </button>
              <button
                onClick={() => setActivePreviewTab("accounts")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activePreviewTab === "accounts"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Multi-Account
              </button>
              <button
                onClick={() => setActivePreviewTab("transactions")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activePreviewTab === "transactions"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Transaction History
              </button>
              <button
                onClick={() => setActivePreviewTab("recount")}
                className={`px-3 py-1.5 rounded-lg transition ${
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
                  {/* Top 4 KPI Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Total Portfolio Balance</span>
                        <Wallet className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-2xl font-bold text-slate-950 mt-1">Rp 48.250.000</p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+Rp 8.450.000 net this month</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>This Month's Income</span>
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">+Rp 14.800.000</p>
                      <p className="mt-2 text-[11px] text-slate-500">Salary, Freelance, & Dividends</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>This Month's Expense</span>
                        <BarChart3 className="w-4 h-4 text-rose-500" />
                      </div>
                      <p className="text-2xl font-bold text-rose-600 mt-1">-Rp 6.350.000</p>
                      <p className="mt-2 text-[11px] text-slate-500">42.9% of total income</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Reconciliation Status</span>
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      </div>
                      <p className="text-2xl font-bold text-slate-950 mt-1">Balanced</p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-teal-700 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span>0 Variance across 5 accounts</span>
                      </div>
                    </div>
                  </div>

                  {/* Cashflow Graphic Simulation */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm">30-Day Cashflow Trend</h4>
                          <p className="text-xs text-slate-500">Daily Income vs Expense Comparison</p>
                        </div>
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          Positive Surplus
                        </span>
                      </div>
                      {/* Simulated Chart Bars */}
                      <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100">
                        {[40, 65, 30, 85, 95, 45, 60, 75, 50, 90, 100, 70, 80, 65, 88].map((val, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div
                              style={{ height: `${val}%` }}
                              className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-sm group-hover:brightness-95 transition"
                            ></div>
                            <span className="text-[9px] text-slate-400 font-mono hidden sm:block">
                              {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Cash Inflow
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Budget Threshold
                          </span>
                        </div>
                        <span className="text-[11px] font-mono">October 2026</span>
                      </div>
                    </div>

                    {/* Breakdown by Category */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                      <h4 className="font-semibold text-slate-900 text-sm mb-3">Expense Distribution</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">Food & Dining</span>
                            <span className="font-semibold text-slate-900">Rp 2.450.000 (38%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: "38%" }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">Bills & Utilities</span>
                            <span className="font-semibold text-slate-900">Rp 1.800.000 (28%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: "28%" }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">Transportation</span>
                            <span className="font-semibold text-slate-900">Rp 1.100.000 (17%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-cyan-500 h-full rounded-full" style={{ width: "17%" }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">Entertainment & Leisure</span>
                            <span className="font-semibold text-slate-900">Rp 1.000.000 (17%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: "17%" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "accounts" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">Wallets & Bank Accounts</h4>
                      <p className="text-xs text-slate-500">Isolated per user with IDR currency validation</p>
                    </div>
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md">
                      5 Active Accounts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Primary Bank</span>
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-2">BCA Prioritas</p>
                      <p className="text-xl font-mono font-bold text-slate-950 mt-1">Rp 24.500.000</p>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Type: BANK</span>
                        <span className="text-emerald-600 font-medium">Verified</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Digital Banking</span>
                        <Building2 className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-2">Bank Jago Kantong</p>
                      <p className="text-xl font-mono font-bold text-slate-950 mt-1">Rp 12.750.000</p>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Type: BANK</span>
                        <span className="text-emerald-600 font-medium">Verified</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cash Wallet</span>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-2">Physical Cash</p>
                      <p className="text-xl font-mono font-bold text-slate-950 mt-1">Rp 1.500.000</p>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Type: CASH</span>
                        <span className="text-emerald-600 font-medium">Verified</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">E-Wallet</span>
                        <Smartphone className="w-4 h-4 text-teal-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-2">GoPay Balance</p>
                      <p className="text-xl font-mono font-bold text-slate-950 mt-1">Rp 3.500.000</p>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Type: EWALLET</span>
                        <span className="text-emerald-600 font-medium">Verified</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Investments</span>
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-2">Bibit Mutual Funds</p>
                      <p className="text-xl font-mono font-bold text-slate-950 mt-1">Rp 6.000.000</p>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Type: INVESTMENT</span>
                        <span className="text-emerald-600 font-medium">Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "transactions" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Recent Ledger Entries & Audit Trail</h4>
                      <p className="text-xs text-slate-500">Recorded with local timestamps and verified category labels</p>
                    </div>
                    <span className="text-xs font-mono text-slate-500">Filter: 1-Day / All</span>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          IN
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Software Engineer Monthly Salary</p>
                          <p className="text-[11px] text-slate-500">BCA Prioritas • Salary & Wages</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-600">+Rp 12.500.000</p>
                        <p className="text-[10px] text-slate-400">Oct 30, 2026, 09:00</p>
                      </div>
                    </div>

                    <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                          OUT
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">VPS Cloud Server Subscription</p>
                          <p className="text-[11px] text-slate-500">Bank Jago • Cloud Infrastructure</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-rose-600">-Rp 350.000</p>
                        <p className="text-[10px] text-slate-400">Oct 30, 2026, 14:15</p>
                      </div>
                    </div>

                    <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          TRF
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Cash Top-up for Daily Operations</p>
                          <p className="text-[11px] text-slate-500">BCA Prioritas → Physical Cash</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-blue-600">Rp 500.000</p>
                        <p className="text-[10px] text-slate-400">Oct 30, 2026, 16:30</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "recount" && (
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Balance Reconciliation & Recount Engine</h4>
                      <p className="text-xs text-slate-500">
                        Automated audit engine that compares mathematical transaction sums against recorded balances
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 font-mono text-xs">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Verified Active Accounts:</span>
                      <span className="font-bold text-slate-900">5 Accounts</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Mathematical Ledger Sum:</span>
                      <span className="font-bold text-slate-900">Rp 48.250.000</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Recorded Physical Balance:</span>
                      <span className="font-bold text-slate-900">Rp 48.250.000</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Variance & Drift Status:</span>
                      <span className="bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                        Rp 0 (100% Balanced)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-4">
                    If an unrecorded physical variance is found, the system provides a 1-click Auto-Adjustment
                    mechanism to keep the general ledger strictly accurate and auditable.
                  </p>
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
                className="ml-2 p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition"
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
                <span className="text-xs text-slate-500 font-mono">Branch: origin/main</span>
              </div>

              <div className="space-y-3">
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
