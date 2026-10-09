import "server-only";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

/**
 * Sales reports. Days are Dhaka days (UTC+6, no DST). An order "counts" as
 * a sale when it is a real order: paid / shipped / delivered / refunded, or
 * a cash-on-delivery order still waiting. Unpaid online checkouts and
 * cancelled orders are not sales (cancellations are reported separately).
 */
export const TZ = "Asia/Dhaka";
const OFFSET = "+06:00";

export const PRESETS = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  month: "This month",
  lastmonth: "Last month",
  year: "This year",
} as const;
export type Preset = keyof typeof PRESETS;

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const isYmd = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export type Range = { from: string; to: string; preset: Preset | "custom"; days: number; start: Date; end: Date };

/** A Dhaka-day range from ?preset= or ?from=&to= (both inclusive). Max 366 days. */
export function parseRange(sp: { preset?: string; from?: string; to?: string }): Range {
  const today = ymd(new Date());
  let from: string;
  let to = today;
  let preset: Preset | "custom" = "30d";
  if (isYmd(sp.from) && isYmd(sp.to) && sp.from <= sp.to) {
    from = sp.from;
    to = sp.to > today ? today : sp.to;
    preset = "custom";
  } else {
    preset = sp.preset && sp.preset in PRESETS ? (sp.preset as Preset) : "30d";
    const [y, m] = today.split("-").map(Number);
    switch (preset) {
      case "today":
        from = today;
        break;
      case "7d":
        from = addDays(today, -6);
        break;
      case "90d":
        from = addDays(today, -89);
        break;
      case "month":
        from = `${today.slice(0, 7)}-01`;
        break;
      case "lastmonth": {
        const first = new Date(Date.UTC(y, m - 2, 1));
        from = first.toISOString().slice(0, 10);
        to = addDays(`${today.slice(0, 7)}-01`, -1);
        break;
      }
      case "year":
        from = `${y}-01-01`;
        break;
      default:
        from = addDays(today, -29);
    }
  }
  if (from > to) from = to;
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 365) from = addDays(to, -365);
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  return {
    from,
    to,
    preset,
    days,
    start: new Date(`${from}T00:00:00${OFFSET}`),
    end: new Date(`${addDays(to, 1)}T00:00:00${OFFSET}`),
  };
}

/** The same length of time just before the range (for "vs previous"). */
export function previousRange(r: Range): Range {
  const to = addDays(r.from, -1);
  const from = addDays(to, -(r.days - 1));
  return parseRange({ from, to });
}

