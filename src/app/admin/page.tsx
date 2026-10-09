import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { isLow, isOut, stockUnits } from "@/lib/inventory";
import { profitSummary } from "@/lib/profit";
import { STATUS_LABEL } from "@/lib/orders";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { orderNo } from "@/lib/order-number";

type Props = { searchParams: Promise<{ denied?: string }> };

export default async function AdminDashboardPage({ searchParams }: Props) {
  const session = await auth();
  const role = session?.user?.role;
  const staffRole = session?.user?.staffRole;
  // Money figures only for those who handle money; lists for those who work them.
  const seeMoney = can(role, staffRole, "reports");
  const seeOrders = can(role, staffRole, "orders");
  const seeStock =
    can(role, staffRole, "inventory") || can(role, staffRole, "products");
  const { denied } = await searchParams;
  const [units, profit] = await Promise.all([stockUnits(), profitSummary(30)]);
  const attention = units
    .filter((u) => isOut(u) || isLow(u))
    .sort((a, b) => a.stock - b.stock);
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
        include: {
          user: { select: { email: true, name: true } },
          address: { select: { fullName: true, phone: true } },
        },
      }),
    ]);

  const totalRevenue = Number(revenue._sum.total ?? 0);

  const allStats = [
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
  const stats = seeMoney
    ? allStats
    : allStats.filter((s) => s.label !== "Revenue");

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      {denied ? (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Your role doesn&apos;t include that page. Ask the owner if you need
          it.
        </p>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="min-w-0 rounded-lg border bg-card p-3 sm:p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="size-4 text-muted-foreground" />
            </div>
            <div
              className="mt-2 truncate text-xl font-semibold sm:text-2xl"
              title={s.value}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {seeMoney && (
          <section className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Profit · last 30 days</h2>
              <span className="text-xs text-muted-foreground">
                {profit.orders} delivered orders
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Sales (after discounts and refunds)
                </dt>
                <dd className="tabular-nums">{formatPrice(profit.revenue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cost of goods</dt>
                <dd className="tabular-nums">−{formatPrice(profit.cost)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Courier charges</dt>
                <dd className="tabular-nums">−{formatPrice(profit.courier)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <dt>Profit</dt>
                <dd className="tabular-nums">
                  {formatPrice(profit.netProfit)}
                </dd>
              </div>
            </dl>
            {profit.orders > 0 && profit.costCoverage < 1 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                {Math.round((1 - profit.costCoverage) * 100)}% of units sold
                have no cost price, so profit looks higher than it is. Add cost
                prices on products.
              </p>
            )}
          </section>
        )}
        {seeStock && (
          <section className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Running low</h2>
              <Link
                href="/admin/inventory"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                Inventory <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {attention.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Stock looks healthy.
              </p>
            ) : (
              <ul className="mt-2 divide-y text-sm">
                {attention.slice(0, 6).map((u) => (
                  <li
                    key={`${u.productId}:${u.variantId ?? ""}`}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span className="min-w-0 truncate">
                      {u.name}
                      {u.option && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {u.option}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        u.stock <= 0
                          ? "font-medium text-destructive"
                          : "font-medium text-amber-700 dark:text-amber-400"
                      }
                    >
                      {u.stock <= 0 ? "Out" : `${u.stock} left`}
                    </span>
                  </li>
                ))}
                {attention.length > 6 && (
                  <li className="pt-2 text-xs text-muted-foreground">
                    and {attention.length - 6} more
                  </li>
                )}
              </ul>
            )}
          </section>
        )}
      </div>

      {seeOrders && (
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
                    <div className="font-medium">{orderNo(o)}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {o.address?.fullName || o.user.name || ""}
                      {" · "}
                      {o.user.email.endsWith(".invalid")
                        ? o.address?.phone
                        : o.user.email}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      {STATUS_LABEL[o.status]}
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
      )}
    </div>
  );
}
