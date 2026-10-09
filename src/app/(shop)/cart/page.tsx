import type { Metadata } from "next";
import { CartView } from "./cart-view";
import { prisma } from "@/lib/prisma";
import { getShippingConfig } from "@/lib/checkout";
import { CARD_INCLUDE, toCardProduct } from "@/lib/product-view";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the items in your Eid Bazar cart before checkout.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: false },
};
export const revalidate = 300;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export default async function CartPage() {
  const [shipping, popular] = await Promise.all([
    getShippingConfig(),
    // Best sellers of the last 60 days, for an empty cart.
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] }, createdAt: { gt: daysAgo(60) } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
  ]);
  const ids = popular.map((p) => p.productId);
  let products = await prisma.product.findMany({
    where: { id: { in: ids }, published: true, stock: { gt: 0 } },
    include: CARD_INCLUDE,
  });
  products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  if (products.length < 4) {
    products = [
      ...products,
      ...(await prisma.product.findMany({
        where: { published: true, featured: true, stock: { gt: 0 }, id: { notIn: products.map((p) => p.id) } },
        include: CARD_INCLUDE,
        take: 8 - products.length,
      })),
    ];
  }
  return (
    <CartView
      freeThreshold={shipping.freeThreshold}
      insideDhaka={shipping.insideDhaka}
      outsideDhaka={shipping.outsideDhaka}
      suggestions={products.slice(0, 8).map(toCardProduct)}
    />
  );
}
