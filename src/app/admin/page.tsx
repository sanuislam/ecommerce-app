import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  ArrowRight,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const [productCount, orderCount, userCount, revenue, recentOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
      }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, name: true } } },
      }),
    ]);

  const totalRevenue = Number(revenue._sum.total ?? 0);

  const stats = [
    {
      label: "Revenue",
      value: formatPrice(totalRevenue),
      icon: DollarSign,
    },
    {
      label: "Orders",
      value: orderCount.toString(),
      icon: ShoppingCart,
    },
    {
      label: "Products",
      value: productCount.toString(),
      icon: Package,
    },
    {
      label: "Users",
      value: userCount.toString(),
      icon: Users,
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 rounded-lg border bg-card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2 truncate text-xl font-semibold sm:text-2xl" title={s.value}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="divide-y">
          {recentOrders.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No orders yet.
            </div>
          ) : (
            recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="font-medium">#{o.id.slice(0, 8)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {o.user.email}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className="text-xs text-muted-foreground sm:text-sm">
                    {o.status}
                  </span>
                  <span className="font-semibold">
                    {formatPrice(Number(o.total))}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
