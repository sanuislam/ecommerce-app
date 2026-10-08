import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role, OrderStatus } from "@/generated/prisma";
import { adminChangeStatus } from "@/lib/admin-order-actions";

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
    const r = await adminChangeStatus({ orderId: id, status, note, shipping });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status ?? 400 });
  } else if (Object.keys(shipping).length) {
    await prisma.order.update({ where: { id }, data: shipping });
  }

  const updated = await prisma.order.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
