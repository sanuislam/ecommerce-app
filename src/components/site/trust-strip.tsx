"use client";

import { motion } from "framer-motion";
import { Lock, Truck, RotateCcw, Headphones } from "lucide-react";

const BADGES = [
  { icon: Lock, label: "256-bit SSL" },
  { icon: Truck, label: "Free shipping on ৳1,000+" },
  { icon: RotateCcw, label: "30-day returns" },
  { icon: Headphones, label: "24/7 support" },
];

const PAYMENTS = [
  {
    name: "bKash",
    bg: "bg-[#e2136e]",
    text: "bKash",
  },
  {
    name: "Nagad",
    bg: "bg-[#ec1c24]",
    text: "Nagad",
  },
  {
    name: "Rocket",
    bg: "bg-[#8e3a9d]",
    text: "Rocket",
  },
  {
    name: "Upay",
    bg: "bg-[#e7532c]",
    text: "Upay",
  },
  {
    name: "COD",
    bg: "bg-emerald-600",
    text: "COD",
  },
  {
    name: "Visa / Master",
    bg: "bg-slate-900 dark:bg-slate-100 dark:text-slate-900",
    text: "Card",
  },
];

export function TrustStrip() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
      >
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              Shop with confidence
            </div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Trusted across Bangladesh
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BADGES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs"
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary md:text-right">
              Payment methods
            </div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight md:text-right sm:text-2xl">
              Pay the way you prefer
            </h3>
            <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
              {PAYMENTS.map((p) => (
                <motion.div
                  key={p.name}
                  whileHover={{ y: -2, scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className={`flex h-10 items-center rounded-md px-3 text-xs font-bold tracking-wide text-white shadow-sm ${p.bg}`}
                  title={p.name}
                >
                  {p.text}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
