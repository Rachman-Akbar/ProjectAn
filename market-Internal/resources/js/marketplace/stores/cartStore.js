import { create } from "zustand";
import { persist } from "zustand/middleware";
function maxQuantity(variant) {
    if (!variant) {
        return 0;
    }
    return variant.track_stock ? Math.max(0, Number(variant.stock) || 0) : 999;
}
function clampQuantity(variant, quantity) {
    return Math.min(Math.max(1, quantity), Math.max(1, maxQuantity(variant)));
}
export const useCartStore = create()(persist((set) => ({
    items: [],
    add: (product, variant, quantity = 1) => set((state) => {
        const max = maxQuantity(variant);
        if (!variant.available || max < 1) {
            return state;
        }
        const existing = state.items.find((item) => item.variant.id === variant.id);
        const nextQuantity = clampQuantity(variant, (existing?.quantity ?? 0) + quantity);
        if (existing) {
            return {
                items: state.items.map((item) => item.variant.id === variant.id
                    ? { product, variant, quantity: nextQuantity }
                    : item),
            };
        }
        return {
            items: [...state.items, { product, variant, quantity: clampQuantity(variant, quantity) }],
        };
    }),
    update: (variantId, quantity) => set((state) => ({
        items: state.items.flatMap((item) => {
            if (item.variant.id !== variantId) {
                return [item];
            }
            if (!item.variant.available || maxQuantity(item.variant) < 1) {
                return [];
            }
            return [{ ...item, quantity: clampQuantity(item.variant, quantity) }];
        }),
    })),
    replaceVariant: (currentVariantId, product, variant, quantity = 1) => set((state) => {
        if (!variant.available || maxQuantity(variant) < 1) {
            return state;
        }
        const current = state.items.find((item) => item.variant.id === currentVariantId);
        const target = state.items.find((item) => item.variant.id === variant.id);
        const baseQuantity = current?.quantity ?? quantity;
        const mergedQuantity = target && target.variant.id !== currentVariantId
            ? target.quantity + baseQuantity
            : baseQuantity;
        const withoutCurrentAndTarget = state.items.filter((item) => item.variant.id !== currentVariantId && item.variant.id !== variant.id);
        return {
            items: [
                ...withoutCurrentAndTarget,
                {
                    product,
                    variant,
                    quantity: clampQuantity(variant, mergedQuantity),
                },
            ],
        };
    }),
    remove: (variantId) => set((state) => ({
        items: state.items.filter((item) => item.variant.id !== variantId),
    })),
    clear: () => set({ items: [] }),
}), {
    name: "kishamarket-cart-v4",
    version: 5,
    migrate: (persisted) => {
        const items = Array.isArray(persisted?.items)
            ? persisted.items.filter((item) => item?.product?.id && item?.variant?.id)
            : [];
        return { items };
    },
}));
export const cartSummary = (items) => ({
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + (Number(item.variant.price) || 0) * item.quantity, 0),
});
