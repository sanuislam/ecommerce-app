"use client";

import Link from "next/link";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Flame, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export type FlashDealProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  flashDealDiscount: number;
  images: string[];
};

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

export function FlashDeals({ products, endsAt }: { products: FlashDealProduct[]; endsAt: string | null }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
          {products.map((p, i) => {
            const discount = p.flashDealDiscount;
            const flashPrice = Math.round(p.price * (1 - discount / 100) * 100) / 100;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <Link
                  href={`/products/${p.slug}`}
                  className="group block overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {p.images[0] && (
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    )}
                    <Badge className="absolute left-2 top-2 bg-rose-600 text-white hover:bg-rose-600">
                      -{discount}%
                    </Badge>
                  </div>
                  <div className="space-y-1 p-3">
                    <div className="line-clamp-1 text-sm font-medium">
                      {p.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                        {formatPrice(flashPrice)}
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(p.price)}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <Link
            href="/products?sale=1"
            className="inline-flex items-center gap-1 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            View all deals <ArrowRight className="size-4" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
