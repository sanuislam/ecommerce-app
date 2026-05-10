"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Lock, Truck, RotateCcw, Headphones } from "lucide-react";

const BADGES = [
  { icon: Lock, label: "256-bit SSL" },
  { icon: Truck, label: "Free shipping on ৳1,000+" },
  { icon: RotateCcw, label: "30-day returns" },
  { icon: Headphones, label: "24/7 support" },
];

const PAYMENTS = [
  { name: "bKash", src: "/payments/bkash.png" },
  { name: "Nagad", src: "/payments/nagad.png" },
  { name: "Rocket", src: "/payments/rocket.png" },
  { name: "Upay", src: "/payments/upay.png" },
  { name: "OK Wallet", src: "/payments/okwallet.png" },
  { name: "tap", src: "/payments/tap.png" },
  { name: "SureCash", src: "/payments/surecash.png" },
  { name: "Bank Deposit", src: "/payments/bank.png" },
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
                  className="flex h-9 items-center rounded-md border border-slate-700/40 bg-slate-800 px-2.5 shadow-sm"
                  title={p.name}
                >
                  <Image
                    src={p.src}
                    alt={p.name}
                    width={80}
                    height={24}
                    className="h-5 w-auto object-contain"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