const SALE = Prisma.sql`(o."status" IN ('PAID','SHIPPED','DELIVERED','REFUNDED') OR (o."status" = 'PENDING' AND o."paymentMethod" = 'COD'))`;
// Columns are UTC "timestamp without time zone": compare against UTC values so
// the database session's time zone never matters.
const utc = (d: Date) => Prisma.sql`(${d.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
const inRange = (r: Range) => Prisma.sql`o."createdAt" >= ${utc(r.start)} AND o."createdAt" < ${utc(r.end)}`;
const n = (v: unknown) => Number(v ?? 0);
/** An online checkout that was never paid (abandoned at the payment page). */
const NEVER_PAID = Prisma.sql`(o."paymentMethod" <> 'COD' AND o."source" = 'web' AND NOT EXISTS (
  SELECT 1 FROM "OrderEvent" e WHERE e."orderId" = o."id" AND e."status" = 'PAID'))`;

export type Totals = {
  orders: number;
  sales: number; // order totals incl. delivery, before refunds
  refunds: number;
  netSales: number;
  productSales: number; // subtotal − discount (no delivery)
  discounts: number;
  delivery: number;
  units: number;
  aov: number;
  cancelled: number;
  cancelRate: number; // cancelled ÷ (orders + cancelled)
  unpaidOnline: number; // online checkouts never paid (open or expired)
  customers: number;
  newCustomers: number;
  cogs: number; // units with a cost price
  costCoverage: number;
  courierCharges: number;
  profit: number; // productSales − refunds − cogs − courier charges
};

export async function totals(r: Range): Promise<Totals> {
  const [row] = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT
      count(*) FILTER (WHERE ${SALE}) AS orders,
      coalesce(sum(o."total") FILTER (WHERE ${SALE}), 0) AS sales,
      coalesce(sum(o."refundedAmount") FILTER (WHERE ${SALE}), 0) AS refunds,
      coalesce(sum(o."subtotal" - o."discount") FILTER (WHERE ${SALE}), 0) AS product_sales,
      coalesce(sum(o."discount") FILTER (WHERE ${SALE}), 0) AS discounts,
      coalesce(sum(o."shipping") FILTER (WHERE ${SALE}), 0) AS delivery,
      coalesce(sum(o."courierCharge") FILTER (WHERE ${SALE}), 0) AS courier,
      count(*) FILTER (WHERE o."status" = 'CANCELLED' AND NOT ${NEVER_PAID}) AS cancelled,
      count(*) FILTER (WHERE (o."status" = 'PENDING' AND o."paymentMethod" <> 'COD')
                          OR (o."status" = 'CANCELLED' AND ${NEVER_PAID})) AS unpaid,
      count(DISTINCT o."userId") FILTER (WHERE ${SALE}) AS customers
    FROM "Order" o WHERE ${inRange(r)}`);
  const [items] = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT coalesce(sum(i."quantity"), 0) AS units,
           coalesce(sum(i."quantity") FILTER (WHERE i."costPrice" IS NOT NULL), 0) AS costed,
           coalesce(sum(i."quantity" * i."costPrice"), 0) AS cogs
    FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId"
    WHERE ${inRange(r)} AND ${SALE}`);
  // A customer is new when their first real order is in the range.
  const [fresh] = await prisma.$queryRaw<{ c: bigint }[]>(Prisma.sql`
    SELECT count(*) AS c FROM (
      SELECT o."userId", min(o."createdAt") AS first FROM "Order" o WHERE ${SALE} GROUP BY o."userId"
    ) f WHERE f.first >= ${utc(r.start)} AND f.first < ${utc(r.end)}`);
  const orders = n(row.orders);
  const sales = n(row.sales);
  const refunds = n(row.refunds);
  const productSales = n(row.product_sales);
  const cancelled = n(row.cancelled);
  const units = n(items.units);
  const cogs = n(items.cogs);
  const courierCharges = n(row.courier);
  return {
    orders,
    sales,
    refunds,
    netSales: sales - refunds,
    productSales,
    discounts: n(row.discounts),
    delivery: n(row.delivery),
    units,
    aov: orders ? sales / orders : 0,
    cancelled,
    cancelRate: orders + cancelled ? cancelled / (orders + cancelled) : 0,
    unpaidOnline: n(row.unpaid),
    customers: n(row.customers),
    newCustomers: Number(fresh?.c ?? 0),
    cogs,
    costCoverage: units ? n(items.costed) / units : 0,
    courierCharges,
    profit: productSales - refunds - cogs - courierCharges,
  };
}

export type DayPoint = { day: string; orders: number; sales: number };

/** One point per Dhaka day in the range (zero days included). */
export async function daily(r: Range): Promise<DayPoint[]> {
  const rows = await prisma.$queryRaw<{ day: string; orders: bigint; sales: unknown }[]>(Prisma.sql`
    SELECT to_char((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS day,
           count(*) AS orders, coalesce(sum(o."total"), 0) AS sales
    FROM "Order" o WHERE ${inRange(r)} AND ${SALE}
    GROUP BY 1`);
  const by = new Map(rows.map((x) => [x.day, x]));
  const out: DayPoint[] = [];
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) {
    const x = by.get(d);
    out.push({ day: d, orders: Number(x?.orders ?? 0), sales: n(x?.sales) });
  }
  return out;
}

export type Breakdown = { key: string; orders: number; sales: number };

async function breakdown(r: Range, expr: Prisma.Sql, join = Prisma.empty): Promise<Breakdown[]> {
  const rows = await prisma.$queryRaw<{ key: string | null; orders: bigint; sales: unknown }[]>(Prisma.sql`
    SELECT ${expr} AS key, count(*) AS orders, coalesce(sum(o."total"), 0) AS sales
    FROM "Order" o ${join} WHERE ${inRange(r)} AND ${SALE}
    GROUP BY 1 ORDER BY 3 DESC`);
  return rows.map((x) => ({ key: x.key ?? "—", orders: Number(x.orders), sales: n(x.sales) }));
}

export const byPayment = (r: Range) => breakdown(r, Prisma.sql`o."paymentMethod"::text`);
export const bySource = (r: Range) => breakdown(r, Prisma.sql`o."source"`);
export const byDistrict = (r: Range) =>
  breakdown(r, Prisma.sql`coalesce(nullif(a."state", ''), 'Unknown')`, Prisma.sql`LEFT JOIN "Address" a ON a."id" = o."addressId"`);
export const byCoupon = (r: Range) =>
  prisma.$queryRaw<{ code: string; orders: bigint; discount: unknown; sales: unknown }[]>(Prisma.sql`
    SELECT o."couponCode" AS code, count(*) AS orders, coalesce(sum(o."discount"), 0) AS discount, coalesce(sum(o."total"), 0) AS sales
    FROM "Order" o WHERE ${inRange(r)} AND ${SALE} AND o."couponCode" IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC LIMIT 20`).then((rows) =>
    rows.map((x) => ({ code: x.code, orders: Number(x.orders), discount: n(x.discount), sales: n(x.sales) })),
  );

export type ProductRow = {
  productId: string;
  name: string;
  category: string;
  units: number;
  revenue: number;
  cost: number | null; // null when no unit has a cost price
  profit: number | null;
  orders: number;
};

export async function topProducts(r: Range, limit = 50): Promise<ProductRow[]> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT i."productId" AS id, max(i."name") AS name, coalesce(max(c."name"), '—') AS category,
           sum(i."quantity") AS units, sum(i."quantity" * i."price") AS revenue,
           sum(i."quantity" * i."costPrice") AS cost,
           bool_and(i."costPrice" IS NOT NULL) AS all_costed,
           count(DISTINCT i."orderId") AS orders
    FROM "OrderItem" i
    JOIN "Order" o ON o."id" = i."orderId"
    LEFT JOIN "Product" p ON p."id" = i."productId"
    LEFT JOIN "Category" c ON c."id" = p."categoryId"
    WHERE ${inRange(r)} AND ${SALE}
    GROUP BY i."productId" ORDER BY revenue DESC LIMIT ${limit}`);
  return rows.map((x) => {
    const cost = x.cost == null ? null : n(x.cost);
    const revenue = n(x.revenue);
    return {
      productId: String(x.id),
      name: String(x.name),
      category: String(x.category),
      units: n(x.units),
      revenue,
      cost,
      profit: cost == null || !x.all_costed ? null : revenue - cost,
      orders: n(x.orders),
    };
  });
}

