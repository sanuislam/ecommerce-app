import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn, formatPrice } from "@/lib/utils";
import { RETURN_STATUS_LABEL, returnLabel } from "@/lib/returns";
import { ReturnStatus } from "@/generated/prisma";
import { ListPager, listParams } from "@/components/admin/list-pager";
import { orderNo } from "@/lib/order-number";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PAGE = 50;
const STATUSES = Object.values(ReturnStatus);
const fmt = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function ReturnsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { page } = listParams(sp);
  const raw = (Array.isArray(sp.status) ? sp.status[0] : sp.status)?.toUpperCase();
  const status = STATUSES.find((s) => s === raw) ?? null;
  const where = status ? { status } : {};
  const [rows, total, counts] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: {
        order: { include: { address: { select: { fullName: true, phone: true } } } },
        items: { include: { orderItem: { select: { name: true } } } },
      },
    }),
    prisma.returnRequest.count({ where }),
    prisma.returnRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: ReturnStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const tabs = [{ s: null as ReturnStatus | null, label: "All", n: counts.reduce((a, c) => a + c._count._all, 0) }, ...STATUSES.map((s) => ({ s, label: RETURN_STATUS_LABEL[s], n: countOf(s) }))];

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Returns and exchanges</h1>
      <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.s ? `/admin/returns?status=${t.s}` : "/admin/returns"}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap",
              t.s === status ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label} <span className="text-xs tabular-nums opacity-70">{t.n}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No return requests{status ? " with this status" : " yet"}.
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border bg-card">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/returns/${r.id}`} className="grid gap-1 p-3 hover:bg-muted/40 sm:grid-cols-[110px_1fr_140px_120px] sm:items-center sm:gap-4">
                <span className="font-medium">
                  {returnLabel(r)}
                  <span className="block text-xs font-normal text-muted-foreground">{r.type === "EXCHANGE" ? "Exchange" : "Return"}</span>
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block truncate">
                    {r.order.address?.fullName ?? "Customer"} · order {orderNo(r.order)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.reason} — {r.items.map((i) => `${i.orderItem.name} ×${i.quantity}`).join(", ")}
                  </span>
                </span>
                <span className="text-sm">
                  {RETURN_STATUS_LABEL[r.status]}
                  {r.refundAmount && <span className="block text-xs text-muted-foreground">Refunded {formatPrice(Number(r.refundAmount))}</span>}
                </span>
                <span className="text-xs text-muted-foreground sm:text-right">{fmt(r.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ListPager action={status ? `/admin/returns?status=${status}` : "/admin/returns"} q="" page={page} pageSize={PAGE} total={total} noun="requests" />
    </div>
  );
}
