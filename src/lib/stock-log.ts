import "server-only";
import type { Prisma } from "@/generated/prisma";
import { scheduleBackInStock } from "@/lib/stock-alerts";

type Tx = Prisma.TransactionClient;

export const STOCK_REASONS = {
  sale: "Sold",
  cancel: "Order cancelled",
  refund: "Refunded before shipping",
  order_edit: "Order edited",
  return: "Returned",
  exchange: "Exchange sent",
  edit: "Product edited",
  initial: "Opening stock",
  adjust: "Adjusted",
  import: "CSV import",
} as const;
export type StockReason = keyof typeof STOCK_REASONS;

export type StockEntry = {
  productId: string;
  variantId?: string | null;
  change: number;
  reason: StockReason;
  orderId?: string | null;
  note?: string | null;
  userId?: string | null;
};

/** Writes stock movements (zero changes are skipped). Run inside the same transaction. */
export async function logStock(tx: Tx, entries: StockEntry[]) {
  const rows = entries
    .filter((e) => e.change !== 0)
    .map((e) => ({
      productId: e.productId,
      variantId: e.variantId ?? null,
      change: e.change,
      reason: e.reason,
      orderId: e.orderId ?? null,
      note: e.note?.slice(0, 200) ?? null,
      userId: e.userId ?? null,
    }));
  if (rows.length) await tx.stockMovement.createMany({ data: rows });
  // Stock came back: text the people who asked to be told.
  scheduleBackInStock(rows.filter((r) => r.change > 0).map((r) => r.productId));
}

export type StockSnapshot = Map<string, { productId: string; variantId: string | null; stock: number }>;

/** Stock of products (those without options) and of every option, keyed by unit. */
export async function stockSnapshot(tx: Tx, productIds: string[]): Promise<StockSnapshot> {
  const snap: StockSnapshot = new Map();
  if (!productIds.length) return snap;
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, stock: true, variants: { select: { id: true, stock: true } } },
  });
  for (const p of products) {
    if (p.variants.length) {
      for (const v of p.variants) snap.set(`v:${v.id}`, { productId: p.id, variantId: v.id, stock: v.stock });
    } else {
      snap.set(`p:${p.id}`, { productId: p.id, variantId: null, stock: p.stock });
    }
  }
  return snap;
}

/** Logs what changed between a snapshot and now (for edits, imports, receipts). */
export async function logStockDiff(
  tx: Tx,
  before: StockSnapshot,
  productIds: string[],
  base: Omit<StockEntry, "productId" | "variantId" | "change">,
) {
  const after = await stockSnapshot(tx, productIds);
  const entries: StockEntry[] = [];
  for (const [k, a] of after) {
    const b = before.get(k)?.stock ?? 0;
    if (a.stock !== b) entries.push({ ...base, productId: a.productId, variantId: a.variantId, change: a.stock - b });
  }
  // Options deleted with stock: their units are gone.
  for (const [k, b] of before) {
    if (!after.has(k) && b.stock !== 0 && k.startsWith("v:")) {
      entries.push({ ...base, productId: b.productId, variantId: b.variantId, change: -b.stock, note: "Option removed" });
    }
  }
  await logStock(tx, entries);
}
