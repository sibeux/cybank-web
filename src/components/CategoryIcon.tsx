import React from "react";
import {
  Utensils,
  Coffee,
  ShoppingBag,
  ShoppingCart,
  Car,
  Fuel,
  Home,
  Zap,
  Wifi,
  Phone,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  Film,
  Plane,
  Gift,
  CreditCard,
  Briefcase,
  Coins,
  Wallet,
  TrendingUp,
  Receipt,
  Scissors,
  Shirt,
  Baby,
  PawPrint,
  Wrench,
  ShieldCheck,
  BookOpen,
  Smile,
  Tag,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";

export interface CategoryIconMeta {
  name: string;
  label: string;
  icon: LucideIcon;
  category: "food" | "transport" | "living" | "lifestyle" | "finance" | "other";
}

export const CATEGORY_ICONS: CategoryIconMeta[] = [
  // Food & Drink
  { name: "utensils", label: "Makanan & Restoran", icon: Utensils, category: "food" },
  { name: "coffee", label: "Kopi & Kafe", icon: Coffee, category: "food" },
  
  // Shopping
  { name: "shopping-bag", label: "Belanja / Shopping", icon: ShoppingBag, category: "lifestyle" },
  { name: "shopping-cart", label: "Supermarket / Groceries", icon: ShoppingCart, category: "food" },
  { name: "shirt", label: "Pakaian & Fashion", icon: Shirt, category: "lifestyle" },

  // Transport
  { name: "car", label: "Transportasi & Kendaraan", icon: Car, category: "transport" },
  { name: "fuel", label: "Bensin & BBM", icon: Fuel, category: "transport" },
  { name: "plane", label: "Travel & Liburan", icon: Plane, category: "transport" },

  // Living & Utilities
  { name: "home", label: "Tempat Tinggal / Sewa", icon: Home, category: "living" },
  { name: "zap", label: "Listrik & Utilitas", icon: Zap, category: "living" },
  { name: "wifi", label: "Internet & Wi-Fi", icon: Wifi, category: "living" },
  { name: "phone", label: "Pulsa & Telepon", icon: Phone, category: "living" },
  { name: "wrench", label: "Servis & Perbaikan", icon: Wrench, category: "living" },

  // Lifestyle & Entertainment
  { name: "gamepad-2", label: "Hiburan & Game", icon: Gamepad2, category: "lifestyle" },
  { name: "film", label: "Bioskop & Streaming", icon: Film, category: "lifestyle" },
  { name: "heart-pulse", label: "Kesehatan & Medis", icon: HeartPulse, category: "lifestyle" },
  { name: "graduation-cap", label: "Pendidikan & Kursus", icon: GraduationCap, category: "lifestyle" },
  { name: "book-open", label: "Buku & Majalah", icon: BookOpen, category: "lifestyle" },
  { name: "scissors", label: "Perawatan Diri & Salon", icon: Scissors, category: "lifestyle" },
  { name: "gift", label: "Hadiah & Donasi", icon: Gift, category: "lifestyle" },
  { name: "paw-print", label: "Hewan Peliharaan", icon: PawPrint, category: "lifestyle" },
  { name: "baby", label: "Keluarga & Anak", icon: Baby, category: "lifestyle" },

  // Finance & Income
  { name: "wallet", label: "Gaji & Pendapatan", icon: Wallet, category: "finance" },
  { name: "briefcase", label: "Pekerjaan & Bisnis", icon: Briefcase, category: "finance" },
  { name: "coins", label: "Investasi & Aset", icon: Coins, category: "finance" },
  { name: "trending-up", label: "Bonus & Dividen", icon: TrendingUp, category: "finance" },
  { name: "credit-card", label: "Cicilan & Tagihan", icon: CreditCard, category: "finance" },
  { name: "receipt", label: "Pajak & Retribusi", icon: Receipt, category: "finance" },
  { name: "shield-check", label: "Asuransi", icon: ShieldCheck, category: "finance" },
  { name: "circle-dollar-sign", label: "Pendapatan Lain", icon: CircleDollarSign, category: "finance" },

  // Other
  { name: "tag", label: "Umum / Tag", icon: Tag, category: "other" },
  { name: "smile", label: "Lain-lain", icon: Smile, category: "other" },
];

export const CATEGORY_COLORS = [
  { name: "Emerald", hex: "#10b981" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Sky", hex: "#0ea5e9" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Red", hex: "#ef4444" },
  { name: "Orange", hex: "#f97316" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Slate", hex: "#64748b" },
  { name: "Zinc", hex: "#71717a" },
];

export function getCategoryIconComponent(iconName?: string | null): LucideIcon {
  if (!iconName) return Tag;
  const found = CATEGORY_ICONS.find((item) => item.name === iconName.toLowerCase().trim());
  return found ? found.icon : Tag;
}

export function CategoryIcon({
  name,
  className = "w-4 h-4",
}: {
  name?: string | null;
  className?: string;
}) {
  const IconComponent = getCategoryIconComponent(name);
  return <IconComponent className={className} />;
}

