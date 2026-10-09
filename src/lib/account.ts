import "server-only";
import { prisma } from "@/lib/prisma";

/** Statuses of an order that is still running (blocks deleting the account). */
export const OPEN_ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED"] as const;

/**
 * Products the customer received but hasn't reviewed yet (newest delivery
 * first, one entry per product, still on sale).
 */
export async function productsToReview(userId: string, take = 12) {
  const items = await prisma.orderItem.findMany({
    where: {
      order: { userId, status: "DELIVERED" },
      product: { published: true, reviews: { none: { userId } } },
    },
    orderBy: { order: { createdAt: "desc" } },
    select: {
      productId: true,
      name: true,
      image: true,
      product: { select: { slug: true, name: true, images: true } },
      order: { select: { createdAt: true } },
    },
    take: 200,
  });
  const seen = new Set<string>();
  const out: { productId: string; slug: string; name: string; image: string | null; deliveredOrderAt: Date }[] = [];
  for (const i of items) {
    if (seen.has(i.productId)) continue;
    seen.add(i.productId);
    out.push({
      productId: i.productId,
      slug: i.product.slug,
      name: i.product.name,
      image: i.image ?? i.product.images[0] ?? null,
      deliveredOrderAt: i.order.createdAt,
    });
    if (out.length >= take) break;
  }
  return { list: out, total: seen.size };
}

/** The account has a real e-mail (phone sign-ups get a placeholder ending in .invalid). */
export const hasRealEmail = (email: string | null | undefined) => !!email && !email.endsWith(".invalid");
