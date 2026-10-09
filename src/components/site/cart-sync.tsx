"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { lineKey, useCart } from "@/store/cart";
import type { CartLineView } from "@/lib/carts";

/**
 * Keeps a copy of a signed-in shopper's cart on the server (a few seconds
 * after it changes), so the shop can remind them about a forgotten cart.
 */
export function CartSync() {
  const { status, data } = useSession();
  const userId = data?.user?.id;
  const items = useCart((s) => s.items);
  const last = useRef<string | null>(null);
  // Never send the empty cart that exists before localStorage is read.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useCart.persist.hasHydrated()) {
      queueMicrotask(() => setHydrated(true));
      return;
    }
    return useCart.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Once per sign-in: bring in what this account left in the cart on another
  // device (merged; nothing in this browser's cart is removed).
  const [merged, setMerged] = useState(false);
  useEffect(() => {
    if (status !== "authenticated" || !hydrated || !userId || merged) return;
    const key = `cart-merged:${userId}`;
    let done = false;
    try {
      done = sessionStorage.getItem(key) === "1";
    } catch {}
    if (done) {
      queueMicrotask(() => setMerged(true));
      return;
    }
    fetch("/api/cart/sync")
      .then((r) => (r.ok ? r.json() : { lines: [] }))
      .then((d: { lines: CartLineView[] }) => {
        const cart = useCart.getState();
        const have = new Set(cart.items.map(lineKey));
        for (const l of d.lines ?? []) {
          if (have.has(lineKey(l))) continue;
          cart.add({
            productId: l.productId,
            variantId: l.variantId,
            variantName: l.variantName,
            name: l.name,
            slug: l.slug,
            price: l.price,
            image: l.image ?? undefined,
            quantity: Math.min(l.quantity, l.stock),
            stock: l.stock,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        try {
          sessionStorage.setItem(key, "1");
        } catch {}
        setMerged(true);
      });
  }, [status, hydrated, userId, merged]);

  useEffect(() => {
    if (status !== "authenticated" || !hydrated || !merged) return;
    const body = JSON.stringify({
      items: items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: i.quantity })),
    });
    let sent: string | null = last.current;
    try {
      sent ??= sessionStorage.getItem("cart-synced");
    } catch {}
    if (body === sent) return;
    const t = setTimeout(() => {
      fetch("/api/cart/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
        .then((r) => {
          if (!r.ok) return;
          last.current = body;
          try {
            sessionStorage.setItem("cart-synced", body);
          } catch {}
        })
        .catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, [items, status, hydrated, merged]);

  return null;
}
