import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role, OrderStatus } from "@/generated/prisma";
import { allowedTransitions, transitionOrder } from "@/lib/orders";

const schema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  note: z.string().trim().max(300).optional(),
  courier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { status, note, courier, trackingNumber } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const shipping: { courier?: string | null; trackingNumber?: string | null } = {};
  if (courier !== undefined) shipping.courier = courier || null;
  if (trackingNumber !== undefined) shipping.trackingNumber = trackingNumber || null;

  if (status && status !== order.status) {
    if (!allowedTransitions(order.status, order.paymentMethod).includes(status)) {
      return NextResponse.json(
        { error: `Cannot change an order from ${order.status} to ${status}` },
        { status: 400 },
      );
    }
    if (status === "REFUNDED" && order.paymentMethod === "BKASH" && order.bkashPaymentId) {
      return NextResponse.json(
        { error: "Use the bKash refund button so the money is actually returned" },
        { status: 400 },
      );
    }
    const ok = await transitionOrder({
      orderId: id,
      from: order.status,
      to: status,
      note: note || undefined,
      data: shipping,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "The order was changed by someone else. Refresh and try again." },
        { status: 409 },
      );
    }
  } else if (Object.keys(shipping).length) {
    await prisma.order.update({ where: { id }, data: shipping });
  }

  const updated = await prisma.order.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
