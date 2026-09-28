import type { PrismaClient } from "@/generated/prisma";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "@/lib/demo-catalog";

/**
 * Inserts / refreshes the demo catalogue. Upserts by slug so re-running is
 * safe; existing stock of already-loaded products is left untouched.
 */
export async function loadDemoCatalog(prisma: PrismaClient) {
  const categoryIds = new Map<string, string>();
  for (const c of DEMO_CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { description: c.description },
      create: c,
    });
    categoryIds.set(c.slug, row.id);
  }

  let created = 0;
  let updated = 0;
  for (const p of DEMO_PRODUCTS) {
    const data = {
      name: p.name,
      description: p.description,
      price: p.price,
      compareAt: p.compareAt,
      images: p.images,
      featured: p.featured,
      flashDeal: p.flashDealDiscount != null,
      flashDealDiscount: p.flashDealDiscount,
      published: true,
      categoryId: categoryIds.get(p.category) ?? null,
    };
    const existing = await prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data: { ...data, slug: p.slug, stock: p.stock } });
    if (existing) updated++;
    else created++;

    if (p.variants.length) {
      for (const [position, v] of p.variants.entries()) {
        await prisma.productVariant.upsert({
          where: { productId_size_color: { productId: product.id, size: v.size, color: v.color } },
          update: { position },
          create: { productId: product.id, size: v.size, color: v.color, stock: v.stock, position },
        });
      }
      const agg = await prisma.productVariant.aggregate({
        where: { productId: product.id },
        _sum: { stock: true },
      });
      await prisma.product.update({ where: { id: product.id }, data: { stock: agg._sum.stock ?? 0 } });
    }
  }
  return { categories: DEMO_CATEGORIES.length, created, updated };
}

/** Removes demo products that have never been ordered (ordered ones are unpublished). */
export async function removeDemoCatalog(prisma: PrismaClient) {
  const slugs = DEMO_PRODUCTS.map((p) => p.slug);
  const ordered = await prisma.product.findMany({
    where: { slug: { in: slugs }, orderItems: { some: {} } },
    select: { id: true },
  });
  const keepIds = ordered.map((p) => p.id);
  const removed = await prisma.product.deleteMany({
    where: { slug: { in: slugs }, id: { notIn: keepIds } },
  });
  if (keepIds.length) {
    await prisma.product.updateMany({ where: { id: { in: keepIds } }, data: { published: false } });
  }
  // Drop demo categories that are now empty.
  await prisma.category.deleteMany({
    where: { slug: { in: DEMO_CATEGORIES.map((c) => c.slug) }, products: { none: {} } },
  });
  return { removed: removed.count, hidden: keepIds.length };
}
