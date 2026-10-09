import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanLines, resolveLines } from "@/lib/carts";
import { RestoreCart } from "@/components/site/restore-cart";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order again", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

/** "Order again": puts an old order's items (today's prices, what's in stock) into the cart. */
export default async function ReorderPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/orders/${id}/reorder`)}`);
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    select: { items: { select: { productId: true, variantId: true, quantity: true } } },
  });
  if (!order) notFound();
  const lines = await resolveLines(cleanLines(order.items));
  return (
    <RestoreCart
      lines={lines.filter((l) => l.stock > 0).map((l) => ({ ...l, quantity: Math.min(l.quantity, l.stock) }))}
      next="/cart"
    />
  );
}
