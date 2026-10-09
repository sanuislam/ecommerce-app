"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

type Seen = { id: string; slug: string; name: string; image: string | null; price: number };
const KEY = "recently-viewed-v1";

function read(): Seen[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.slice(0, 12) : [];
  } catch {
    return [];
  }
}

/** Remembers this product (in this browser) and shows the others seen lately. */
export function RecentlyViewed({ current }: { current?: Seen }) {
  const [items, setItems] = useState<Seen[]>([]);
  useEffect(() => {
    const list = read().filter((x) => x.id !== current?.id);
    if (current) {
      try {
        localStorage.setItem(KEY, JSON.stringify([current, ...list].slice(0, 12)));
      } catch {}
    }
    queueMicrotask(() => setItems(list.slice(0, 10)));
  }, [current]);

  if (!items.length) return null;
  return (
    <section className="mt-12 sm:mt-14" aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
        Recently viewed
      </h2>
      <ul className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:px-0">
        {items.map((p) => (
          <li key={p.id} className="w-32 shrink-0 sm:w-40">
            <Link href={`/products/${p.slug}`} className="block rounded-lg border bg-card p-2 hover:shadow-sm">
              <span className="relative block aspect-square overflow-hidden rounded-md bg-muted">
                {p.image ? <Image src={p.image} alt={p.name} fill sizes="160px" className="object-cover" /> : null}
              </span>
              <span className="mt-2 line-clamp-2 text-xs">{p.name}</span>
              <span className="text-sm font-semibold">{formatPrice(p.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
