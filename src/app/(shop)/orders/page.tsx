import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/site/order-status-badge";
import { orderNo } from "@/lib/order-number";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your orders",
  description: "Track and manage your Eid Bazar orders.",
  alternates: { canonical: "/orders" },
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/orders");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 50,
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My orders</h1>
      {orders.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p>You haven&apos;t placed any orders yet.</p>
          <Button asChild className="mt-4">
            <Link href="/products">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 transition hover:shadow-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">Order {orderNo(o)}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)}{" "}
                  {o.items.length === 1 && o.items[0].quantity === 1 ? "item" : "items"}
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <OrderStatusBadge order={o} />
                <div className="font-semibold">{formatPrice(Number(o.total))}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
