export interface CategoryOption {
    id: number;
    name: string;
    type?: string | null;
    parent_id?: number | null;
    parentId?: number | null;
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
