"use client";

import { useEffect, useRef, useState } from "react";
import { lineKey, useCart, type CartLine } from "@/store/cart";

export type QuoteLine = {
  productId: string;
  variantId: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: number;
};

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  zone: "DHAKA" | "OUTSIDE_DHAKA";
  coupon: { id: string; code: string } | null;
  couponError: string | null;
  errors: string[];
};

/**
 * Asks the server to price the cart (debounced). Also writes the server's
 * prices and stock back into the cart so what the customer sees is current.
 */
export function useQuote(items: CartLine[], district: string, couponCode = "") {
  const sync = useCart((s) => s.sync);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const payload = JSON.stringify({
    items: items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId ?? null,
      quantity: i.quantity,
    })),
    district: district || "Dhaka",
    couponCode,
  });

  const empty = items.length === 0;

  useEffect(() => {
    if (empty) return;
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        if (!res.ok) return;
        const q = (await res.json()) as Quote;
        if (id !== seq.current) return;
        setQuote(q);
        sync(
          q.lines.map((l) => ({
            key: lineKey(l),
            price: l.unitPrice,
            stock: l.available,
          })),
        );
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  return { quote: empty ? null : quote, loading: !empty && loading };
}
