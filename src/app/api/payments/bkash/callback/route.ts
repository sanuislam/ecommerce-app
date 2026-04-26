import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeBkashPayment, queryBkashPayment } from "@/lib/bkash";

export const dynamic = "force-dynamic";

/**
 * bKash redirects the customer here after the Tokenized Checkout flow with:
 *   ?paymentID=<id>&status=success|failure|cancel
 * On success we must call execute (idempotent: only succeeds once per paymentID).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentID = url.searchParams.get("paymentID");
  const status = (url.searchParams.get("status") ?? "").toLowerCase();
  const orderId = url.searchParams.get("orderId");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  if (!paymentID) {
    return NextResponse.redirect(
      `${base}/cart?bkash=missing-id`,
      { status: 303 },
    );
  }

  // Find order — prefer orderId param (we set it on callbackURL), fall back to paymentID.
  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId } })
    : await prisma.order.findUnique({ where: { bkashPaymentId: paymentID } });

  if (!order) {
    return NextResponse.redirect(
      `${base}/cart?bkash=order-not-found`,
      { status: 303 },
    );
  }

  // User cancelled or bKash reported failure — restock and mark cancelled.
  if (status === "cancel" || status === "failure") {
    await markFailed(order.id, status === "cancel" ? "CANCELLED" : "FAILED");
    return NextResponse.redirect(
      `${base}/orders/${order.id}?bkash=${status}`,
      { status: 303 },
    );
  }

  // Success: execute the payment to capture funds.
  let executed;
  try {
    executed = await executeBkashPayment(paymentID);
  } catch (err) {
    console.error("bKash execute failed, querying status", err);
    try {
      executed = await queryBkashPayment(paymentID);
    } catch (queryErr) {
      console.error("bKash query also failed", queryErr);
    }
  }

  const txStatus = executed?.transactionStatus?.toLowerCase();
  if (txStatus === "completed") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentTransactionId: executed?.trxID ?? null,
        paymentSenderNumber: executed?.customerMsisdn ?? order.paymentSenderNumber,
      },
    });
    return NextResponse.redirect(
      `${base}/orders/${order.id}?success=1`,
      { status: 303 },
    );
  }

  await markFailed(order.id, "FAILED");
  return NextResponse.redirect(
    `${base}/orders/${order.id}?bkash=failed`,
    { status: 303 },
  );
}

async function markFailed(orderId: string, reason: "CANCELLED" | "FAILED") {
  // Roll back stock and mark the order CANCELLED so the customer can retry.
  try {
    await prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({
        where: { orderId },
        select: { productId: true, quantity: true },
      });
      for (const i of items) {
        await tx.product.update({
          where: { id: i.productId },
          data: { stock: { increment: i.quantity } },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED", notes: `bKash ${reason.toLowerCase()}` },
      });
    });
  } catch (err) {
    console.error(`Failed to mark order ${orderId} as ${reason}`, err);
  }
}
