/**
 * Pricing rules shared by the storefront (display) and the checkout API
 * (what is actually charged). Keep every price calculation here so the two
 * can never drift apart.
 *
 * Prices are VAT-inclusive, so no tax is added on top.
 */

type Numeric = number | string | { toString(): string };

const num = (v: Numeric | null | undefined) => (v == null ? null : Number(v));

export const round2 = (n: number) => Math.round(n * 100) / 100;

export type PricedProduct = {
  price: Numeric;
  compareAt?: Numeric | null;
  flashDeal?: boolean;
  flashDealDiscount?: number | null;
};

export type PricedVariant = { price?: Numeric | null } | null | undefined;

/** Base price before a flash-deal discount (variant price overrides product). */
export function basePrice(product: PricedProduct, variant?: PricedVariant) {
  return num(variant?.price) ?? Number(product.price);
}

export function flashDiscountPercent(product: PricedProduct) {
  const d = product.flashDeal ? product.flashDealDiscount ?? 0 : 0;
  return d >= 1 && d <= 99 ? d : 0;
}

/** The unit price the customer pays. */
export function unitPrice(product: PricedProduct, variant?: PricedVariant) {
  const base = basePrice(product, variant);
  const pct = flashDiscountPercent(product);
  return pct ? round2(base * (1 - pct / 100)) : base;
}

/** Strike-through price to show next to the unit price, if any. */
export function strikePrice(product: PricedProduct, variant?: PricedVariant) {
  const current = unitPrice(product, variant);
  const base = basePrice(product, variant);
  const compareAt = num(product.compareAt);
  const candidates = [base, compareAt ?? 0].filter((v) => v > current);
  return candidates.length ? Math.max(...candidates) : null;
}

export type ShippingConfig = {
  insideDhaka: number;
  outsideDhaka: number;
  /** 0 disables free shipping. */
  freeThreshold: number;
};

export const DEFAULT_SHIPPING: ShippingConfig = {
  insideDhaka: 80,
  outsideDhaka: 120,
  freeThreshold: 1000,
};

export function shippingFee(
  subtotal: number,
  zone: "DHAKA" | "OUTSIDE_DHAKA",
  cfg: ShippingConfig = DEFAULT_SHIPPING,
) {
  if (subtotal <= 0) return 0;
  if (cfg.freeThreshold > 0 && subtotal >= cfg.freeThreshold) return 0;
  return zone === "DHAKA" ? cfg.insideDhaka : cfg.outsideDhaka;
}

export type CouponLike = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: Numeric;
  minSubtotal: Numeric;
  maxDiscount?: Numeric | null;
  usageLimit?: number | null;
  usedCount: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  active: boolean;
};

export type CouponCheck =
  | { ok: true; discount: number }
  | { ok: false; reason: string };

/** Validates a coupon against a subtotal (per-user limits are checked separately). */
export function evaluateCoupon(
  coupon: CouponLike,
  subtotal: number,
  now = new Date(),
): CouponCheck {
  if (!coupon.active) return { ok: false, reason: "This coupon is not active" };
  if (coupon.startsAt && coupon.startsAt > now)
    return { ok: false, reason: "This coupon is not valid yet" };
  if (coupon.endsAt && coupon.endsAt < now)
    return { ok: false, reason: "This coupon has expired" };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    return { ok: false, reason: "This coupon has been fully used" };
  const min = Number(coupon.minSubtotal);
  if (subtotal < min)
    return {
      ok: false,
      reason: `Spend at least ৳${min.toLocaleString("en-IN")} to use this coupon`,
    };

  const value = Number(coupon.value);
  let discount = coupon.type === "PERCENT" ? (subtotal * value) / 100 : value;
  const cap = num(coupon.maxDiscount);
  if (cap != null && cap > 0) discount = Math.min(discount, cap);
  discount = round2(Math.min(discount, subtotal));
  return { ok: true, discount };
}

export function variantLabel(v: { size?: string | null; color?: string | null }) {
  return [v.size, v.color].filter(Boolean).join(" / ");
}
