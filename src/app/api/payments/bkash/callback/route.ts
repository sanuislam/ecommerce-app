import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  executeBkashPayment,
  queryBkashPayment,
  type BkashExecuteResponse,
} from "@/lib/bkash";
import { transitionOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * bKash redirects the customer here after Tokenized Checkout with
 *   ?paymentID=<id>&status=success|failure|cancel
 *
 * The order is looked up ONLY by the paymentID we stored when creating the
 * payment, and the executed payment must match the order's invoice number
 * and total before the order is marked paid. The query string is
 * attacker-controlled, so `status` is only trusted for cancel/failure after
 * bKash itself confirms the payment did not complete.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentID = url.searchParams.get("paymentID");
  const status = (url.searchParams.get("status") ?? "").toLowerCase();
  // Redirect back to the host the customer is actually on.
  const base = url.origin;
  const go = (path: string) => NextResponse.redirect(`${base}${path}`, { status: 303 });

  if (!paymentID) return go("/cart?bkash=missing-id");

  const order = await prisma.order.findUnique({ where: { bkashPaymentId: paymentID } });
  if (!order || order.paymentMethod !== "BKASH") return go("/cart?bkash=order-not-found");

  if (order.status !== "PENDING") {
    return go(
      order.status === "CANCELLED" || order.status === "REFUNDED"
        ? `/orders/${order.id}?bkash=${order.status.toLowerCase()}`
        : `/orders/${order.id}?success=1`,
    );
  }

  let result: BkashExecuteResponse | undefined;
  if (status === "success") {
    try {
      result = await executeBkashPayment(paymentID);
    } catch (err) {
      console.error("bKash execute failed", err);
    }
  }
  // Execute can fail if it already ran (double redirect) — ask bKash directly.
  if (result?.transactionStatus?.toLowerCase() !== "completed") {
    try {
      result = await queryBkashPayment(paymentID);
    } catch (err) {
      console.error("bKash query failed", err);
    }
  }

  const completed = result?.transactionStatus?.toLowerCase() === "completed";
  if (completed && result) {
    const amountOk = Math.abs(Number(result.amount) - Number(order.total)) < 0.01;
    const invoiceOk =
      !result.merchantInvoiceNumber || result.merchantInvoiceNumber === order.id;
    if (!amountOk || !invoiceOk) {
      console.error("bKash payment mismatch", {
        orderId: order.id,
        paid: result.amount,
        expected: order.total.toString(),
        invoice: result.merchantInvoiceNumber,
      });
      // Money moved but doesn't match — leave PENDING for an admin to review.
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          note: `bKash payment ${result.trxID ?? ""} needs review (amount ${result.amount ?? "?"})`,
        },
      });
      return go(`/orders/${order.id}?bkash=review`);
    }
    const paid = await transitionOrder({
      orderId: order.id,
      from: "PENDING",
      to: "PAID",
      note: `Paid with bKash (TrxID ${result.trxID ?? "-"})`,
      data: {
        paymentTransactionId: result.trxID ?? null,
        paymentSenderNumber: result.customerMsisdn ?? order.paymentSenderNumber,
      },
    });
    if (!paid) {
      // The order was cancelled/expired while the customer was paying.
      const now = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });
      if (now?.status !== "PAID") {
        console.error("bKash payment completed for a non-pending order", order.id, result.trxID);
        await prisma.orderEvent.create({
          data: {
            orderId: order.id,
            status: now?.status ?? "CANCELLED",
            note: `bKash payment ${result.trxID ?? ""} received after the order was closed — refund needed`,
          },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentTransactionId: result.trxID ?? null },
        });
        return go(`/orders/${order.id}?bkash=review`);
      }
    }
    return go(`/orders/${order.id}?success=1`);
  }

  // bKash reports the payment is not completed. Only cancel if bKash gave us
  // a definite answer; otherwise leave it for the expiry job / admin.
  const definite = Boolean(result?.transactionStatus) || status === "cancel" || status === "failure";
  if (definite) {
    await transitionOrder({
      orderId: order.id,
      from: "PENDING",
      to: "CANCELLED",
      note: status === "cancel" ? "bKash payment cancelled" : "bKash payment failed",
    });
  }
  return go(`/orders/${order.id}?bkash=${status === "cancel" ? "cancel" : "failed"}`);
}
