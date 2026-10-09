"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, AlertCircle, Truck, TicketPercent, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/product-card";
import type { ProductCardData } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { lineKey, MAX_QTY_PER_LINE, useCart } from "@/store/cart";
import { useQuote } from "@/hooks/use-quote";
import { formatPrice } from "@/lib/utils";

const noop = () => () => {};

type Props = {
  freeThreshold: number;
  insideDhaka: number;
  outsideDhaka: number;
  suggestions: ProductCardData[];
};

export function CartView({ freeThreshold, insideDhaka, outsideDhaka, suggestions }: Props) {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const localSubtotal = useCart((s) => s.subtotal());
  // Cart lives in localStorage, so only render it after hydration.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const { quote } = useQuote(mounted ? items : [], "Dhaka", coupon);

  const subtotal = quote?.subtotal ?? localSubtotal;
  const availableByKey = new Map(quote?.lines.map((l) => [lineKey(l), l.available]) ?? []);
  const hasProblems = (quote?.errors.length ?? 0) > 0;
  const discount = coupon && !quote?.couponError ? (quote?.discount ?? 0) : 0;
  const freeLeft = freeThreshold > 0 ? Math.max(0, freeThreshold - subtotal) : null;
  const deliveryText =
    freeLeft === 0
      ? "Free"
      : insideDhaka === outsideDhaka
        ? formatPrice(insideDhaka)
        : `${formatPrice(insideDhaka)} Dhaka · ${formatPrice(outsideDhaka)} other districts`;
  const checkoutHref = coupon && !quote?.couponError ? `/checkout?coupon=${encodeURIComponent(coupon)}` : "/checkout";

  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your cart</h1>
        <div className="mt-8 h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your cart</h1>

      {items.length === 0 ? (
        <>
          <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center sm:p-16">
            <ShoppingBag className="size-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">Your cart is empty</h2>
            <p className="mt-1 text-sm text-muted-foreground">Find something you love and bring it home.</p>
            <Button asChild className="mt-4">
              <Link href="/products">Shop now</Link>
            </Button>
          </div>
          {suggestions.length ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold tracking-tight">Popular right now</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {suggestions.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[1fr_360px] lg:gap-8">
          <div className="min-w-0 space-y-3">
            {hasProblems && (
              <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <ul className="space-y-0.5">
                  {quote!.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const key = lineKey(item);
                const available = availableByKey.get(key) ?? item.stock;
                const max = Math.min(MAX_QTY_PER_LINE, available ?? MAX_QTY_PER_LINE);
                return (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-3 rounded-lg border bg-card p-3 sm:gap-4"
                  >
                    <Link
                      href={`/products/${item.slug}`}
                      className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted sm:size-24"
                    >
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
                      ) : null}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${item.slug}`}
                          className="line-clamp-2 min-w-0 text-sm font-medium hover:underline sm:text-base"
                        >
                          {item.name}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="-mt-1 -mr-1 shrink-0 text-muted-foreground"
                          onClick={() => remove(key)}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      {item.variantName && (
                        <div className="text-xs text-muted-foreground">{item.variantName}</div>
                      )}
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatPrice(item.price)} each
                      </div>
                      {available != null && available < item.quantity && (
                        <div className="mt-1 text-xs font-medium text-destructive">
                          {available > 0 ? `Only ${available} left` : "Out of stock"}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <div className="inline-flex items-center rounded-md border">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setQuantity(key, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setQuantity(key, item.quantity + 1)}
                            disabled={item.quantity >= max}
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                        <div className="text-sm font-semibold sm:text-base">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <aside className="h-fit rounded-lg border bg-card p-4 lg:sticky lg:top-20">
            <h2 className="text-lg font-semibold">Order summary</h2>
            {freeLeft != null ? (
              <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <Truck className="size-4" />
                  {freeLeft === 0 ? "You get free delivery" : `Add ${formatPrice(freeLeft)} more for free delivery`}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-border" aria-hidden>
                  <div
                    className="h-1.5 rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${Math.min(100, (subtotal / freeThreshold) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items ({items.reduce((n, i) => n + i.quantity, 0)})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Coupon {coupon}</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-right text-muted-foreground">{deliveryText}</span>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal - discount)}</span>
            </div>
            <div className="mt-3">
              {coupon ? (
                <div className="flex items-center justify-between rounded-md border border-dashed p-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <TicketPercent className="size-4" />
                    <span className="font-mono font-medium">{coupon}</span>
                    {quote?.couponError ? <span className="text-xs text-destructive">· {quote.couponError}</span> : null}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove coupon"
                    onClick={() => {
                      setCoupon("");
                      setCouponInput("");
                    }}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setCoupon(couponInput.trim().toUpperCase());
                  }}
                >
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    maxLength={40}
                  />
                  <Button type="submit" variant="outline" disabled={!couponInput.trim()}>
                    Apply
                  </Button>
                </form>
              )}
            </div>
            <Button asChild className="mt-4 w-full" size="lg" disabled={hasProblems}>
              <Link
                href={checkoutHref}
                aria-disabled={hasProblems}
                className={hasProblems ? "pointer-events-none opacity-50" : undefined}
              >
                Checkout <ArrowRight className="size-4" />
              </Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
