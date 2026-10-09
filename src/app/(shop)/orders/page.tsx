import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/site/order-status-badge";
import { AccountShell } from "@/components/account/account-shell";
import { orderNo, parseOrderNo } from "@/lib/order-number";
import { ORDER_TABS } from "@/lib/order-status";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your orders",
  description: "Track and manage your Eid Bazar orders.",
  alternates: { canonical: "/orders" },
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ tab?: string; q?: string; page?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/orders");
  const sp = await searchParams;
  const tab = ORDER_TABS.find((t) => t.k === (sp.tab ?? "")) ?? ORDER_TABS[0];
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Math.floor(Number(sp.page) || 1)));

  const number = q ? parseOrderNo(q) : null;
  const where: Prisma.OrderWhereInput = {
    userId: session.user.id,
    ...(tab.statuses ? { status: { in: [...tab.statuses] } } : {}),
    ...(q
      ? {
          OR: [
            ...(number ? [{ number }] : []),
            { items: { some: { name: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [orders, total, anyOrder] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: { select: { id: true, name: true, image: true, quantity: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.order.findFirst({ where: { userId: session.user.id }, select: { id: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: { tab?: string; q?: string; page?: number }) => {
    const u = new URLSearchParams();
    const t = p.tab ?? tab.k;
    const qq = p.q ?? q;
    if (t) u.set("tab", t);
    if (qq) u.set("q", qq);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    const s = u.toString();
    return s ? `/orders?${s}` : "/orders";
  };

  return (
    <AccountShell title="My orders" description={anyOrder ? `${total} order${total === 1 ? "" : "s"}` : undefined}>
      {!anyOrder ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p>You haven&apos;t placed any orders yet.</p>
          <Button asChild className="mt-4">
            <Link href="/products">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Order status">
              {ORDER_TABS.map((t) => (
                <Link
                  key={t.k}
                  href={href({ tab: t.k, page: 1 })}
                  role="tab"
                  aria-selected={t.k === tab.k}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
                    t.k === tab.k ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </div>
            <form action="/orders" className="relative sm:w-64">
              {tab.k && <input type="hidden" name="tab" value={tab.k} />}
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q} placeholder="Order no. or product" aria-label="Search orders" className="pl-8" />
            </form>
          </div>

          {orders.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No orders match.{" "}
              <Link href="/orders" className="font-medium text-primary hover:underline">
                Show all orders
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {orders.map((o) => {
                const count = o.items.reduce((n, i) => n + i.quantity, 0);
                return (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="block rounded-lg border bg-card p-4 transition hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-medium">Order {orderNo(o)}</span>
                        <span className="text-sm text-muted-foreground"> · {formatDate(o.createdAt)}</span>
                      </div>
                      <OrderStatusBadge order={o} />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex gap-1.5">
                        {o.items.slice(0, 4).map((i) => (
                          <span key={i.id} className="relative size-14 overflow-hidden rounded-md border bg-muted">
                            {i.image && <Image src={i.image} alt={i.name} fill sizes="56px" className="object-cover" />}
                          </span>
                        ))}
                        {o.items.length > 4 && (
                          <span className="flex size-14 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                            +{o.items.length - 4}
                          </span>
                        )}
                      </div>
                      <div className="ml-auto text-right">
                        <div className="font-semibold">{formatPrice(Number(o.total))}</div>
                        <div className="text-xs text-muted-foreground">
                          {count} item{count === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                      {o.items.map((i) => i.name).join(", ")}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-between gap-2 text-sm" aria-label="Pages">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={href({ page: page - 1 })}>
                    <ChevronLeft className="size-4" /> Newer
                  </Link>
                </Button>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={href({ page: page + 1 })}>
                    Older <ChevronRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </AccountShell>
  );
}
