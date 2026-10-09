import "server-only";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

/**
 * Customer groups for the customer list and SMS campaigns. Only customer
 * accounts (role USER); the phone is the account's, else the newest
 * address's. Spend counts real orders (not cancelled / unpaid) minus refunds.
 */
export const SEGMENTS = {
  all: { label: "All customers", hint: "Everyone with an account" },
  buyers: { label: "Buyers", hint: "Ordered at least once" },
  repeat: { label: "Repeat buyers", hint: "Two or more orders" },
  new: { label: "New buyers", hint: "First order in the last N days" },
  active: { label: "Recent buyers", hint: "Ordered in the last N days" },
  lapsed: { label: "Haven't ordered lately", hint: "Bought before, nothing in the last N days" },
  never: { label: "Never ordered", hint: "Signed up but never ordered" },
  vip: { label: "Top spenders", hint: "Spent at least ৳X in total" },
} as const;
export type Segment = keyof typeof SEGMENTS;
export const SEGMENT_IDS = Object.keys(SEGMENTS) as Segment[];

export type Audience = {
  segment: Segment;
  days: number; // for new / active / lapsed
  minSpent: number; // for vip
  district: string; // "" = any
  categoryId: string; // "" = any (bought from this category)
  q: string; // name / e-mail / phone search (list only)
};

export function parseAudience(sp: Record<string, unknown>): Audience {
  const str = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) ? String(v[0] ?? "") : "");
  const seg = str(sp.segment);
  const num = (v: unknown, d: number, lo: number, hi: number) => {
    const x = Number.parseInt(str(v) || String(v ?? ""), 10);
    return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d;
  };
  return {
    segment: (SEGMENT_IDS as string[]).includes(seg) ? (seg as Segment) : "all",
    days: num(sp.days, seg === "lapsed" ? 60 : 30, 1, 730),
    minSpent: num(sp.minSpent, 5000, 0, 10_000_000),
    district: str(sp.district).trim().slice(0, 40),
    categoryId: str(sp.categoryId).trim().slice(0, 40),
    q: str(sp.q).trim().slice(0, 100),
  };
}

export function audienceLabel(a: Audience, categoryName?: string) {
  let s: string = SEGMENTS[a.segment].label;
  if (a.segment === "new" || a.segment === "active" || a.segment === "lapsed") s += ` (${a.days} days)`;
  if (a.segment === "vip") s += ` (≥ ৳${a.minSpent.toLocaleString("en-IN")})`;
  if (a.district) s += ` · ${a.district}`;
  if (a.categoryId) s += ` · bought ${categoryName ?? "a category"}`;
  return s;
}

const SALE = Prisma.sql`(o."status" IN ('PAID','SHIPPED','DELIVERED','REFUNDED') OR (o."status" = 'PENDING' AND o."paymentMethod" = 'COD'))`;
const ago = (days: number) => Prisma.sql`((now() AT TIME ZONE 'UTC') - make_interval(days => ${days}))`;

