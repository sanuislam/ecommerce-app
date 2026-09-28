import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { CARD_INCLUDE, toCardProduct } from "@/lib/product-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/wishlist");

  const rows = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id, product: { published: true } },
    orderBy: { createdAt: "desc" },
    include: { product: { include: CARD_INCLUDE } },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Wishlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {rows.length} saved {rows.length === 1 ? "item" : "items"}
      </p>
      {rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed p-10 text-center sm:p-16">
          <Heart className="size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Nothing saved yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on any product to save it for later.
          </p>
          <Button asChild className="mt-4">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {rows.map((r) => (
            <ProductCard key={r.id} product={toCardProduct(r.product)} />
          ))}
        </div>
      )}
    </div>
  );
}
