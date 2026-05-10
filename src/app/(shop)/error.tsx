"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-rose-950/40 dark:via-orange-950/30 dark:to-amber-950/40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-12 -z-10 size-80 rounded-full bg-rose-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 -z-10 size-80 rounded-full bg-amber-300/30 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-xl text-center"
      >
        <motion.div
          initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.05 }}
          className="relative mx-auto mb-6 inline-flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg sm:size-24"
        >
          <span aria-hidden className="absolute inset-0 -z-10 rounded-full bg-rose-400/40 blur-2xl" />
          <AlertTriangle className="size-9 sm:size-11" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Something went wrong
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          className="mt-2 text-sm text-muted-foreground sm:text-base"
        >
          We hit an unexpected error while loading this page. Try again, or head back home.
        </motion.p>

        {error?.digest && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-3 text-xs text-muted-foreground/80"
          >
            Reference: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{error.digest}</code>
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            size="lg"
            onClick={() => unstable_retry()}
            className="bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md hover:from-rose-600 hover:to-orange-600"
          >
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">
              <Home className="size-4" />
              Back to home
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
