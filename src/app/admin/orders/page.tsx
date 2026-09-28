import Link from "next/link";
import { Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { expireStaleOrders, STATUS_LABEL } from "@/lib/orders";
import { OrderStatus, type Prisma } from "@/generated/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ status?: string | string[]; q?: string | string[] }>;
};

const STATUSES = Object.values(OrderStatus);

function statusVariant(s: OrderStatus) {
  if (s === "PAID" || s === "DELIVERED") return "default" as const;
  if (s === "CANCELLED" || s === "REFUNDED") return "destructive" as const;
  return "secondary" as const;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function hrefFor(status: OrderStatus | null, q: string) {
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  if (q) sp.set("q", q);
  const s = sp.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  // Lazily cancel abandoned online-payment orders so stock is released.
  await expireStaleOrders(60).catch(() => 0);

  const sp = await searchParams;
  const rawStatus = first(sp.status)?.toUpperCase();
  const status = STATUSES.find((s) => s === rawStatus) ?? null;
  const q = (first(sp.q) ?? "").trim().slice(0, 100);

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status;
  if (q) {
    const idTerm = q.replace(/^#/, "").toLowerCase();
    const digits = q.replace(/[^\d]/g, "");
    const or: Prisma.OrderWhereInput[] = [
      { id: { startsWith: idTerm } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { paymentEmail: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
    ];
    if (digits.length >= 4) {
      // Match the last digits so "01711…", "+8801711…" and "1711…" all hit.
      const tail = digits.slice(-10);
      or.push(
        { address: { phone: { contains: tail } } },
        { user: { phone: { contains: tail } } },
        { paymentSenderNumber: { contains: tail } },
      );
    }
    where.OR = or;
  }

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { email: true, name: true, phone: true } },
        address: { select: { phone: true, fullName: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countBy = new Map(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((n, c) => n + c._count._all, 0);
  const tabs: Array<{ status: OrderStatus | null; label: string; count: number }> = [
    { status: null, label: "All", count: total },
    ...STATUSES.map((s) => ({ status: s, label: STATUS_LABEL[s], count: countBy.get(s) ?? 0 })),
  ];

  const empty = q || status ? "No orders match these filters." : "No orders yet.";

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      <nav
        aria-label="Filter by status"
        className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {tabs.map((t) => {
          const active = t.status === status;
          return (
            <Link
              key={t.label}
              href={hrefFor(t.status, q)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className={cn("text-xs", active ? "opacity-80" : "opacity-60")}>
                {t.count}
              </span>
            </Link>
          );
        })}
      </nav>

      <form method="get" action="/admin/orders" className="mt-3 flex gap-2 sm:max-w-md">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Order ID, phone or email"
            className="pl-8"
            aria-label="Search orders"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q && (
          <Button asChild variant="ghost" size="icon" aria-label="Clear search">
            <Link href={hrefFor(status, "")}>
              <X className="size-4" />
            </Link>
          </Button>
        )}
      </form>

      {/* Stacked cards on phones */}
      <ul className="mt-4 space-y-2 sm:hidden">
        {orders.length === 0 ? (
          <li className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            {empty}
          </li>
        ) : (
          orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="block rounded-lg border bg-card p-3 transition active:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">#{o.id.slice(0, 8)}</span>
                  <Badge variant={statusVariant(o.status)}>{STATUS_LABEL[o.status]}</Badge>
                </div>
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {o.address?.fullName || o.user.name || o.user.email}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {o._count.items} item{o._count.items === 1 ? "" : "s"} ·{" "}
                    {formatDate(o.createdAt)}
                  </span>
                  <span className="font-semibold">{formatPrice(Number(o.total))}</span>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>

      {/* Table from sm up */}
      <div className="mt-4 hidden overflow-hidden rounded-lg border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      #{o.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{o.user.email}</div>
                    {(o.address?.phone || o.user.phone) && (
                      <div className="text-xs text-muted-foreground">
                        {o.address?.phone || o.user.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{o._count.items}</TableCell>
                  <TableCell>{formatPrice(Number(o.total))}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(o.status)}>{STATUS_LABEL[o.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(o.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {orders.length === 100 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing the 100 most recent matches. Narrow the search to find older orders.
        </p>
      )}
    </div>
  );
}
