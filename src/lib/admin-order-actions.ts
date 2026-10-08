import "server-only";
import { prisma } from "@/lib/prisma";
import { allowedTransitions, transitionOrder } from "@/lib/orders";
import type { OrderStatus } from "@/generated/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string; status?: number };

/**
 * An admin moving an order to another status (single or bulk). Gateway
 * payments must be refunded through their refund button, never by a status.
 */
export async function adminChangeStatus(opts: {
  orderId: string;
  status: OrderStatus;
  note?: string;
  shipping?: { courier?: string | null; trackingNumber?: string | null };
}): Promise<ActionResult> {
  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) return { ok: false, error: "Order not found", status: 404 };
  if (order.status === opts.status) return { ok: true };
  if (!allowedTransitions(order.status, order.paymentMethod).includes(opts.status)) {
    return {
      ok: false,
      error: `Cannot change an order from ${order.status} to ${opts.status}`,
      status: 400,
    };
  }
  const gatewayPaid =
    ["PAID", "SHIPPED", "DELIVERED"].includes(order.status) &&
    ((order.paymentMethod === "BKASH" && !!order.bkashPaymentId) ||
      (order.paymentMethod === "UPAY" && !!order.upayTxnId));
  if (gatewayPaid && (opts.status === "REFUNDED" || opts.status === "CANCELLED")) {
    const via = order.paymentMethod === "UPAY" ? "Upay" : "bKash";
    return {
      ok: false,
      error: `This order was paid through ${via}. Use the "Refund via ${via}" button so the money is returned.`,
      status: 400,
    };
  }
  const manualRefund =
    opts.status === "REFUNDED" ||
    (opts.status === "CANCELLED" && order.status !== "PENDING" && order.paymentMethod !== "COD");
  const ok = await transitionOrder({
    orderId: order.id,
    from: order.status,
    to: opts.status,
    note:
      [opts.note, manualRefund ? "Money must be returned to the customer outside the app" : ""]
        .filter(Boolean)
        .join(" · ") || undefined,
    data: opts.shipping ?? {},
  });
  if (!ok) {
    return { ok: false, error: "The order was changed by someone else. Refresh and try again.", status: 409 };
  }
  return { ok: true };
}
