"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/wishlist-button";
import { formatPrice } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  /** Final price the customer pays (flash deals already applied). */
  price: number;
  /** Strike-through price, when there is a discount. */
  compareAt?: number | null;
  images: string[];
  featured?: boolean;
  stock?: number;
  hasVariants?: boolean;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];
  const hasDiscount = product.compareAt != null && product.compareAt > product.price;
  const pct = hasDiscount
    ? Math.round(((product.compareAt! - product.price) / product.compareAt!) * 100)
    : 0;
  const soldOut = product.stock != null && product.stock <= 0;

  return (
    // Shown at once (no fade-in on scroll): the grid is the page's main content.
    <div className="group relative">
      <Link
        href={`/products/${product.slug}`}
        className="block overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? "opacity-60" : ""}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {hasDiscount && <Badge variant="destructive">-{pct}%</Badge>}
            {product.featured && !hasDiscount && <Badge>Featured</Badge>}
            {soldOut && <Badge variant="secondary">Sold out</Badge>}
          </div>
        </div>
        <div className="space-y-1 p-3">
          <div className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight">
            {product.name}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold sm:text-base">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAt!)}
              </span>
            )}
          </div>
          {product.hasVariants && (
            <div className="text-xs text-muted-foreground">More options available</div>
          )}
        </div>
      </Link>
      <WishlistButton
        productId={product.id}
        className="absolute right-2 top-2 bg-background/80 backdrop-blur"
      />
    </div>
  );
}
