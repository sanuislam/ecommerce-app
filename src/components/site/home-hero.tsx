"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { SanityBanner } from "@/lib/sanity";

export function HomeHero({ banners }: { banners: SanityBanner[] }) {
  const primary = banners[0];
  const title = primary?.title ?? "Design-forward gear, delivered fast.";
  const subtitle =
    primary?.subtitle ??
    "Shop curated essentials with free shipping, easy returns, and secure Stripe checkout.";
  const ctaLabel = primary?.ctaLabel ?? "Shop the collection";
  const ctaHref = primary?.ctaHref ?? "/products";

  return (
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/10%),transparent_60%)]" />
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col justify-center gap-6"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            New season drop
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="max-w-prose text-base text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="lg">
              <Link href={ctaHref}>
                {ctaLabel} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/about">Learn more</Link>
            </Button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative hidden overflow-hidden rounded-2xl border bg-muted/40 lg:block"
        >
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,theme(colors.primary/30%),theme(colors.background),theme(colors.primary/20%))] opacity-40" />
          <div className="relative grid h-full grid-cols-3 gap-2 p-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="aspect-square rounded-lg border bg-background/70 backdrop-blur"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
