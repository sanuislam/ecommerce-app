import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Star } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AccountShell } from "@/components/account/account-shell";
import { DeleteReviewButton } from "@/components/account/delete-review-button";
import { productsToReview } from "@/lib/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My reviews", robots: { index: false, follow: false } };

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-4 ${i <= n ? "fill-gold-400 text-gold-400" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

export default async function MyReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/account/reviews");
  const userId = session.user.id;
  const [waiting, reviews] = await Promise.all([
    productsToReview(userId, 24),
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { product: { select: { slug: true, name: true, images: true, published: true } } },
    }),
  ]);

  return (
    <AccountShell title="Reviews" description="Your reviews help other shoppers choose.">
      {waiting.list.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Waiting for your review</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {waiting.list.map((p) => (
              <div key={p.productId} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.image && <Image src={p.image} alt="" fill sizes="56px" className="object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-medium">{p.name}</div>
                </div>
                <Button asChild size="sm">
                  <Link href={`/products/${p.slug}#reviews`}>Review</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={waiting.list.length ? "mt-8" : ""}>
        <h2 className="text-lg font-semibold">Your reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            You haven&apos;t written a review yet. You can review anything once it&apos;s delivered to you.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {reviews.map((r) => (
              <article key={r.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {r.product.images[0] && <Image src={r.product.images[0]} alt="" fill sizes="56px" className="object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {r.product.published ? (
                      <Link href={`/products/${r.product.slug}`} className="line-clamp-1 text-sm font-medium hover:underline">
                        {r.product.name}
                      </Link>
                    ) : (
                      <span className="line-clamp-1 text-sm font-medium">{r.product.name}</span>
                    )}
                    <div className="mt-0.5 flex items-center gap-2">
                      <Stars n={r.rating} />
                      <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                {r.comment && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{r.comment}</p>}
                {r.images.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {r.images.map((u) => (
                      <span key={u} className="relative size-14 overflow-hidden rounded-md border bg-muted">
                        <Image src={u} alt="" fill sizes="56px" className="object-cover" />
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex justify-end gap-1">
                  {r.product.published && (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/products/${r.product.slug}#reviews`}>
                        <Pencil className="size-3.5" /> Edit
                      </Link>
                    </Button>
                  )}
                  <DeleteReviewButton slug={r.product.slug} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AccountShell>
  );
}
