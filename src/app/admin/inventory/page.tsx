import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn, formatPrice } from "@/lib/utils";
import { isLow, isOut, stockUnits } from "@/lib/inventory";
import { STOCK_REASONS, type StockReason } from "@/lib/stock-log";
import { variantLabel } from "@/lib/pricing";
import { ListPager, ListSearch, listParams } from "@/components/admin/list-pager";
import { StockTable } from "@/components/admin/stock-table";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PAGE = 100;
const VIEWS = ["low", "out", "all", "history"] as const;
type View = (typeof VIEWS)[number];
const fmt = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function InventoryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { q, page } = listParams(sp);
  const raw = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const view: View = VIEWS.find((v) => v === raw) ?? "low";
  const productFilter = (Array.isArray(sp.product) ? sp.product[0] : sp.product) ?? "";

  const all = await stockUnits();
  const low = all.filter(isLow);
  const out = all.filter(isOut);
  const units = all.reduce((n, u) => n + Math.max(0, u.stock), 0);
  const withCost = all.filter((u) => u.cost != null && u.stock > 0);
  const costValue = withCost.reduce((n, u) => n + u.stock * (u.cost ?? 0), 0);
  const saleValue = all.reduce((n, u) => n + Math.max(0, u.stock) * u.price, 0);

  const tabs: { v: View; label: string; n?: number }[] = [
    { v: "low", label: "Low stock", n: low.length },
    { v: "out", label: "Out of stock", n: out.length },
    { v: "all", label: "All stock", n: all.length },
    { v: "history", label: "History" },
  ];
  const href = (v: View) => `/admin/inventory?view=${v}`;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Units in stock" value={units.toLocaleString("en-IN")} />
        <Stat label="Stock value at cost" value={formatPrice(costValue)} hint={withCost.length < all.filter((u) => u.stock > 0).length ? "Some products have no cost price" : undefined} />
        <Stat label="Stock value at price" value={formatPrice(saleValue)} />
        <Stat label="Low / out of stock" value={`${low.length} / ${out.length}`} tone={out.length ? "warn" : undefined} />
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.v}
            href={href(t.v)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm",
              t.v === view ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.n !== undefined && <span className="text-xs tabular-nums opacity-70">{t.n}</span>}
          </Link>
        ))}
      </nav>

      {view === "history" ? (
        <History page={page} productId={productFilter} />
      ) : (
        <>
          {view === "all" && (
            <div className="mt-4">
              <ListSearch action="/admin/inventory?view=all" q={q} placeholder="Product name or SKU" />
            </div>
          )}
          {(() => {
            const list = (view === "low" ? low : view === "out" ? out : all).filter(
              (u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || (u.sku ?? "").toLowerCase().includes(q.toLowerCase()),
            );
            const pageRows = list.slice((page - 1) * PAGE, page * PAGE);
            return (
              <>
                <StockTable
                  rows={pageRows}
                  empty={view === "low" ? "Nothing is running low." : view === "out" ? "Nothing is out of stock." : "No products."}
                />
                <ListPager action={href(view)} q={q} page={page} pageSize={PAGE} total={list.length} noun="items" />
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" }) {
  return (
    <div className={cn("rounded-lg border bg-card p-3 sm:p-4", tone === "warn" && "border-amber-500/40")}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

async function History({ page, productId }: { page: number; productId: string }) {
  const where = productId ? { productId } : {};
  const [moves, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 100,
      take: 100,
      include: { product: { select: { name: true } } },
    }),
    prisma.stockMovement.count({ where }),
  ]);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: moves.map((m) => m.variantId).filter((v): v is string => !!v) } },
    select: { id: true, size: true, color: true },
  });
  const userIds = [...new Set(moves.map((m) => m.userId).filter((u): u is string => !!u))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
  const vName = (id: string | null) => {
    const v = variants.find((x) => x.id === id);
    return v ? variantLabel(v) : null;
  };
  return (
    <>
      {productId && (
        <p className="mt-4 text-sm">
          Showing one product ·{" "}
          <Link href="/admin/inventory?view=history" className="underline">
            show all
          </Link>
        </p>
      )}
      {moves.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No stock changes yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">When</th>
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 text-right font-medium">Change</th>
                <th className="p-3 font-medium">Why</th>
                <th className="p-3 font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {moves.map((m) => {
                const u = users.find((x) => x.id === m.userId);
                return (
                  <tr key={m.id}>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{fmt(m.createdAt)}</td>
                    <td className="p-3">
                      <Link href={`/admin/inventory?view=history&product=${m.productId}`} className="hover:underline">
                        {m.product.name}
                      </Link>
                      {vName(m.variantId) && <span className="text-muted-foreground"> · {vName(m.variantId)}</span>}
                    </td>
                    <td className={cn("p-3 text-right font-medium tabular-nums", m.change > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                      {m.change > 0 ? `+${m.change}` : m.change}
                    </td>
                    <td className="p-3">
                      {STOCK_REASONS[m.reason as StockReason] ?? m.reason}
                      {m.orderId && (
                        <Link href={`/admin/orders/${m.orderId}`} className="ml-1 text-xs text-muted-foreground underline">
                          Order
                        </Link>
                      )}
                      {m.note && <div className="text-xs text-muted-foreground">{m.note}</div>}
                    </td>
                    <td className="p-3 text-muted-foreground">{u ? u.name || u.email : m.userId ? "Admin" : "Customer"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ListPager action={`/admin/inventory?view=history${productId ? `&product=${productId}` : ""}`} q="" page={page} pageSize={100} total={total} noun="changes" />
    </>
  );
}
