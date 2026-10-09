import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";

export type ReviewQuote = {
  id: string;
  rating: number;
  text: string;
  name: string;
  product: { name: string; slug: string };
};

/** Real reviews from customers who received their order. Hidden when there are none yet. */
export function Testimonials({ reviews }: { reviews: ReviewQuote[] }) {
  if (!reviews.length) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-2xl font-semibold tracking-tight">
        What customers say
      </h2>
      <p className="text-sm text-muted-foreground">From customers who received their order.</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <li key={r.id} className="flex flex-col rounded-xl border bg-card p-4">
            <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`size-4 ${i < r.rating ? "fill-gold-400 text-gold-400" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <p className="mt-2 line-clamp-4 flex-1 text-sm leading-relaxed">{r.text}</p>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                {r.name}
                <BadgeCheck className="size-3.5 text-emerald-600" aria-label="Verified buyer" />
              </span>
              <Link href={`/products/${r.product.slug}`} className="truncate hover:underline">
                {r.product.name}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
