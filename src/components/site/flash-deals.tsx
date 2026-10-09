"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Flame, Clock, ArrowRight } from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/product-card";


function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// One shared clock: the snapshot changes once a second, never per call
// (a new value on every getSnapshot call makes React re-render forever).
let nowSec = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribeTick(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    nowSec = Math.floor(Date.now() / 1000);
    timer = setInterval(() => {
      nowSec = Math.floor(Date.now() / 1000);
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const getNowSec = () => nowSec || Math.floor(Date.now() / 1000);

/** Counts down to the sale end set in Admin → Settings. */
function Countdown({ endsAt }: { endsAt: string }) {
  const sec = useSyncExternalStore<number | null>(subscribeTick, getNowSec, () => null);
  const ms = sec == null ? null : Math.max(0, Date.parse(endsAt) - sec * 1000);
  if (ms == null) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-300">
        <Clock className="size-4" />
        <span>--:--:--</span>
      </div>
    );
  }
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return (
    <div className="flex items-center gap-1.5">
      <Clock className="size-4 text-rose-600 dark:text-rose-300" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Ends in
      </span>
      <div className="flex items-center gap-1 text-sm font-semibold tabular-nums">
        {days > 0 ? (
          <>
            <span className="rounded bg-rose-600 px-1.5 py-0.5 text-white">{days}d</span>
            <span className="text-rose-600 dark:text-rose-300">:</span>
          </>
        ) : null}
        <span className="rounded bg-rose-600 px-1.5 py-0.5 text-white">
          {pad(hours)}
        </span>
        <span className="text-rose-600 dark:text-rose-300">:</span>
        <span className="rounded bg-rose-600 px-1.5 py-0.5 text-white">
          {pad(mins)}
        </span>
        <span className="text-rose-600 dark:text-rose-300">:</span>
        <span className="rounded bg-rose-600 px-1.5 py-0.5 text-white">
          {pad(secs)}
        </span>
      </div>
    </div>
  );
}

export function FlashDeals({ products, endsAt }: { products: ProductCardData[]; endsAt: string | null }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div
        className="overflow-hidden rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100 p-5 shadow-sm dark:border-rose-900/40 dark:from-rose-950/40 dark:via-orange-950/30 dark:to-amber-950/30 sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md">
              <Flame className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Flash Deals
              </h2>
              <p className="text-xs text-muted-foreground">
                Limited time offers — grab them before they&apos;re gone
              </p>
            </div>
          </div>
          {endsAt ? <Countdown endsAt={endsAt} /> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Link
            href="/products?sale=1"
            className="inline-flex items-center gap-1 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            View all deals <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
