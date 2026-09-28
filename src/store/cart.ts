"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_QTY_PER_LINE = 20;

export type CartLine = {
  productId: string;
  /** Set when the product has size / colour options. */
  variantId?: string | null;
  variantName?: string | null;
  name: string;
  slug: string;
  /** Display price only — the server always re-prices at checkout. */
  price: number;
  image?: string;
  quantity: number;
  /** Stock when added; used to cap the quantity stepper. */
  stock?: number;
};

export const lineKey = (l: Pick<CartLine, "productId" | "variantId">) =>
  `${l.productId}:${l.variantId ?? ""}`;

const cap = (qty: number, stock?: number) =>
  Math.max(0, Math.min(qty, MAX_QTY_PER_LINE, stock ?? MAX_QTY_PER_LINE));

type CartState = {
  items: CartLine[];
  add: (item: CartLine) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  /** Replace prices / stock with the server's numbers. */
  sync: (updates: { key: string; price: number; stock: number }[]) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const key = lineKey(item);
          const existing = state.items.find((i) => lineKey(i) === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                lineKey(i) === key
                  ? {
                      ...i,
                      ...item,
                      quantity: cap(i.quantity + item.quantity, item.stock ?? i.stock),
                    }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: cap(item.quantity, item.stock) }],
          };
        }),
      remove: (key) =>
        set((state) => ({ items: state.items.filter((i) => lineKey(i) !== key) })),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) => (lineKey(i) === key ? { ...i, quantity: cap(quantity, i.stock) } : i))
            .filter((i) => i.quantity > 0),
        })),
      sync: (updates) =>
        set((state) => {
          const byKey = new Map(updates.map((u) => [u.key, u]));
          return {
            items: state.items.map((i) => {
              const u = byKey.get(lineKey(i));
              return u ? { ...i, price: u.price, stock: u.stock } : i;
            }),
          };
        }),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "cart-v1",
      version: 2,
      // v1 lines have no variantId, which is still a valid v2 line.
      migrate: (persisted) => persisted as CartState,
    },
  ),
);