export async function byCategory(r: Range) {
  const rows = await prisma.$queryRaw<{ name: string; units: unknown; revenue: unknown }[]>(Prisma.sql`
    SELECT coalesce(c."name", 'Uncategorised') AS name, sum(i."quantity") AS units, sum(i."quantity" * i."price") AS revenue
    FROM "OrderItem" i
    JOIN "Order" o ON o."id" = i."orderId"
    LEFT JOIN "Product" p ON p."id" = i."productId"
    LEFT JOIN "Category" c ON c."id" = p."categoryId"
    WHERE ${inRange(r)} AND ${SALE}
    GROUP BY 1 ORDER BY 3 DESC`);
  return rows.map((x) => ({ name: x.name, units: n(x.units), revenue: n(x.revenue) }));
}

/** Parcels of orders placed in the range that went to a courier: delivered vs came back. */
export async function courierOutcomes(r: Range) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT coalesce(nullif(o."courier", ''), 'Other') AS courier,
           count(*) AS parcels,
           count(*) FILTER (WHERE o."status" = 'DELIVERED') AS delivered,
           count(*) FILTER (WHERE o."status" IN ('CANCELLED','REFUNDED')
                              OR lower(coalesce(o."courierStatus", '')) ~ 'return') AS returned,
           count(*) FILTER (WHERE o."status" = 'SHIPPED' AND NOT lower(coalesce(o."courierStatus", '')) ~ 'return') AS on_way,
           coalesce(sum(o."courierCharge"), 0) AS charges
    FROM "Order" o
    WHERE ${inRange(r)} AND (o."courierConsignmentId" IS NOT NULL OR o."status" IN ('SHIPPED','DELIVERED'))
    GROUP BY 1 ORDER BY 2 DESC`);
  return rows.map((x) => {
    const delivered = n(x.delivered);
    const returned = n(x.returned);
    return {
      courier: String(x.courier),
      parcels: n(x.parcels),
      delivered,
      returned,
      onWay: n(x.on_way),
      charges: n(x.charges),
      successRate: delivered + returned ? delivered / (delivered + returned) : null,
    };
  });
}

export async function returnsSummary(r: Range) {
  const rows = await prisma.$queryRaw<{ type: string; c: bigint; refunded: unknown }[]>(Prisma.sql`
    SELECT rr."type"::text AS type, count(*) AS c, coalesce(sum(rr."refundAmount"), 0) AS refunded
    FROM "ReturnRequest" rr WHERE rr."createdAt" >= ${utc(r.start)} AND rr."createdAt" < ${utc(r.end)} AND rr."status" <> 'REJECTED'
    GROUP BY 1`);
  const get = (t: string) => rows.find((x) => x.type === t);
  return {
    returns: Number(get("RETURN")?.c ?? 0),
    exchanges: Number(get("EXCHANGE")?.c ?? 0),
    refunded: n(get("RETURN")?.refunded) + n(get("EXCHANGE")?.refunded),
  };
}
