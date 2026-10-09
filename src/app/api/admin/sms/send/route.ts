import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { bdMobile, getSmsSettings, sendSms } from "@/lib/sms";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  orderId: z.string().min(1),
  message: z.string().trim().min(2).max(480),
});

/** A one-off SMS to an order's customer, typed by an admin. */
export async function POST(req: Request) {
  const session = await adminSession("orders");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write a message (2–480 characters)" }, { status: 400 });
  const s = await getSmsSettings();
  if (!s.enabled || !s.apiKey) return NextResponse.json({ error: "SMS is not set up" }, { status: 400 });
  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { address: { select: { phone: true } }, user: { select: { phone: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const phone = bdMobile(order.address?.phone) ?? bdMobile(order.user.phone);
  if (!phone) return NextResponse.json({ error: "The order has no valid mobile number" }, { status: 400 });

  const log = await prisma.smsLog.create({
    data: {
      orderId: order.id,
      event: `custom:${randomBytes(6).toString("hex")}`,
      phone,
      message: parsed.data.message,
    },
  });
  const r = await sendSms(s.apiKey, phone, parsed.data.message, s.senderId || undefined);
  await prisma.smsLog.update({
    where: { id: log.id },
    data: r.ok ? { status: "sent", requestId: r.requestId } : { status: "failed", error: r.error.slice(0, 300) },
  });
  if (r.ok) {
    await audit(session, {
      action: "order.sms",
      targetType: "order",
      targetId: order.id,
      summary: `#${order.id.slice(0, 8)} SMS to ${phone}: ${parsed.data.message.slice(0, 80)}`,
    });
  }
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 502 });
}
