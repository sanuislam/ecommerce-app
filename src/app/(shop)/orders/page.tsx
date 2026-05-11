import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">My orders</h1>
      {orders.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          You haven&apos;t placed any orders yet.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition hover:shadow-sm"
            >
              <div>
                <div className="font-medium">Order #{o.id.slice(0, 8)}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(o.createdAt)} · {o.items.length}{" "}
                  {o.items.length === 1 ? "item" : "items"}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    o.status === "PAID" || o.status === "DELIVERED"
                      ? "default"
                      : o.status === "CANCELLED"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {o.status}
                </Badge>
                <div className="font-semibold">
                  {formatPrice(Number(o.total))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
