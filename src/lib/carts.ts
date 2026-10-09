import "server-only";
import { prisma } from "@/lib/prisma";
import { round2, unitPrice, variantLabel } from "@/lib/pricing";
import { siteUrl } from "@/lib/site-url";
import { bdMobile, getSmsSettings, renderTemplate, sendSms } from "@/lib/sms";
import { getSeoSettings } from "@/lib/seo-settings";
import type { Prisma } from "@/generated/prisma";

export type SnapLine = { productId: string; variantId: string | null; quantity: number };

export const MAX_REMINDERS = 2;
const REMIND_GAP_MS = 24 * 3600_000;
/** A reminder gets the credit for an order placed within this time. */
const RECOVERY_WINDOW_MS = 7 * 24 * 3600_000;

export const DEFAULT_CART_TEMPLATE =
  "{name}, you left {items} in your cart at {shop}. Complete your order: {link}{coupon}";
export const CART_TEMPLATE_VARS = ["{name}", "{items}", "{shop}", "{link}", "{coupon}"];

export function cleanLines(raw: unknown): SnapLine[] {
  if (!Array.isArray(raw)) return [];
  const out = new Map<string, SnapLine>();
  for (const x of raw.slice(0, 50)) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const productId = typeof o.productId === "string" ? o.productId.slice(0, 40) : "";
    const variantId = typeof o.variantId === "string" && o.variantId ? o.variantId.slice(0, 40) : null;
    const quantity = Math.min(20, Math.max(0, Math.floor(Number(o.quantity) || 0)));
    if (!productId || !quantity) continue;
    out.set(`${productId}:${variantId ?? ""}`, { productId, variantId, quantity });
  }
  return [...out.values()];
}

export type CartLineView = {
  productId: string;
  variantId: string | null;
  variantName: string | null;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  stock: number;
  quantity: number;
};

/** The snapshot's lines with today's names, prices and stock (gone / hidden products dropped). */
export async function resolveLines(lines: SnapLine[]): Promise<CartLineView[]> {
  if (!lines.length) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(lines.map((l) => l.productId))] }, published: true },
    include: { variants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: CartLineView[] = [];
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p) continue;
    const v = l.variantId ? p.variants.find((x) => x.id === l.variantId) : null;
    if (l.variantId && !v) continue;
    out.push({
      productId: p.id,
      variantId: v?.id ?? null,
      variantName: v ? variantLabel(v) : null,
      name: p.name,
      slug: p.slug,
      image: p.images[0] ?? null,
      price: unitPrice(p, v),
      stock: v ? v.stock : p.stock,
      quantity: l.quantity,
    });
  }
  return out;
}

/** Saves the signed-in shopper's cart as it is now. */
export async function syncCart(userId: string, raw: unknown) {
  const lines = cleanLines(raw);
  const view = await resolveLines(lines);
  const value = round2(view.reduce((s, l) => s + l.price * l.quantity, 0));
  const itemCount = view.reduce((s, l) => s + l.quantity, 0);
  const items = view.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }));
  await prisma.cartSnapshot.upsert({
    where: { userId },
    create: { userId, items, itemCount, value, updatedAt: new Date() },
    update: { items, itemCount, value, updatedAt: new Date() },
  });
  return { itemCount, value };
}

/** An order was placed: the cart is done; credit a recent reminder. */
export async function markCartOrdered(userId: string, orderId: string) {
  const snap = await prisma.cartSnapshot.findUnique({ where: { userId } });
  if (!snap) return;
  const credit =
    !!snap.remindedAt && !snap.recoveredOrderId && Date.now() - snap.remindedAt.getTime() < RECOVERY_WINDOW_MS;
  await prisma.cartSnapshot.update({
    where: { userId },
    data: {
      items: [],
      itemCount: 0,
      value: 0,
      updatedAt: new Date(),
      // The next cart starts its own reminder count.
      reminderCount: 0,
      ...(credit ? { recoveredOrderId: orderId, recoveredAt: new Date() } : {}),
    },
  });
}

export async function getCartReminderSettings() {
  const row = await prisma.cartReminderSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  return {
    auto: row?.auto ?? false,
    afterHours: row?.afterHours ?? 3,
    couponCode: row?.couponCode ?? "",
    template: row?.template || DEFAULT_CART_TEMPLATE,
  };
}

/** Abandoned = has items, idle for `afterHours`, and no order since. */
export function abandonedWhere(afterHours: number): Prisma.CartSnapshotWhereInput {
  return { itemCount: { gt: 0 }, updatedAt: { lt: new Date(Date.now() - afterHours * 3600_000) } };
}

export type ReminderResult = { id: string; ok: boolean; error?: string };

