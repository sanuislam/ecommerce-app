"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { lineKey, useCart } from "@/store/cart";
import type { CartLineView } from "@/lib/carts";

export function RestoreCart({ lines, next }: { lines: CartLineView[]; next: string }) {
  const router = useRouter();
  useEffect(() => {
    const go = () => {
      const cart = useCart.getState();
      const have = new Set(cart.items.map(lineKey));
      for (const l of lines) {
        if (have.has(lineKey(l))) continue;
        cart.add({
          productId: l.productId,
          variantId: l.variantId,
          variantName: l.variantName,
          name: l.name,
          slug: l.slug,
          price: l.price,
          image: l.image ?? undefined,
          quantity: l.quantity,
          stock: l.stock,
        });
      }
      router.replace(useCart.getState().items.length ? next : "/cart");
    };
    if (useCart.persist.hasHydrated()) go();
    else return useCart.persist.onFinishHydration(go);
  }, [lines, next, router]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Bringing back your cart…</p>
      <Link href="/cart" className="text-xs underline">
        Open the cart
      </Link>
    </div>
  );
}
