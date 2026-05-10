"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type Brand = {
  name: string;
  src: string;
};

const PAYMENT_BRANDS: Brand[] = [
  { name: "bKash", src: "/payments/bkash.png" },
  { name: "Nagad", src: "/payments/nagad.png" },
  { name: "Rocket", src: "/payments/rocket.png" },
  { name: "Upay", src: "/payments/upay.png" },
  { name: "OK Wallet", src: "/payments/okwallet.png" },
  { name: "tap", src: "/payments/tap.png" },
  { name: "SureCash", src: "/payments/surecash.png" },
  { name: "Bank Deposit", src: "/payments/bank.png" },
];

function BrandChip({ brand }: { brand: Brand }) {
  return (
    <motion.li
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="flex h-16 min-w-[110px] items-center justify-center rounded-xl border border-foreground/10 bg-white px-5 shadow-sm transition hover:shadow-md sm:h-20 sm:min-w-[140px] sm:px-6"
      title={brand.name}
      aria-label={brand.name}
    >
      <Image
        src={brand.src}
        alt={brand.name}
        width={140}
        height={48}
        className="h-9 w-auto object-contain sm:h-11"
      />
    </motion.li>
  );
}

export function PaymentsStrip() {
  return (
    <section className="border-t bg-gradient-to-b from-muted/30 to-muted/10 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Payment We Accept
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mobile financial services and bank deposit — all secured by SSL.
          </p>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
        >
          {PAYMENT_BRANDS.map((b) => (
            <BrandChip key={b.name} brand={b} />
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