/**
 * Sends one reminder SMS. Claimed with a conditional update so a double
 * click (or the daily job at the same time) sends once; at most
 * MAX_REMINDERS per cart, 24 h apart. Customers who said no to promotional
 * SMS are skipped.
 */
export async function sendCartReminder(
  snapshotId: string,
  opts: { couponCode?: string; template?: string } = {},
): Promise<ReminderResult> {
  const snap = await prisma.cartSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snap || snap.itemCount <= 0) return { id: snapshotId, ok: false, error: "The cart is empty now" };
  const user = await prisma.user.findUnique({
    where: { id: snap.userId },
    select: { name: true, phone: true, smsOptOut: true, addresses: { orderBy: { createdAt: "desc" }, take: 1, select: { phone: true } } },
  });
  if (!user) return { id: snapshotId, ok: false, error: "Customer not found" };
  if (user.smsOptOut) return { id: snapshotId, ok: false, error: "Customer turned off promotional SMS" };
  const phone = bdMobile(user.phone) ?? bdMobile(user.addresses[0]?.phone);
  if (!phone) return { id: snapshotId, ok: false, error: "No mobile number" };
  const sms = await getSmsSettings();
  if (!sms.enabled || !sms.apiKey) return { id: snapshotId, ok: false, error: "SMS is not set up" };

  const lines = await resolveLines(cleanLines(snap.items));
  if (!lines.length) return { id: snapshotId, ok: false, error: "Nothing in the cart is for sale any more" };

  const claimed = await prisma.cartSnapshot.updateMany({
    where: {
      id: snapshotId,
      reminderCount: { lt: MAX_REMINDERS },
      OR: [{ remindedAt: null }, { remindedAt: { lt: new Date(Date.now() - REMIND_GAP_MS) } }],
    },
    data: {
      remindedAt: new Date(),
      reminderCount: { increment: 1 },
      reminderCoupon: opts.couponCode || null,
      recoveredOrderId: null,
      recoveredAt: null,
    },
  });
  if (claimed.count !== 1) return { id: snapshotId, ok: false, error: "Already reminded in the last 24 hours (or twice)" };

  const shop = (await getSeoSettings().catch(() => null))?.siteName || "Eid Bazar";
  const first = lines[0].name.length > 28 ? `${lines[0].name.slice(0, 27)}…` : lines[0].name;
  const items = lines.length > 1 ? `${first} +${lines.length - 1} more` : first;
  const code = (opts.couponCode ?? "").trim().toUpperCase();
  const link = `${siteUrl()}/cart/restore/${snap.id}${code ? `?coupon=${encodeURIComponent(code)}` : ""}`;
  const message = renderTemplate(opts.template || DEFAULT_CART_TEMPLATE, {
    name: (user.name ?? "").split(" ")[0] || "Hi",
    items,
    shop,
    link,
    coupon: code ? ` Use code ${code} for a discount.` : "",
  });
  const log = await prisma.smsLog.create({
    data: { orderId: null, event: `cart:${snap.id}:${snap.reminderCount + 1}`, phone, message },
  });
  const r = await sendSms(sms.apiKey, phone, message, sms.senderId || undefined);
  await prisma.smsLog.update({
    where: { id: log.id },
    data: r.ok ? { status: "sent", requestId: r.requestId } : { status: "failed", error: r.error.slice(0, 300) },
  });
  if (!r.ok) {
    // Give the attempt back so it can be retried.
    await prisma.cartSnapshot.update({
      where: { id: snap.id },
      data: { remindedAt: snap.remindedAt, reminderCount: snap.reminderCount, reminderCoupon: snap.reminderCoupon },
    });
    return { id: snapshotId, ok: false, error: r.error };
  }
  return { id: snapshotId, ok: true };
}

/** Daily job: remind every abandoned cart that may still get one. */
export async function autoRemindCarts(limit = 200) {
  const s = await getCartReminderSettings();
  if (!s.auto) return { sent: 0, skipped: 0 };
  const due = await prisma.cartSnapshot.findMany({
    where: {
      ...abandonedWhere(s.afterHours),
      reminderCount: { lt: MAX_REMINDERS },
      OR: [{ remindedAt: null }, { remindedAt: { lt: new Date(Date.now() - REMIND_GAP_MS) } }],
      // Not older than a week: an old cart is not worth an SMS.
      updatedAt: { gt: new Date(Date.now() - 7 * 24 * 3600_000), lt: new Date(Date.now() - s.afterHours * 3600_000) },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true },
  });
  let sent = 0;
  for (const d of due) {
    const r = await sendCartReminder(d.id, { couponCode: s.couponCode, template: s.template });
    if (r.ok) sent++;
  }
  return { sent, skipped: due.length - sent };
}
