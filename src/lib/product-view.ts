import { strikePrice, unitPrice, type PricedProduct } from "@/lib/pricing";
import type { ProductCardData } from "@/components/product-card";

type CardSource = PricedProduct & {
  id: string;
  name: string;
  slug: string;
  images: string[];
  featured?: boolean;
  stock: number;
  variants?: { price?: unknown; stock: number }[];
  _count?: { variants: number };
};

/** Maps a product row to what product cards display (prices already final). */
export function toCardProduct(p: CardSource): ProductCardData {
  const hasVariants = (p._count?.variants ?? p.variants?.length ?? 0) > 0;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: unitPrice(p),
    compareAt: strikePrice(p),
    images: p.images,
    featured: p.featured ?? false,
    stock: p.stock,
    hasVariants,
  };
}

/** Prisma `include` fragment that makes toCardProduct aware of options. */
export const CARD_INCLUDE = { _count: { select: { variants: true } } } as const;
