"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/store/cart";

/**
 * Keeps a copy of a signed-in shopper's cart on the server (a few seconds
 * after it changes), so the shop can remind them about a forgotten cart.
 */
export function CartSync() {
  const { status } = useSession();
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

  useEffect(() => {
    if (status !== "authenticated" || !hydrated) return;
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
  }, [items, status, hydrated]);

  return null;
}
