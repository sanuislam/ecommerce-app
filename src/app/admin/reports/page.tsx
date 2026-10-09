import Link from "next/link";
import { Download } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  byCategory,
  byCoupon,
  byDistrict,
  byPayment,
  bySource,
  courierOutcomes,
  daily,
  parseRange,
  previousRange,
  returnsSummary,
  topProducts,
  totals,
  type Breakdown,
} from "@/lib/reports";
import { SOURCE_LABEL } from "@/lib/admin-orders";
import { RangePicker } from "@/components/admin/range-picker";
import { SalesChart } from "@/components/admin/sales-chart";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ preset?: string; from?: string; to?: string }> };

const PAY_LABEL: Record<string, string> = {
  COD: "Cash on delivery",
  BKASH: "bKash",
  UPAY: "Upay",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  STRIPE: "Card",
};
const pct = (v: number) => `${(v * 100).toFixed(v > 0 && v < 0.1 ? 1 : 0)}%`;

function Change({ now, before, invert = false }: { now: number; before: number; invert?: boolean }) {
  if (!before) return null;
  const d = (now - before) / before;
  if (!Number.isFinite(d) || Math.abs(d) < 0.005) return <span className="text-xs text-muted-foreground">same as before</span>;
  const good = invert ? d < 0 : d > 0;
  return (
    <span className={good ? "text-xs text-emerald-700 dark:text-emerald-400" : "text-xs text-red-700 dark:text-red-400"}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d * 100).toFixed(0)}% vs previous
    </span>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3 sm:p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl" title={value}>
        {value}
      </div>
      {sub ? <div className="mt-0.5">{sub}</div> : null}
    </div>
  );
}

/** A ranked list with a thin share bar under each row (share of sales). */
function Ranked({ title, rows, label }: { title: string; rows: Breakdown[]; label?: (k: string) => string }) {
  const total = rows.reduce((s, r) => s + r.sales, 0) || 1;
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No sales in this period.</p>
      ) : (
        <ul className="mt-3 space-y-2.5 text-sm">
          {rows.slice(0, 8).map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{label ? label(r.key) : r.key}</span>
                <span className="shrink-0 tabular-nums">
                  {formatPrice(r.sales)} <span className="text-xs text-muted-foreground">· {r.orders}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
                  style={{ width: `${Math.max(1, (r.sales / total) * 100)}%` }}
                />
              </div>
            </li>
          ))}
          {rows.length > 8 ? <li className="text-xs text-muted-foreground">and {rows.length - 8} more</li> : null}
        </ul>
      )}
    </section>
  );
}

