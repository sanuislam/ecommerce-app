"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

type Item = { id: string; name: string; price: number; quantity: number; variant?: string | null };

/** The thank-you page: Purchase / purchase, once per order in this browser. */
export function TrackPurchase({ orderId, value, shipping, items }: { orderId: string; value: number; shipping: number; items: Item[] }) {
  useEffect(() => {
    const key = `tracked:${orderId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    track("Purchase", items, { orderId, value, shipping });
  }, [orderId, value, shipping, items]);
  return null;
}
