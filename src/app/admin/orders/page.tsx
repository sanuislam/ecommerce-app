import Link from "next/link";
import { Download, PhoneCall, Plus, Search, X } from "lucide-react";
import { phoneRisks, phoneTail } from "@/lib/risk";
import { prisma } from "@/lib/prisma";
import { cn, formatPrice } from "@/lib/utils";
import { expireStaleOrders, STATUS_LABEL } from "@/lib/orders";
import {
  ORDER_STATUSES,
  orderWhere,
  ordersHref,
  PAGE_SIZE,
  parseOrderFilters,
  SOURCE_LABEL,
} from "@/lib/admin-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrdersTable, type OrderRow } from "@/components/admin/orders-table";
import type { OrderStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const METHOD_LABEL: Record<string, string> = {
  COD: "Cash on delivery",
  BKASH: "bKash",
  UPAY: "Upay",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  STRIPE: "Card",
};

const dhakaDateTime = (d: Date) =>
  d.toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export default async function AdminOrdersPage({ searchParams }: Props) {
  // Lazily cancel abandoned online-payment orders so stock is released.
  await expireStaleOrders(60).catch(() => 0);

  const f = parseOrderFilters(await searchParams);
  const where = orderWhere(f);

  const [matching, orders, counts, toCall] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true, name: true, phone: true } },
        address: { select: { phone: true, fullName: true, state: true, city: true } },
        _count: { select: { items: true } },
      },
    }),
    // Tab counts follow every filter except the status itself.
    prisma.order.groupBy({ by: ["status"], where: orderWhere(f, false), _count: { _all: true } }),
    prisma.order.count({ where: { paymentMethod: "COD", status: "PENDING", codConfirmedAt: null } }),
  ]);
  const risks = await phoneRisks(orders.map((o) => o.address?.phone || o.user.phone));

  const pages = Math.max(1, Math.ceil(matching / PAGE_SIZE));
  const countBy = new Map(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((n, c) => n + c._count._all, 0);
  const tabs: Array<{ status: OrderStatus | null; label: string; count: number }> = [
    { status: null, label: "All", count: total },
    ...ORDER_STATUSES.map((s) => ({ status: s, label: STATUS_LABEL[s], count: countBy.get(s) ?? 0 })),
  ];

  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    number: o.number,
    customer: o.address?.fullName || o.user.name || o.user.email,
    phone: o.address?.phone || o.user.phone || "",
    place: [o.address?.city, o.address?.state].filter(Boolean).join(", "),
    items: o._count.items,
    total: formatPrice(Number(o.total)),
    status: o.status,
    statusLabel: STATUS_LABEL[o.status],
    placed: dhakaDateTime(o.createdAt),
    method: METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod,
    paid: !!o.paymentTransactionId || o.status === "PAID",
    source: o.source !== "web" ? (SOURCE_LABEL[o.source] ?? o.source) : null,
    courier: o.courier,
    consignment: o.courierConsignmentId,
    courierStatus: o.courierStatus,
    risk: risks.get(phoneTail(o.address?.phone || o.user.phone) ?? "") ?? null,
    needsCall: o.paymentMethod === "COD" && o.status === "PENDING" && !o.codConfirmedAt,
  }));

  const filtered = !!(f.q || f.status || f.method || f.courier || f.from || f.to || f.confirm);
  const exportQs = new URLSearchParams(ordersHref({ ...f, page: 1 }).split("?")[1] ?? "").toString();
  const from = matching === 0 ? 0 : (f.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(matching, f.page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/admin/orders/export${exportQs ? `?${exportQs}` : ""}`}>
              <Download className="size-4" /> Export CSV
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/orders/new">
              <Plus className="size-4" /> New order
            </Link>
          </Button>
        </div>
      </div>

      <nav
        aria-label="Filter by status"
        className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {tabs.map((t) => {
          const active = t.status === f.status;
          return (
            <Link
              key={t.label}
              href={ordersHref(f, { status: t.status })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className={cn("text-xs tabular-nums", active ? "opacity-80" : "opacity-60")}>
                {t.count}
              </span>
            </Link>
          );
        })}
        <Link
          href={ordersHref(f, { confirm: f.confirm ? null : "call", status: null })}
          aria-current={f.confirm ? "page" : undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition",
            f.confirm
              ? "border-amber-600 bg-amber-600 text-white"
              : "border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-200",
          )}
        >
          <PhoneCall className="size-3.5" /> To confirm
          <span className="text-xs tabular-nums opacity-80">{toCall}</span>
        </Link>
      </nav>

      <form method="get" action="/admin/orders" className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-end">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        {f.confirm && <input type="hidden" name="confirm" value={f.confirm} />}
        <div className="relative min-w-0 sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={f.q}
            placeholder="Order, name, phone, email, tracking"
            className="pl-8"
            aria-label="Search orders"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select
            name="method"
            defaultValue={f.method ?? ""}
            aria-label="Payment method"
            className="h-9 rounded-lg border bg-background px-2 text-sm"
          >
            <option value="">All payments</option>
            {["COD", "BKASH", "UPAY", "NAGAD", "ROCKET", "STRIPE"].map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </select>
          <select
            name="courier"
            defaultValue={f.courier ?? ""}
            aria-label="Courier"
            className="h-9 rounded-lg border bg-background px-2 text-sm"
          >
            <option value="">All couriers</option>
            <option value="none">Not booked</option>
            <option value="steadfast">Steadfast</option>
            <option value="pathao">Pathao</option>
            <option value="redx">RedX</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <label className="grid gap-0.5 text-xs text-muted-foreground">
            From
            <input
              type="date"
              name="from"
              defaultValue={f.from}
              className="h-9 rounded-lg border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <label className="grid gap-0.5 text-xs text-muted-foreground">
            To
            <input
              type="date"
              name="to"
              defaultValue={f.to}
              className="h-9 rounded-lg border bg-background px-2 text-sm text-foreground"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary">
            Apply
          </Button>
          {filtered && (
            <Button asChild variant="ghost">
              <Link href="/admin/orders">
                <X className="size-4" /> Clear
              </Link>
            </Button>
          )}
        </div>
      </form>

      <OrdersTable rows={rows} empty={filtered ? "No orders match these filters." : "No orders yet."} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground tabular-nums">
          {matching === 0 ? "0 orders" : `${from}–${to} of ${matching}`}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" aria-disabled={f.page <= 1}>
              {f.page > 1 ? (
                <Link href={ordersHref(f, { page: f.page - 1 })}>Previous</Link>
              ) : (
                <span className="pointer-events-none opacity-50">Previous</span>
              )}
            </Button>
            <span className="tabular-nums text-muted-foreground">
              Page {f.page} of {pages}
            </span>
            <Button asChild variant="outline" size="sm" aria-disabled={f.page >= pages}>
              {f.page < pages ? (
                <Link href={ordersHref(f, { page: f.page + 1 })}>Next</Link>
              ) : (
                <span className="pointer-events-none opacity-50">Next</span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
