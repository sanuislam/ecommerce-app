import "server-only";
import { prisma } from "@/lib/prisma";
import { getOrderSettings } from "@/lib/order-settings";
import { variantLabel } from "@/lib/pricing";

export type StockUnit = {
  productId: string;
  variantId: string | null;
  name: string;
  option: string | null;
  sku: string | null;
  image: string | null;
  stock: number;
  threshold: number;
  cost: number | null;
  price: number;
  published: boolean;
};

/** Every sellable unit (a product without options, or each option), with its warning level. */
export async function stockUnits(filter: { q?: string } = {}): Promise<StockUnit[]> {
  const { lowStockDefault } = await getOrderSettings();
  const products = await prisma.product.findMany({
    where: filter.q
      ? {
          OR: [
            { name: { contains: filter.q, mode: "insensitive" } },
            { variants: { some: { sku: { contains: filter.q, mode: "insensitive" } } } },
          ],
        }
      : {},
    include: { variants: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
    orderBy: { name: "asc" },
  });
  const out: StockUnit[] = [];
  for (const p of products) {
    const threshold = p.lowStockAt ?? lowStockDefault;
    const base = {
      productId: p.id,
      name: p.name,
      image: p.images[0] ?? null,
      threshold,
      published: p.published,
    };
    if (p.variants.length) {
      for (const v of p.variants) {
        out.push({
          ...base,
          variantId: v.id,
          option: variantLabel(v),
          sku: v.sku,
          stock: v.stock,
          cost: v.costPrice != null ? Number(v.costPrice) : p.costPrice != null ? Number(p.costPrice) : null,
          price: v.price != null ? Number(v.price) : Number(p.price),
        });
      }
    } else {
      out.push({
        ...base,
        variantId: null,
        option: null,
        sku: null,
        stock: p.stock,
        cost: p.costPrice != null ? Number(p.costPrice) : null,
        price: Number(p.price),
      });
    }
  }
  return out;
}

export const isLow = (u: StockUnit) => u.stock > 0 && u.stock <= u.threshold;
export const isOut = (u: StockUnit) => u.stock <= 0;
