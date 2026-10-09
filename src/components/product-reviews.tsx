"use client";

import Image from "next/image";
import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  createdAt: string;
  name: string;
};

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" });

/** Star breakdown (click a row to filter) and the reviews, 10 at a time. */
export function ProductReviews({
  slug,
  initial,
  total,
  breakdown,
}: {
  slug: string;
  initial: ReviewItem[];
  total: number;
  breakdown: Record<number, number>;
}) {
  const [list, setList] = useState(initial);
  const [stars, setStars] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(initial.length >= total);

  async function load(nextStars: number, reset: boolean) {
    setBusy(true);
    const skip = reset ? 0 : list.length;
    const res = await fetch(`/api/products/${slug}/reviews?skip=${skip}&stars=${nextStars}`).catch(() => null);
    const data = res?.ok ? ((await res.json()) as { reviews: ReviewItem[] }) : { reviews: [] };
    const next = reset ? data.reviews : [...list, ...data.reviews];
    setList(next);
    const cap = nextStars ? (breakdown[nextStars] ?? 0) : total;
    setDone(next.length >= cap || data.reviews.length < 10);
    setBusy(false);
  }

  if (total === 0) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <ul className="space-y-1.5 text-sm">
        {[5, 4, 3, 2, 1].map((n) => {
          const c = breakdown[n] ?? 0;
          return (
            <li key={n}>
              <button
                type="button"
                disabled={!c}
                onClick={() => {
                  const s = stars === n ? 0 : n;
                  setStars(s);
                  void load(s, true);
                }}
                className={cn("flex w-full items-center gap-2 rounded px-1 py-0.5 disabled:opacity-50", stars === n && "bg-muted")}
                aria-pressed={stars === n}
              >
                <span className="w-8 shrink-0 tabular-nums">{n} ★</span>
                <span className="h-2 flex-1 rounded-full bg-muted">
                  <span className="block h-2 rounded-full bg-gold-400" style={{ width: `${total ? (c / total) * 100 : 0}%` }} />
                </span>
                <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{c}</span>
              </button>
            </li>
          );
        })}
        {stars ? (
          <li>
            <button type="button" className="text-xs underline" onClick={() => (setStars(0), void load(0, true))}>
              Show all reviews
            </button>
          </li>
        ) : null}
      </ul>
      <div>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          {list.map((r) => (
            <article key={r.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex text-gold-500" aria-label={`${r.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={i <= r.rating ? "size-4 fill-current" : "size-4 text-muted-foreground/40"} />
                  ))}
                </div>
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">· {date(r.createdAt)}</span>
              </div>
              {r.title && <div className="mt-2 text-sm font-medium">{r.title}</div>}
              {r.comment && <p className="mt-1 text-sm break-words whitespace-pre-line text-muted-foreground">{r.comment}</p>}
              {r.images.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.images.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="relative size-16 overflow-hidden rounded-md border">
                      <Image src={u} alt="Customer photo" fill sizes="64px" className="object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Verified purchase</div>
            </article>
          ))}
        </div>
        {!done ? (
          <Button type="button" variant="outline" className="mt-4" disabled={busy} onClick={() => load(stars, false)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Show more reviews
          </Button>
        ) : null}
      </div>
    </div>
  );
}
