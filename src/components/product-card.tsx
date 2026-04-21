"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAt?: number | null;
  images: string[];
  featured?: boolean;
  stock?: number;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];
  const hasDiscount =
    product.compareAt != null && product.compareAt > product.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Link
        href={`/products/${product.slug}`}
        className="group block overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          {product.featured && (
            <Badge className="absolute left-2 top-2" variant="default">
              Featured
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="absolute right-2 top-2" variant="destructive">
              Sale
            </Badge>
          )}
        </div>
        <div className="space-y-1 p-3">
          <div className="line-clamp-1 text-sm font-medium">{product.name}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAt!)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
