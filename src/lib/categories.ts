import type { CSSProperties } from "react";

export interface CategoryOption {
    id: number;
    name: string;
    type?: string | null;
    parent_id?: number | null;
    parentId?: number | null;
    icon?: string | null;
    color?: string | null;
    parent_name?: string | null;
}

export interface CategorySelectGroup<T extends CategoryOption> {
    /** Kategori induk grup, atau null bila kategori ini berdiri sendiri */
    parent: T | null;
    /** Isi grup; elemen pertama adalah induknya sendiri */
    items: T[];
}

const parentIdOf = (category: CategoryOption) =>
    category.parent_id ?? category.parentId ?? null;

/**
 * Susun kategori menjadi grup siap render untuk <select>.
 * Kategori utama yang punya subkategori menjadi <optgroup> (induk + turunannya),
 * sedangkan kategori tanpa subkategori tetap berupa <option> tunggal.
 */
export function buildCategorySelectGroups<T extends CategoryOption>(
    categories: T[],
    type?: string
): CategorySelectGroup<T>[] {
    const filtered = type
        ? categories.filter((category) => !category.type || category.type === type)
        : categories;
    const knownIds = new Set(filtered.map((category) => category.id));
    const childrenByParent = new Map<number, T[]>();

    filtered.forEach((category) => {
        const parentId = parentIdOf(category);
        if (parentId && knownIds.has(parentId)) {
            const list = childrenByParent.get(parentId) ?? [];
            list.push(category);
            childrenByParent.set(parentId, list);
        }
    });

    return filtered
        .filter((category) => {
            const parentId = parentIdOf(category);
            return !parentId || !knownIds.has(parentId);
        })
        .map((root) => {
            const children = (childrenByParent.get(root.id) ?? []).sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            if (children.length === 0) {
                return { parent: null, items: [root] };
            }

            return { parent: root, items: [root, ...children] };
        });
}

/** Normalisasi input warna menjadi `#rrggbb` (lowercase). Null bila format tidak valid. */
export function normalizeHexColor(raw: string): string | null {
    const value = raw.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(value)) {
        return `#${value
            .split("")
            .map((ch) => ch + ch)
            .join("")}`.toLowerCase();
    }
    if (/^[0-9a-fA-F]{6}$/.test(value)) return `#${value.toLowerCase()}`;
    return null;
}

/**
 * Warna badge kategori.
 * - `className`: kelas Tailwind untuk hex preset agar tetap adaptif mode gelap/terang.
 * - `style`: dipakai untuk warna kustom di luar palet, supaya badge tetap mengikuti hex aslinya.
 */
export interface CategoryBadgeTone {
    className: string;
    style?: CSSProperties;
}

export interface CategoryColorSource extends CategoryOption {
    color?: string | null;
}

/** Palet preset kategori (hex) → kelas Tailwind badge. */
const CATEGORY_COLOR_CLASSES: Record<string, string> = {
    "#10b981": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    "#14b8a6": "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
    "#06b6d4": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
    "#0ea5e9": "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    "#3b82f6": "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    "#6366f1": "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    "#8b5cf6": "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
    "#a855f7": "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    "#ec4899": "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20",
    "#f43f5e": "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    "#ef4444": "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
    "#f97316": "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
    "#f59e0b": "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    "#eab308": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
    "#64748b": "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    "#71717a": "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
};

/** Badge netral untuk kategori yang belum punya warna sama sekali. */
const CATEGORY_BADGE_FALLBACK =
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";

/** Cadangan berbasis kata kunci untuk kategori lama tanpa warna. */
const CATEGORY_NAME_TONES: Array<{ keywords: string[]; className: string }> = [
    {
        keywords: ["food", "drink", "makan", "restoran"],
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    },
    {
        keywords: ["shop", "belanja", "clothes", "baju"],
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    },
    {
        keywords: ["transport", "ojek", "bensin", "gojek"],
        className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    },
    {
        keywords: ["income", "gaji", "invest"],
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    },
    {
        keywords: ["soft", "app", "game", "internet"],
        className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    },
    {
        keywords: ["fee", "admin", "charge"],
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    },
    {
        keywords: ["wellness", "beauty", "health"],
        className: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20",
    },
];

/**
 * Resolver warna badge transaksi berdasarkan data kategori.
 * Pencocokan memakai `categoryId` lebih dulu (bebas dari masalah nama), lalu nama kategori.
 * Subkategori selalu memakai warna induk teratasnya, sejalan dengan aturan di halaman kategori.
 */
export function createCategoryBadgeColorResolver<T extends CategoryColorSource>(
    categories: T[]
) {
    const byId = new Map<number, T>();
    const byName = new Map<string, T>();

    categories.forEach((category) => {
        byId.set(category.id, category);
        byName.set(category.name.trim().toLowerCase(), category);
    });

    const colorOf = (category?: T | null) =>
        category?.color ? normalizeHexColor(category.color) : null;

    /** Cari kategori yang dimaksud beserta induk teratas dalam grupnya. */
    const lookup = (category: {
        categoryId?: number | null;
        categoryName?: string | null;
    }) => {
        const name = category.categoryName?.trim().toLowerCase();
        const matched =
            (category.categoryId ? byId.get(category.categoryId) : undefined) ??
            (name ? byName.get(name) : undefined);
        if (!matched) return null;

        // Telusuri ke induk teratas agar warna subkategori ikut berubah saat induk diubah.
        let root: T = matched;
        let guard = 0;
        let parentId = parentIdOf(root);
        while (parentId && byId.has(parentId) && guard < 10) {
            root = byId.get(parentId)!;
            parentId = parentIdOf(root);
            guard += 1;
        }

        return { matched, root, isChild: root !== matched };
    };

    /** Hex warna efektif (sudah mewarisi warna induk), atau null bila kategori tanpa warna. */
    const resolveHex = (category: {
        categoryId?: number | null;
        categoryName?: string | null;
    }): string | null => {
        const entry = lookup(category);
        if (!entry) return null;

        return colorOf(entry.root) ?? colorOf(entry.matched);
    };

    const tone = (category: {
        categoryId?: number | null;
        categoryName?: string | null;
    }): CategoryBadgeTone => {
        const hex = resolveHex(category);
        if (hex) {
            const preset = CATEGORY_COLOR_CLASSES[hex];
            if (preset) return { className: preset };

            // Warna kustom di luar palet: tampilkan apa adanya lewat inline style.
            return {
                className: "",
                style: {
                    backgroundColor: `${hex}1a`,
                    color: hex,
                    borderColor: `${hex}33`,
                },
            };
        }

        // Subkategori dari grup tanpa warna memakai warna default tipe grupnya,
        // sama seperti tampilan grup di halaman Manage Categories.
        const entry = lookup(category);
        if (entry?.isChild) {
            const groupType = entry.root.type ?? entry.matched.type;
            return {
                className:
                    CATEGORY_COLOR_CLASSES[
                    groupType === "INCOME" ? "#10b981" : "#f43f5e"
                    ],
            };
        }

        const lower = (category.categoryName ?? "").toLowerCase();
        const keywordTone = CATEGORY_NAME_TONES.find((rule) =>
            rule.keywords.some((keyword) => lower.includes(keyword))
        );

        return { className: keywordTone?.className ?? CATEGORY_BADGE_FALLBACK };
    };

    return { resolveHex, tone };
}
