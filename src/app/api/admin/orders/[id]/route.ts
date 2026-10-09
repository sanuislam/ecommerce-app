import { can } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/generated/prisma";
import { adminChangeStatus } from "@/lib/admin-order-actions";
import { audit } from "@/lib/audit";

const schema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  note: z.string().trim().max(300).optional(),
  courier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, session.user.staffRole, "orders")) {
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
    await audit(session, {
      action: "order.status",
      targetType: "order",
      targetId: id,
      summary: `#${id.slice(0, 8)}: ${order.status} → ${status}${note ? ` (${note})` : ""}`,
      data: { from: order.status, to: status, ...shipping },
    });
  } else if (Object.keys(shipping).length) {
    await prisma.order.update({ where: { id }, data: shipping });
    await audit(session, { action: "order.edit", targetType: "order", targetId: id, summary: `#${id.slice(0, 8)}: tracking updated`, data: shipping });
  }

  const updated = await prisma.order.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
