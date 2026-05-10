"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-sky-950/40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 -z-10 size-72 rounded-full bg-rose-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 -z-10 size-80 rounded-full bg-sky-300/30 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-xl text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.05, type: "spring", stiffness: 140, damping: 16 }}
          className="relative mx-auto mb-8 inline-flex"
        >
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-rose-400/30 via-fuchsia-400/30 to-amber-400/30 blur-2xl"
          />
          <span className="select-none bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-500 bg-clip-text text-[7rem] font-black leading-none tracking-tight text-transparent sm:text-[9rem]">
            404
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Oops — page not found
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          className="mt-2 text-sm text-muted-foreground sm:text-base"
        >
          The page you&apos;re looking for has moved or no longer exists. Let&apos;s get you back on track.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white shadow-md hover:from-rose-600 hover:to-fuchsia-600">
            <Link href="/">
              <Home className="size-4" />
              Back to home
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/products">
              <ShoppingBag className="size-4" />
              Browse products
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/products">
              <Search className="size-4" />
              Search
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-10"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Take me to Eid Bazar home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
