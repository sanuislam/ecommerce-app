"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

const GRADIENTS = [
  "from-rose-100 via-pink-50 to-rose-200/70 dark:from-rose-950/60 dark:via-pink-950/40 dark:to-rose-900/50",
  "from-sky-100 via-blue-50 to-indigo-200/70 dark:from-sky-950/60 dark:via-blue-950/40 dark:to-indigo-900/50",
  "from-emerald-100 via-teal-50 to-cyan-200/70 dark:from-emerald-950/60 dark:via-teal-950/40 dark:to-cyan-900/50",
  "from-amber-100 via-orange-50 to-rose-200/70 dark:from-amber-950/60 dark:via-orange-950/40 dark:to-rose-900/50",
  "from-violet-100 via-purple-50 to-fuchsia-200/70 dark:from-violet-950/60 dark:via-purple-950/40 dark:to-fuchsia-900/50",
  "from-lime-100 via-green-50 to-emerald-200/70 dark:from-lime-950/60 dark:via-green-950/40 dark:to-emerald-900/50",
  "from-yellow-100 via-amber-50 to-orange-200/70 dark:from-yellow-950/60 dark:via-amber-950/40 dark:to-orange-900/50",
  "from-slate-100 via-gray-50 to-zinc-200/70 dark:from-slate-950/60 dark:via-gray-950/40 dark:to-zinc-900/50",
];

export function CategoryCards({ categories }: { categories: CategoryCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {categories.map((c, i) => {
        const gradient = GRADIENTS[i % GRADIENTS.length];
        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.45,
              delay: i * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ y: -4 }}
          >
            <Link
              href={`/products?category=${c.slug}`}
              className={`group relative flex aspect-[5/3] items-end overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br ${gradient} p-3 shadow-sm transition-shadow hover:shadow-lg sm:aspect-[3/2]`}
            >
              {c.image && (
                <Image
                  src={c.image}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="pointer-events-none absolute inset-0 z-0 object-cover opacity-20 mix-blend-multiply transition-all duration-500 group-hover:scale-110 group-hover:opacity-30 dark:opacity-25 dark:mix-blend-screen"
                />
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-background/40 via-transparent to-transparent"
              />
              <span className="relative z-10 text-sm font-semibold text-foreground drop-shadow-sm">
                {c.name}
              </span>
              <ArrowRight className="absolute right-2.5 top-2.5 z-10 size-3.5 text-foreground/70 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
