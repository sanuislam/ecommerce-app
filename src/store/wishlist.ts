"use client";

import { create } from "zustand";

type WishlistState = {
  ids: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (productId: string) => Promise<boolean>;
  reset: () => void;
};

/** Signed-in user's wishlist, kept in memory and synced with the server. */
export const useWishlist = create<WishlistState>()((set, get) => ({
  ids: new Set(),
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    set({ loaded: true });
    try {
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { productIds: string[] };
      set({ ids: new Set(data.productIds) });
    } catch {
      set({ loaded: false });
    }
  },
  toggle: async (productId) => {
    const was = get().ids.has(productId);
    const optimistic = new Set(get().ids);
    if (was) optimistic.delete(productId);
    else optimistic.add(productId);
    set({ ids: optimistic });
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok) {
      const rollback = new Set(get().ids);
      if (was) rollback.add(productId);
      else rollback.delete(productId);
      set({ ids: rollback });
      throw new Error("Could not update wishlist");
    }
    const data = (await res.json()) as { wishlisted: boolean };
    return data.wishlisted;
  },
  reset: () => set({ ids: new Set(), loaded: false }),
}));