/** One row per customer account with order stats, filtered by the audience. */
function base(a: Audience) {
  const conds: Prisma.Sql[] = [Prisma.sql`u."role" = 'USER'`];
  switch (a.segment) {
    case "buyers":
      conds.push(Prisma.sql`coalesce(s.orders, 0) >= 1`);
      break;
    case "repeat":
      conds.push(Prisma.sql`coalesce(s.orders, 0) >= 2`);
      break;
    case "new":
      conds.push(Prisma.sql`s.first_order >= ${ago(a.days)}`);
      break;
    case "active":
      conds.push(Prisma.sql`s.last_order >= ${ago(a.days)}`);
      break;
    case "lapsed":
      conds.push(Prisma.sql`s.last_order < ${ago(a.days)}`);
      break;
    case "never":
      conds.push(Prisma.sql`s.orders IS NULL`);
      break;
    case "vip":
      conds.push(Prisma.sql`coalesce(s.spent, 0) >= ${a.minSpent}`);
      break;
  }
  if (a.district) conds.push(Prisma.sql`lower(la.state) = lower(${a.district})`);
  if (a.categoryId) {
    conds.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "Order" o JOIN "OrderItem" i ON i."orderId" = o."id" JOIN "Product" p ON p."id" = i."productId"
      WHERE o."userId" = u."id" AND ${SALE} AND p."categoryId" = ${a.categoryId})`);
  }
  if (a.q) {
    const like = `%${a.q}%`;
    const digits = a.q.replace(/\D/g, "");
    conds.push(
      Prisma.sql`(u."name" ILIKE ${like} OR u."email" ILIKE ${like}${
        digits.length >= 4 ? Prisma.sql` OR coalesce(u."phone", la.phone, '') LIKE ${`%${digits.slice(-10)}%`}` : Prisma.empty
      })`,
    );
  }
  return Prisma.sql`
    WITH s AS (
      SELECT o."userId", count(*) AS orders, sum(o."total" - o."refundedAmount") AS spent,
             max(o."createdAt") AS last_order, min(o."createdAt") AS first_order
      FROM "Order" o WHERE ${SALE} GROUP BY o."userId"
    )
    SELECT u."id", u."name", u."email", u."smsOptOut", u."createdAt",
           coalesce(nullif(u."phone", ''), la.phone) AS phone, la.state AS district,
           coalesce(s.orders, 0) AS orders, coalesce(s.spent, 0) AS spent, s.last_order, s.first_order
    FROM "User" u
    LEFT JOIN s ON s."userId" = u."id"
    LEFT JOIN LATERAL (
      SELECT a."phone", a."state" FROM "Address" a WHERE a."userId" = u."id" ORDER BY a."createdAt" DESC LIMIT 1
    ) la ON true
    WHERE ${Prisma.join(conds, " AND ")}`;
}

export type CustomerRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  district: string | null;
  smsOptOut: boolean;
  createdAt: Date;
  orders: number;
  spent: number;
  lastOrder: Date | null;
  firstOrder: Date | null;
};

const toRow = (r: Record<string, unknown>): CustomerRow => ({
  id: String(r.id),
  name: (r.name as string) ?? null,
  email: String(r.email),
  phone: (r.phone as string) ?? null,
  district: (r.district as string) ?? null,
  smsOptOut: !!r.smsOptOut,
  createdAt: r.createdAt as Date,
  orders: Number(r.orders ?? 0),
  spent: Number(r.spent ?? 0),
  lastOrder: (r.last_order as Date) ?? null,
  firstOrder: (r.first_order as Date) ?? null,
});

export const SORTS = {
  spent: Prisma.sql`spent DESC, orders DESC`,
  orders: Prisma.sql`orders DESC, spent DESC`,
  recent: Prisma.sql`last_order DESC NULLS LAST`,
  joined: Prisma.sql`"createdAt" DESC`,
} as const;
export type Sort = keyof typeof SORTS;

export async function listCustomers(a: Audience, opts: { sort: Sort; skip: number; take: number }) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT * FROM (${base(a)}) c ORDER BY ${SORTS[opts.sort]}, c."id" LIMIT ${opts.take} OFFSET ${opts.skip}`);
  return rows.map(toRow);
}

export async function countCustomers(a: Audience) {
  const [r] = await prisma.$queryRaw<{ n: bigint; spent: unknown; reachable: bigint }[]>(Prisma.sql`
    SELECT count(*) AS n, coalesce(sum(spent), 0) AS spent,
           count(*) FILTER (WHERE NOT c."smsOptOut" AND c.phone IS NOT NULL) AS reachable
    FROM (${base(a)}) c`);
  return { total: Number(r?.n ?? 0), spent: Number(r?.spent ?? 0), reachable: Number(r?.reachable ?? 0) };
}

/** Every matching customer (for CSV), newest spend first. Capped. */
export async function allCustomers(a: Audience, cap = 50_000) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT * FROM (${base(a)}) c ORDER BY spent DESC, c."id" LIMIT ${cap}`);
  return rows.map(toRow);
}

/** 01XXXXXXXXX numbers of customers who may get promotional SMS. De-duplicated. */
export async function campaignPhones(a: Audience): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ phone: string | null }[]>(Prisma.sql`
    SELECT c.phone FROM (${base({ ...a, q: "" })}) c WHERE NOT c."smsOptOut" AND c.phone IS NOT NULL`);
  const out = new Set<string>();
  for (const r of rows) {
    const d = (r.phone ?? "").replace(/\D/g, "");
    const local = d.startsWith("880") ? `0${d.slice(3)}` : d.length === 10 && d.startsWith("1") ? `0${d}` : d;
    if (/^01[3-9]\d{8}$/.test(local)) out.add(local);
  }
  return [...out];
}
