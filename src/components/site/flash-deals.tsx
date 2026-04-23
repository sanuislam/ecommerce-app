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
  compareAt: number;
  images: string[];
};

function getMsUntilMidnightDhaka(): number {
  // Dhaka = UTC+6
  const now = new Date();
  const nowDhaka = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const endDhaka = new Date(nowDhaka);
  endDhaka.setUTCHours(24, 0, 0, 0);
  return Math.max(0, endDhaka.getTime() - nowDhaka.getTime());
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function subscribeTick(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}

function Countdown() {
  const ms = useSyncExternalStore<number | null>(
    subscribeTick,
    () => getMsUntilMidnightDhaka(),
    () => null,
  );
  if (ms == null) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-300">
        <Clock className="size-4" />
        <span>--:--:--</span>
      </div>
    );
  }
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return (
    <div className="flex items-center gap-1.5">
      <Clock className="size-4 text-rose-600 dark:text-rose-300" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Ends in
      </span>
      <div className="flex items-center gap-1 text-sm font-semibold tabular-nums">
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

export function FlashDeals({ products }: { products: FlashDealProduct[] }) {
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
          <Countdown />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => {
            const discount = Math.round(
              ((p.compareAt - p.price) / p.compareAt) * 100,
            );
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
                        {formatPrice(p.price)}
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(p.compareAt)}
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
