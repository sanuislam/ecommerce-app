"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export type CategoryCardData = {
  id: string;
  name: string;
  slug: string;
  /** Category image, or the best product photo in the category. */
  image: string | null;
  productCount: number;
};

// Fallback washes when a category has no photo yet.
const FALLBACKS = [
  // Brand family only: rose, gold and their deep shades.
  "from-brand-600 to-gold-400",
  "from-brand-800 to-brand-500",
  "from-gold-600 to-gold-300",
  "from-brand-700 to-gold-500",
  "from-brand-900 to-brand-600",
  "from-gold-700 to-brand-500",
];

// One small rendition serves both the blurred backdrop and the thumbnail,
// so each card downloads a single image.
const IMG_SIZES = "(min-width: 640px) 176px, 136px";

export function CategoryCards({ categories }: { categories: CategoryCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {categories.map((c, i) => {
        // On 2-column phones, a lone last card spans the full row.
        const wide = i === categories.length - 1 && categories.length % 2 === 1;
        return (
        <li key={c.id} className={wide ? "col-span-2 sm:col-span-1" : undefined}>
          <Link
            href={`/category/${c.slug}`}
            className={`group relative isolate flex ${wide ? "aspect-[2/1]" : "aspect-[5/6]"} flex-col justify-between overflow-hidden rounded-2xl bg-brand-900 p-3 text-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none sm:aspect-square sm:p-4 md:aspect-[4/3]`}
          >
            {/* Blurred backdrop */}
            {c.image ? (
              <Image
                src={c.image}
                alt=""
                aria-hidden
                fill
                sizes={IMG_SIZES}
                className="-z-20 scale-125 object-cover blur-xl brightness-[0.85] saturate-150 transition-transform duration-700 group-hover:scale-[1.35]"
              />
            ) : (
              <div
                aria-hidden
                className={`absolute inset-0 -z-20 bg-gradient-to-br ${FALLBACKS[i % FALLBACKS.length]}`}
              />
            )}
            {/* Readability scrim + soft light */}
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#2a0f18]/80 via-[#2a0f18]/25 to-transparent" />
            <div
              aria-hidden
              className="absolute -top-10 -right-10 -z-10 size-32 rounded-full bg-white/20 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
            />

            {/* Sharp product photo */}
            <div className="flex justify-end">
              <div className="relative size-14 rotate-3 overflow-hidden rounded-xl bg-white/10 shadow-lg ring-2 ring-white/70 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-0 sm:size-16 lg:size-20">
                {c.image ? (
                  <Image src={c.image} alt={c.name} fill sizes={IMG_SIZES} className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-2xl font-bold">
                    {c.name.charAt(0)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <h3 className="line-clamp-3 text-[13px] leading-snug font-semibold drop-shadow min-[360px]:line-clamp-2 min-[360px]:text-sm sm:text-base">
                  {c.name}
                </h3>
                <p className="mt-0.5 text-xs text-white/75">
                  {c.productCount} {c.productCount === 1 ? "item" : "items"}
                </p>
              </div>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-brand-700 sm:size-9">
                <ArrowUpRight className="size-4" />
              </span>
            </div>
          </Link>
        </li>
        );
      })}
    </ul>
  );
}
