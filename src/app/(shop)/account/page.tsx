import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Heart, LayoutDashboard, Package, Star, Truck, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/site/order-status-badge";
import { AccountShell } from "@/components/account/account-shell";
import { orderNo } from "@/lib/order-number";
import { hasRealEmail, productsToReview } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/account");
  const userId = session.user.id;

  const [user, recent, totalOrders, activeOrders, unpaid, wishlistCount, toReview, addressCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, firstName: true, phone: true, email: true, role: true, staffRole: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { items: { select: { id: true, image: true, name: true }, take: 4 } },
    }),
    prisma.order.count({ where: { userId } }),
    prisma.order.count({ where: { userId, status: { in: ["PENDING", "PAID", "SHIPPED"] } } }),
    prisma.order.count({
      where: { userId, status: "PENDING", paymentMethod: "BKASH", bkashPaymentId: { not: null }, paymentTransactionId: null },
    }),
    prisma.wishlistItem.count({ where: { userId } }),
    productsToReview(userId, 4),
    prisma.address.count({ where: { userId, archived: false } }),
  ]);
  if (!user) redirect("/sign-in");

  const first = user.firstName || user.name?.split(" ")[0] || "there";
  const todo: { href: string; text: string; icon: React.ComponentType<{ className?: string }> }[] = [];
  if (unpaid) todo.push({ href: "/orders?tab=active", text: `${unpaid} order${unpaid > 1 ? "s" : ""} waiting for bKash payment`, icon: Wallet });
  if (toReview.total) todo.push({ href: "/account/reviews", text: `Review ${toReview.total} item${toReview.total > 1 ? "s" : ""} you received`, icon: Star });
  if (!addressCount) todo.push({ href: "/account/addresses", text: "Save a delivery address for faster checkout", icon: Truck });
  if (!hasRealEmail(user.email)) todo.push({ href: "/account/profile", text: "Add your e-mail for receipts and password sign-in", icon: Package });

  const stats = [
    { href: "/orders", label: "Orders", value: totalOrders, icon: Package },
    { href: "/orders?tab=active", label: "In progress", value: activeOrders, icon: Truck },
    { href: "/account/reviews", label: "To review", value: toReview.total, icon: Star },
    { href: "/wishlist", label: "Wishlist", value: wishlistCount, icon: Heart },
  ];

  return (
    <AccountShell
      title={`Hi, ${first}`}
      description={`Member since ${formatDate(user.createdAt)}`}
      action={
        isAdminUser(user.role, user.staffRole) ? (
          <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            <LayoutDashboard className="size-4" /> Admin panel
          </Link>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ href, label, value, icon: Icon }) => (
          <Link key={label} href={href} className="rounded-lg border bg-card p-4 transition hover:shadow-sm">
            <Icon className="size-4 text-muted-foreground" />
            <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </Link>
        ))}
      </div>

      {todo.length > 0 && (
        <section className="mt-6 rounded-lg border bg-card">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">To do</h2>
          <ul className="divide-y">
            {todo.map(({ href, text, icon: Icon }) => (
              <li key={href + text}>
                <Link href={href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50">
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="flex-1">{text}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          {totalOrders > 3 && (
            <Link href="/orders" className="text-sm font-medium text-primary hover:underline">
              See all
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No orders yet.{" "}
            <Link href="/products" className="font-medium text-primary hover:underline">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition hover:shadow-sm"
              >
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((i) => (
                    <span key={i.id} className="relative size-11 overflow-hidden rounded-md border-2 border-card bg-muted">
                      {i.image && <Image src={i.image} alt="" fill sizes="44px" className="object-cover" />}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{orderNo(o)}</div>
                  <div className="truncate text-xs text-muted-foreground">{formatDate(o.createdAt)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <OrderStatusBadge order={o} />
                  <span className="font-medium">{formatPrice(Number(o.total))}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AccountShell>
  );
}
