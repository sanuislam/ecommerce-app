import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unitPrice } from "@/lib/pricing";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

/** Live search box: up to 6 products and 3 categories for what's typed so far. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ products: [], categories: [] });
  const words = q.split(/\s+/).filter(Boolean).slice(0, 5);
  const and: Prisma.ProductWhereInput[] = words.map((w) => ({
    OR: [
      { name: { contains: w, mode: "insensitive" } },
      { category: { name: { contains: w, mode: "insensitive" } } },
      { tags: { has: w.toLowerCase() } },
    ],
  }));
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, AND: and },
      orderBy: [{ stock: "desc" }, { orderItems: { _count: "desc" } }],
      take: 6,
      select: { name: true, slug: true, images: true, price: true, compareAt: true, flashDeal: true, flashDealDiscount: true, stock: true },
    }),
    prisma.category.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 3,
      select: { name: true, slug: true },
    }),
  ]);
  return NextResponse.json(
    {
      products: products.map((p) => ({
        name: p.name,
        slug: p.slug,
        image: p.images[0] ?? null,
        price: unitPrice(p),
        inStock: p.stock > 0,
      })),
      categories,
    },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
  );
}
