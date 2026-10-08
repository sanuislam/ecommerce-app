import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, PaymentMethod, Prisma } from "@/generated/prisma";

type Tx = Prisma.TransactionClient;

/** Which status changes an admin may make from each status. */
export function allowedTransitions(
  from: OrderStatus,
  method: PaymentMethod,
): OrderStatus[] {
  switch (from) {
    case "PENDING":
      // Cash-on-delivery orders ship before they are paid.
      return method === "COD"
        ? ["SHIPPED", "PAID", "CANCELLED"]
        : ["PAID", "CANCELLED"];
    case "PAID":
      return ["SHIPPED", "CANCELLED", "REFUNDED"];
    case "SHIPPED":
      return ["DELIVERED", "CANCELLED"];
    case "DELIVERED":
      return ["REFUNDED"];
    default:
      return [];
  }
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Order placed",
  PAID: "Payment confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/**
 * Puts an order's items back into stock. For products with options the
 * product total is recomputed from the options, so an option deleted (or
 * added) since the order was placed can't leave the two out of sync.
 */
export async function restockOrder(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });
  const touched = new Set<string>();
  for (const i of items) {
    if (i.variantId) {
      await tx.productVariant.updateMany({
        where: { id: i.variantId },
        data: { stock: { increment: i.quantity } },
      });
    }
    touched.add(i.productId);
    const hasVariants = await tx.productVariant.count({ where: { productId: i.productId } });
    if (!hasVariants) {
      await tx.product.update({
        where: { id: i.productId },
        data: { stock: { increment: i.quantity } },
      });
    }
  }
  for (const productId of touched) {
    const agg = await tx.productVariant.aggregate({
      where: { productId },
      _sum: { stock: true },
      _count: true,
    });
    if (agg._count > 0) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: agg._sum.stock ?? 0 },
      });
    }
  }
}

/** Frees coupon usage taken by an order that did not go through. */
async function releaseCoupon(tx: Tx, couponId: string | null) {
  if (!couponId) return;
  await tx.coupon.updateMany({
    where: { id: couponId, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } },
  });
}

/**
 * Moves an order from one status to another exactly once. The update is
 * guarded by the expected current status, so concurrent callers (double
 * callbacks, two admins) cannot apply side effects twice.
 * Returns false if the order was no longer in `from`.
 */
export async function transitionOrder(opts: {
  orderId: string;
  from: OrderStatus | OrderStatus[];
  to: OrderStatus;
  note?: string;
  data?: Prisma.OrderUpdateManyMutationInput;
}): Promise<boolean> {
  const from = Array.isArray(opts.from) ? opts.from : [opts.from];
  return prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: opts.orderId },
      select: { status: true, couponId: true },
    });
    if (!current || !from.includes(current.status)) return false;

    const res = await tx.order.updateMany({
      where: { id: opts.orderId, status: current.status },
      data: { ...opts.data, status: opts.to },
    });
    if (res.count !== 1) return false;

    if (opts.to === "CANCELLED") {
      await restockOrder(tx, opts.orderId);
      await releaseCoupon(tx, current.couponId);
    } else if (opts.to === "REFUNDED" && current.status === "PAID") {
      // Refunded before it shipped: the goods never left the shop.
      await restockOrder(tx, opts.orderId);
    }
    await tx.orderEvent.create({
      data: { orderId: opts.orderId, status: opts.to, note: opts.note ?? null },
    });
    return true;
  });
}

/**
 * Cancels unpaid online-payment orders (bKash / Upay gateway, Stripe) that
 * were abandoned, returning their stock. Manual MFS and COD orders wait for
 * an admin instead. Upay orders are first checked with Upay: a payment that
 * did go through marks the order paid instead.
 */
export async function expireStaleOrders(olderThanMinutes = 60) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const stale = await prisma.order.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
      OR: [
        { paymentMethod: "STRIPE" },
        { paymentMethod: "BKASH", bkashPaymentId: { not: null } },
        { paymentMethod: "UPAY", upayTxnId: { not: null } },
      ],
    },
    select: { id: true, paymentMethod: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  // Imported here: upay-settle itself uses transitionOrder from this file.
  const { settleUpayOrder } = await import("@/lib/upay-settle");
  const dayAgo = Date.now() - 24 * 60 * 60_000;
  let cancelled = 0;
  for (const o of stale) {
    if (o.paymentMethod === "UPAY") {
      const outcome = await settleUpayOrder(o.id);
      if (outcome === "cancelled") cancelled++;
      // Paid / needs review / Upay unreachable: never cancel on a guess.
      // Still "pending" at Upay: give it a day before giving up.
      const giveUp =
        outcome === "not_found" || (outcome === "pending" && o.createdAt.getTime() < dayAgo);
      if (!giveUp) continue;
    }
    const ok = await transitionOrder({
      orderId: o.id,
      from: "PENDING",
      to: "CANCELLED",
      note: "Payment not completed in time",
    });
    if (ok) cancelled++;
  }
  return cancelled;
}
