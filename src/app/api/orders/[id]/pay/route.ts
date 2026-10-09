import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { bkashConfigured, createBkashPayment, queryBkashPayment } from "@/lib/bkash";
import { siteUrl } from "@/lib/site-url";
import { BKASH_RETRY_MINUTES } from "@/lib/order-status";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * "Pay now" again for a bKash order the shopper left half-way (still pending,
 * nothing received). The old bKash payment is asked about first: if it did
 * go through, the shopper goes to our callback, which settles the order.
 * Only then is a new bKash payment started, swapped in with a conditional
 * update so two clicks can't both win.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!(await rateLimit(`payretry:${session.user.id}`, 6, 900))) {
    return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  }
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { address: { select: { phone: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const fresh = Date.now() - order.createdAt.getTime() < BKASH_RETRY_MINUTES * 60_000;
  if (
    order.status !== "PENDING" ||
    order.paymentMethod !== "BKASH" ||
    !order.bkashPaymentId ||
    order.paymentTransactionId ||
    !fresh
  ) {
    return NextResponse.json({ error: "This order can't be paid again. Please place it again." }, { status: 409 });
  }
  if (!(await bkashConfigured())) {
    return NextResponse.json({ error: "bKash is not available right now." }, { status: 503 });
  }

  const old = order.bkashPaymentId;
  let oldStatus: string | undefined;
  try {
    oldStatus = (await queryBkashPayment(old)).transactionStatus?.toLowerCase();
  } catch (err) {
    console.error("bKash query before retry failed", err);
    return NextResponse.json({ error: "Couldn't reach bKash. Please try again in a minute." }, { status: 502 });
  }
  if (oldStatus === "completed") {
    return NextResponse.json({ checkoutUrl: `/api/payments/bkash/callback?paymentID=${encodeURIComponent(old)}&status=success` });
  }

  try {
    const created = await createBkashPayment({
      amount: Number(order.total),
      invoiceNumber: order.id,
      payerReference: order.address?.phone ?? "ec",
      callbackURL: `${siteUrl()}/api/payments/bkash/callback`,
    });
    const swapped = await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING", bkashPaymentId: old },
      data: { bkashPaymentId: created.paymentID },
    });
    if (swapped.count !== 1) {
      return NextResponse.json({ error: "This order changed. Refresh the page." }, { status: 409 });
    }
    await prisma.orderEvent.create({
      data: { orderId: order.id, status: "PENDING", note: `Customer retried bKash payment (earlier payment ${old}: ${oldStatus ?? "unknown"})` },
    });
    return NextResponse.json({ checkoutUrl: created.bkashURL });
  } catch (err) {
    console.error("bKash retry create_payment failed", err);
    return NextResponse.json({ error: "bKash payment is unavailable right now. Please try again." }, { status: 502 });
  }
}
