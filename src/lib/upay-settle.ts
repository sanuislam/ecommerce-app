import "server-only";
import { prisma } from "@/lib/prisma";
import { transitionOrder } from "@/lib/orders";
import { queryUpayPayment } from "@/lib/upay";

export type UpaySettleOutcome =
  | "paid" // confirmed by Upay, order is PAID
  | "review" // money moved but doesn't match the order, or arrived after it was closed
  | "cancelled" // Upay says failed / cancelled / expired: order cancelled
  | "pending" // still in progress at Upay
  | "not_found" // Upay has no payment for this order (customer never paid)
  | "unknown"; // Upay could not be asked — try again later

const FINAL_FAILURES = new Set(["failed", "cancelled", "canceled", "expired"]);

/**
 * Reads an Upay order's payment from Upay itself and applies the result.
 * Safe to call any number of times (redirect, refresh, expiry job): every
 * status change goes through `transitionOrder`, which applies once.
 */
export async function settleUpayOrder(orderId: string): Promise<UpaySettleOutcome> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, total: true, upayTxnId: true, paymentMethod: true, paymentSenderNumber: true },
  });
  if (!order || order.paymentMethod !== "UPAY" || !order.upayTxnId) return "not_found";

  let r;
  try {
    r = await queryUpayPayment(order.upayTxnId);
  } catch (err) {
    console.error("Upay status check failed", orderId, err);
    return "unknown";
  }
  if (!r.found) return "not_found";

  if (r.status === "success") {
    const amountOk = r.amount !== null && Math.abs(r.amount - Number(order.total)) < 0.01;
    const invoiceOk = !r.invoiceId || r.invoiceId === order.id;
    const txnOk = !r.txnId || r.txnId === order.upayTxnId;
    if (order.status === "PENDING" && (!amountOk || !invoiceOk || !txnOk)) {
      console.error("Upay payment mismatch", { orderId, paid: r.amount, expected: order.total.toString(), invoice: r.invoiceId });
      const already = await prisma.orderEvent.count({
        where: { orderId, note: { startsWith: "Upay payment needs review" } },
      });
      if (!already) {
        await prisma.orderEvent.create({
          data: {
            orderId,
            status: "PENDING",
            note: `Upay payment needs review: TrxID ${r.trxId ?? "-"}, amount ${r.amount ?? "?"}, expected ${order.total.toString()}`,
          },
        });
      }
      return "review";
    }
    const paid = await transitionOrder({
      orderId,
      from: "PENDING",
      to: "PAID",
      note: `Paid with Upay (TrxID ${r.trxId ?? "-"})`,
      data: {
        paymentTransactionId: r.trxId ?? null,
        paymentSenderNumber: r.customerWallet ?? order.paymentSenderNumber,
      },
    });
    if (paid) return "paid";
    const now = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, paymentTransactionId: true } });
    if (now && now.status !== "PENDING" && now.status !== "CANCELLED") return "paid";
    if (now?.status === "CANCELLED" && !now.paymentTransactionId) {
      // Paid at Upay after the order had been cancelled (expired / cancelled by an admin).
      console.error("Upay payment completed for a closed order", orderId, r.trxId);
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentTransactionId: r.trxId ?? order.upayTxnId, paymentSenderNumber: r.customerWallet ?? null },
      });
      await prisma.orderEvent.create({
        data: {
          orderId,
          status: "CANCELLED",
          note: `Upay payment ${r.trxId ?? ""} received after the order was closed — refund needed`,
        },
      });
    }
    return "review";
  }

  if (FINAL_FAILURES.has(r.status)) {
    await transitionOrder({
      orderId,
      from: "PENDING",
      to: "CANCELLED",
      note: `Upay payment ${r.status}`,
    });
    return "cancelled";
  }
  return "pending";
}
