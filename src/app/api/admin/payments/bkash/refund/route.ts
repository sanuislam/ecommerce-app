import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { bkashConfigured, refundBkashPayment } from "@/lib/bkash";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().max(255).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!bkashConfigured()) {
    return NextResponse.json(
      { error: "bKash is not configured on this environment" },
      { status: 503 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.paymentMethod !== "BKASH") {
    return NextResponse.json(
      { error: "Order was not paid via bKash" },
      { status: 400 },
    );
  }
  if (order.status !== "PAID") {
    return NextResponse.json(
      { error: `Order is ${order.status}, only PAID orders can be refunded` },
      { status: 400 },
    );
  }
  if (!order.bkashPaymentId || !order.paymentTransactionId) {
    return NextResponse.json(
      { error: "Order is missing bKash paymentID or trxID" },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await refundBkashPayment({
      paymentID: order.bkashPaymentId,
      trxID: order.paymentTransactionId,
      amount: Number(order.total),
      reason: parsed.data.reason ?? `Admin refund for order ${order.id}`,
      sku: order.id,
    });
  } catch (err) {
    console.error("bKash refund call failed", err);
    return NextResponse.json(
      { error: "bKash refund call failed" },
      { status: 502 },
    );
  }

  const refunded =
    result.statusCode === "0000" ||
    result.transactionStatus?.toLowerCase() === "completed";

  if (!refunded) {
    return NextResponse.json(
      {
        error:
          result.statusMessage ||
          result.errorMessage ||
          "Refund rejected by bKash",
        details: result,
      },
      { status: 502 },
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "REFUNDED",
      notes: [
        order.notes,
        `bKash refund ${result.refundTrxID ?? ""} on ${new Date().toISOString()}`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  });

  return NextResponse.json({
    ok: true,
    refundTrxID: result.refundTrxID,
    completedTime: result.completedTime,
  });
}