export default async function ReportsPage({ searchParams }: Props) {
  const range = parseRange(await searchParams);
  const prev = previousRange(range);
  const [t, p, days, pay, src, district, products, categories, couriers, coupons, rets] = await Promise.all([
    totals(range),
    totals(prev),
    daily(range),
    byPayment(range),
    bySource(range),
    byDistrict(range),
    topProducts(range, 20),
    byCategory(range),
    courierOutcomes(range),
    byCoupon(range),
    returnsSummary(range),
  ]);
  const q = range.preset === "custom" ? `from=${range.from}&to=${range.to}` : `preset=${range.preset}`;
  const totalCatRevenue = categories.reduce((s, c) => s + c.revenue, 0) || 1;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {range.from === range.to ? range.from : `${range.from} → ${range.to}`} · Dhaka time · compared with the{" "}
            {range.days} day{range.days === 1 ? "" : "s"} before
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/admin/reports/export?type=daily&${q}`}>
              <Download className="size-4" /> Daily CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/admin/reports/export?type=products&${q}`}>
              <Download className="size-4" /> Products CSV
            </a>
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <RangePicker action="/admin/reports" range={range} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label="Sales" value={formatPrice(t.sales)} sub={<Change now={t.sales} before={p.sales} />} />
        <Tile label="Orders" value={String(t.orders)} sub={<Change now={t.orders} before={p.orders} />} />
        <Tile label="Average order" value={formatPrice(t.aov)} sub={<Change now={t.aov} before={p.aov} />} />
        <Tile
          label="Profit"
          value={formatPrice(t.profit)}
          sub={
            t.units && t.costCoverage < 1 ? (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {pct(1 - t.costCoverage)} of units have no cost price
              </span>
            ) : (
              <Change now={t.profit} before={p.profit} />
            )
          }
        />
        <Tile label="Items sold" value={String(t.units)} sub={<Change now={t.units} before={p.units} />} />
        <Tile
          label="Customers"
          value={String(t.customers)}
          sub={<span className="text-xs text-muted-foreground">{t.newCustomers} new · {Math.max(0, t.customers - t.newCustomers)} returning</span>}
        />
        <Tile
          label="Cancelled"
          value={`${t.cancelled} · ${pct(t.cancelRate)}`}
          sub={<Change now={t.cancelRate} before={p.cancelRate} invert />}
        />
        <Tile
          label="Refunded"
          value={formatPrice(t.refunds)}
          sub={<span className="text-xs text-muted-foreground">{rets.returns} returns · {rets.exchanges} exchanges</span>}
        />
      </div>

      <section className="mt-6 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Sales per day</h2>
          <span className="text-xs text-muted-foreground">
            Net of refunds {formatPrice(t.netSales)} · delivery charges {formatPrice(t.delivery)} · discounts{" "}
            {formatPrice(t.discounts)}
          </span>
        </div>
        <div className="mt-3">
          <SalesChart points={days} />
        </div>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">Show as a table</summary>
          <div className="mt-2 max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Day</th>
                  <th className="py-1 text-right font-medium">Orders</th>
                  <th className="py-1 text-right font-medium">Sales</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day} className="border-t">
                    <td className="py-1">{d.day}</td>
                    <td className="py-1 text-right tabular-nums">{d.orders}</td>
                    <td className="py-1 text-right tabular-nums">{formatPrice(d.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Ranked title="Payment method" rows={pay} label={(k) => PAY_LABEL[k] ?? k} />
        <Ranked title="Where orders came from" rows={src} label={(k) => SOURCE_LABEL[k as keyof typeof SOURCE_LABEL] ?? k} />
        <Ranked title="District" rows={district} />
      </div>

      <section className="mt-6 overflow-x-auto rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Top products</h2>
          <span className="text-xs text-muted-foreground">By sales; profit needs cost prices</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 text-right font-medium">Units</th>
              <th className="p-3 text-right font-medium">Orders</th>
              <th className="p-3 text-right font-medium">Sales</th>
              <th className="p-3 text-right font-medium">Profit</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No sales in this period.
                </td>
              </tr>
            ) : (
              products.map((x) => (
                <tr key={x.productId} className="border-t">
                  <td className="p-3">
                    <Link href={`/admin/products/${x.productId}`} className="font-medium hover:underline">
                      {x.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{x.category}</div>
                  </td>
                  <td className="p-3 text-right tabular-nums">{x.units}</td>
                  <td className="p-3 text-right tabular-nums">{x.orders}</td>
                  <td className="p-3 text-right tabular-nums">{formatPrice(x.revenue)}</td>
                  <td className="p-3 text-right tabular-nums">
                    {x.profit == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        {formatPrice(x.profit)}
                        <div className="text-xs text-muted-foreground">{x.revenue ? pct(x.profit / x.revenue) : ""}</div>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Categories</h2>
          {categories.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {categories.map((c) => (
                  <tr key={c.name} className="border-t first:border-0">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 text-right text-muted-foreground tabular-nums">{c.units} units</td>
                    <td className="py-2 text-right tabular-nums">{formatPrice(c.revenue)}</td>
                    <td className="w-14 py-2 text-right text-xs text-muted-foreground tabular-nums">
                      {pct(c.revenue / totalCatRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Couriers</h2>
          <p className="text-xs text-muted-foreground">Parcels of orders placed in this period</p>
          {couriers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No parcels in this period.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Courier</th>
                  <th className="py-1 text-right font-medium">Parcels</th>
                  <th className="py-1 text-right font-medium">Delivered</th>
                  <th className="py-1 text-right font-medium">Returned</th>
                  <th className="py-1 text-right font-medium">Success</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((c) => (
                  <tr key={c.courier} className="border-t">
                    <td className="py-2 capitalize">{c.courier}</td>
                    <td className="py-2 text-right tabular-nums">{c.parcels}</td>
                    <td className="py-2 text-right tabular-nums">{c.delivered}</td>
                    <td className="py-2 text-right tabular-nums">{c.returned}</td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {c.successRate == null ? "—" : pct(c.successRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-lg border bg-card p-4 lg:col-span-2">
          <h2 className="font-semibold">Coupons used</h2>
          {coupons.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No coupon was used in this period.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Code</th>
                  <th className="py-1 text-right font-medium">Orders</th>
                  <th className="py-1 text-right font-medium">Discount given</th>
                  <th className="py-1 text-right font-medium">Sales</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code} className="border-t">
                    <td className="py-2 font-mono">{c.code}</td>
                    <td className="py-2 text-right tabular-nums">{c.orders}</td>
                    <td className="py-2 text-right tabular-nums">{formatPrice(c.discount)}</td>
                    <td className="py-2 text-right tabular-nums">{formatPrice(c.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
      {t.unpaidOnline > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Not counted: {t.unpaidOnline} online checkout{t.unpaidOnline === 1 ? "" : "s"} that were never paid.
        </p>
      ) : null}
    </div>
  );
}
