import "server-only";
import { prisma } from "@/lib/prisma";
import { getShippingConfig } from "@/lib/site-settings";
import {
  evaluateCoupon,
  round2,
  shippingFee,
  unitPrice,
  variantLabel,
} from "@/lib/pricing";

export { getShippingConfig };
import { zoneForDistrict, type ShippingZone } from "@/lib/districts";

export const MAX_LINES = 50;
export const MAX_QTY_PER_LINE = 20;

export type QuoteItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type QuoteLine = {
  productId: string;
  variantId: string | null;
  variantName: string | null;
  name: string;
  slug: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: number;
};

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  zone: ShippingZone;
  coupon: { id: string; code: string } | null;
  couponError: string | null;
  /** Problems that block checkout (missing product, not enough stock...). */
  errors: string[];
};

/**
 * Prices a cart entirely from the database. The browser only ever sends
 * product ids, variant ids and quantities — never prices.
 */
export async function buildQuote(opts: {
  items: QuoteItemInput[];
  district: string;
  couponCode?: string | null;
  userId?: string | null;
}): Promise<Quote> {
  const errors: string[] = [];

  // Merge duplicate lines so stock checks see the real total per variant.
  const merged = new Map<string, QuoteItemInput>();
  for (const i of opts.items) {
    const key = `${i.productId}:${i.variantId ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, {
      ...i,
      variantId: i.variantId ?? null,
      quantity: (prev?.quantity ?? 0) + i.quantity,
    });
  }
  const items = [...merged.values()];

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, published: true },
    include: { variants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: QuoteLine[] = [];
  for (const i of items) {
    const p = byId.get(i.productId);
    if (!p) {
      errors.push("One or more products are no longer available");
      continue;
    }
    let variant = null;
    if (p.variants.length > 0) {
      variant = p.variants.find((v) => v.id === i.variantId) ?? null;
      if (!variant) {
        errors.push(`Please choose an option for "${p.name}"`);
        continue;
      }
    } else if (i.variantId) {
      errors.push(`"${p.name}" has changed — please add it to the cart again`);
      continue;
    }
    const available = variant ? variant.stock : p.stock;
    const name = variant ? variantLabel(variant) : null;
    if (available < i.quantity) {
      errors.push(
        available > 0
          ? `Only ${available} of "${p.name}${name ? ` (${name})` : ""}" left in stock`
          : `"${p.name}${name ? ` (${name})` : ""}" is out of stock`,
      );
    }
    const price = unitPrice(p, variant);
    lines.push({
      productId: p.id,
      variantId: variant?.id ?? null,
      variantName: name,
      name: p.name,
      slug: p.slug,
      image: p.images[0] ?? null,
      unitPrice: price,
      quantity: i.quantity,
      lineTotal: round2(price * i.quantity),
      available,
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));

  let discount = 0;
  let coupon: Quote["coupon"] = null;
  let couponError: string | null = null;
  const code = opts.couponCode?.trim().toUpperCase();
  if (code) {
    const row = await prisma.coupon.findUnique({ where: { code } });
    if (!row) {
      couponError = "Coupon code not found";
    } else {
      const check = evaluateCoupon(row, subtotal);
      if (!check.ok) {
        couponError = check.reason;
      } else if (row.perUserLimit != null && opts.userId) {
        const used = await prisma.order.count({
          where: {
            userId: opts.userId,
            couponId: row.id,
            status: { notIn: ["CANCELLED"] },
          },
        });
        if (used >= row.perUserLimit) {
          couponError = "You have already used this coupon";
        }
      }
      if (!couponError && check.ok) {
        discount = check.discount;
        coupon = { id: row.id, code: row.code };
      }
    }
  }

  const zone = zoneForDistrict(opts.district);
  const shipping = shippingFee(subtotal, zone, await getShippingConfig());
  const total = round2(Math.max(0, subtotal - discount) + shipping);

  return {
    lines,
    subtotal,
    discount,
    shipping,
    total,
    zone,
    coupon,
    couponError,
    errors: [...new Set(errors)],
  };
}
