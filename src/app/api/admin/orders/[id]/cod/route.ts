import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adminChangeStatus } from "@/lib/admin-order-actions";
import { blockPhone } from "@/lib/blocklist";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(["confirm", "no_answer", "fake"]),
  note: z.string().trim().max(200).optional().default(""),
  block: z.boolean().optional().default(false),
});

/** The result of calling a cash-on-delivery customer. */
export async function POST(req: Request, ctx: Ctx) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { action, note, block } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id }, include: { address: { select: { phone: true } } } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "Only orders waiting to ship can be confirmed" }, { status: 409 });
  }

  if (action === "confirm") {
    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { codConfirmedAt: new Date(), codConfirmNote: note || "Confirmed by phone" },
      }),
      prisma.orderEvent.create({ data: { orderId: id, status: "PENDING", note: "Order confirmed" } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === "no_answer") {
    const updated = await prisma.order.update({
      where: { id },
      data: { codCallAttempts: { increment: 1 }, codConfirmNote: note || "No answer" },
    });
    return NextResponse.json({ ok: true, attempts: updated.codCallAttempts });
  }

  // Fake / refused: cancel (stock comes back) and optionally block the number.
  const r = await adminChangeStatus({
    orderId: id,
    status: "CANCELLED",
    note: note ? `Cancelled: ${note}` : "Cancelled: the order could not be confirmed",
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status ?? 400 });
  if (block && order.address?.phone) {
    await blockPhone(order.address.phone, note || `Fake order #${id.slice(0, 8)}`, session.user.id).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
