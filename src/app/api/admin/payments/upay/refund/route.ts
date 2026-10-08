import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { refundUpayPayment } from "@/lib/upay";
import { transitionOrder } from "@/lib/orders";

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

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.paymentMethod !== "UPAY" || !order.upayTxnId) {
    return NextResponse.json({ error: "Order was not paid through the Upay gateway" }, { status: 400 });
  }
  if (Number(order.refundedAmount) > 0) {
    return NextResponse.json(
      { error: "Part of this order was already refunded. Refund the rest from a return request." },
      { status: 409 },
    );
  }
  const refundable = ["PAID", "SHIPPED", "DELIVERED"] as const;
  if (!(refundable as readonly string[]).includes(order.status)) {
    return NextResponse.json(
      { error: `Order is ${order.status} and cannot be refunded` },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await refundUpayPayment(order.upayTxnId, Number(order.total));
  } catch (err) {
    console.error("Upay refund call failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upay refund call failed" },
      { status: 502 },
    );
  }
  if (!result.ok) {
    return NextResponse.json({ error: `Upay: ${result.message}` }, { status: 502 });
  }

  const reason = parsed.data.reason?.trim();
  await transitionOrder({
    orderId: order.id,
    from: order.status,
    to: "REFUNDED",
    note: `Refunded via Upay${reason ? ` — ${reason}` : ""}`,
    data: {
      refundedAmount: order.total,
      notes: [order.notes, `Upay refund on ${new Date().toISOString()}`].filter(Boolean).join("\n"),
    },
  });

  return NextResponse.json({ ok: true, message: result.message });
}
