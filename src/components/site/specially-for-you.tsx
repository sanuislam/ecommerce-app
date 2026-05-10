"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/utils";

export type SpeciallyProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAt: number | null;
  stock: number;
  images: string[];
};

function StockPill({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
        <span className="size-1.5 rounded-full bg-white/90" />
        0 left
      </span>
    );
  }
  if (stock <= 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
        <span className="size-1.5 rounded-full bg-white/90" />
        {stock} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
      <span className="size-1.5 rounded-full bg-white/90" />
      In Stock
    </span>
  );
}

function SpeciallyCard({ product, index }: { product: SpeciallyProduct; index: number }) {
  const add = useCart((s) => s.add);
  const hasDiscount = product.compareAt != null && product.compareAt > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.compareAt! - product.price) / product.compareAt!) * 100)
    : 0;
  const save = hasDiscount ? product.compareAt! - product.price : 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    add({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.images[0],
      quantity: 1,
      stock: product.stock,
    });
    toast.success(`${product.name} added to cart`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-lg"
    >
      <Link href={`/products/${product.slug}`} className="relative block aspect-square bg-muted">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
          {discountPct}% OFF
        </span>
        <span className="absolute bottom-2 left-2">
          <StockPill stock={product.stock} />
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary"
        >
          {product.name}
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-blue-600 dark:text-blue-400">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAt!)}
              </span>
            )}
          </div>
          {hasDiscount && (
            <span className="text-xs font-medium text-muted-foreground">
              Save {formatPrice(save)}
            </span>
          )}
        </div>
        <Button
          onClick={handleAdd}
          disabled={product.stock <= 0}
          className="mt-auto w-full bg-blue-600 text-white shadow-sm hover:bg-blue-700"
        >
          <ShoppingCart className="size-4" />
          Add to Order
        </Button>
      </div>
    </motion.div>
  );
}

export function SpeciallyForYou({ products }: { products: SpeciallyProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex items-center justify-center gap-3"
      >
        <span className="hidden h-px w-16 bg-gradient-to-r from-transparent to-blue-400 sm:block" />
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Specially for You
        </h2>
        <span className="hidden h-px w-16 bg-gradient-to-l from-transparent to-blue-400 sm:block" />
      </motion.div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((p, i) => (
          <SpeciallyCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}
