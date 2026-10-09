import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanLines, resolveLines } from "@/lib/carts";
import { RestoreCart } from "@/components/site/restore-cart";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ coupon?: string }> };

/** The link in a cart reminder: puts the saved items back in the cart and opens checkout. */
export default async function RestoreCartPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { coupon } = await searchParams;
  const code = typeof coupon === "string" && /^[A-Za-z0-9_-]{2,40}$/.test(coupon) ? coupon.toUpperCase() : "";
  const back = `/cart/restore/${encodeURIComponent(id)}${code ? `?coupon=${code}` : ""}`;
  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(back)}`);
  // Only the shopper's own cart.
  const snap = await prisma.cartSnapshot.findFirst({ where: { id, userId: session.user.id } });
  const lines = snap ? await resolveLines(cleanLines(snap.items)) : [];
  return (
    <RestoreCart
      lines={lines.filter((l) => l.stock > 0).map((l) => ({ ...l, quantity: Math.min(l.quantity, l.stock) }))}
      next={code ? `/checkout?coupon=${code}` : "/checkout"}
    />
  );
}
