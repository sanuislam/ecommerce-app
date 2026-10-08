import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { applyCourierStatus, getCourierSettings, refreshCourierStatus } from "@/lib/couriers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ courier: string; key: string }> };

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Delivery updates from couriers. The URL carries a random key (Admin →
 * Couriers shows the full URLs). Pathao and RedX callbacks are only a
 * signal: the status is read back from the courier before anything changes.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { courier, key } = await ctx.params;
  const s = await getCourierSettings();
  if (!s.webhookKey || !same(key, s.webhookKey)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Bad body" }, { status: 400 });

  if (courier === "steadfast") {
    if (s.steadfastWebhookToken) {
      const auth = req.headers.get("authorization") ?? "";
      if (!same(auth, `Bearer ${s.steadfastWebhookToken}`)) {
        return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
      }
    }
    const cid = body.consignment_id != null ? String(body.consignment_id) : "";
    const invoice = typeof body.invoice === "string" ? body.invoice : "";
    const status = typeof body.status === "string" ? body.status : "";
    if (cid && status && body.notification_type !== "tracking_update") {
      const order = await prisma.order.findFirst({
        where: {
          courier: "steadfast",
          OR: [{ courierConsignmentId: cid }, ...(invoice ? [{ id: invoice }] : [])],
        },
        select: { id: true },
      });
      if (order && s.steadfastWebhookToken) {
        // Signed with our token: the payload can be trusted as it is.
        const charge = Number(body.delivery_charge);
        await applyCourierStatus(order.id, "steadfast", status, Number.isFinite(charge) ? charge : null);
      } else if (order) {
        await refreshCourierStatus(order.id);
      }
    }
    return NextResponse.json({ status: "success", message: "Webhook received" });
  }

  if (courier === "pathao") {
    const reply = (status: number) =>
      NextResponse.json(
        { status: "ok" },
        {
          status,
          headers: s.pathaoWebhookSecret
            ? { "X-Pathao-Merchant-Webhook-Integration-Secret": s.pathaoWebhookSecret }
            : {},
        },
      );
    if (body.event === "webhook_integration") return reply(202);
    const cid = typeof body.consignment_id === "string" ? body.consignment_id : "";
    if (cid) {
      const order = await prisma.order.findFirst({
        where: { courier: "pathao", courierConsignmentId: cid },
        select: { id: true },
      });
      if (order) await refreshCourierStatus(order.id);
    }
    return reply(202);
  }

  if (courier === "redx") {
    const tid = typeof body.tracking_number === "string" ? body.tracking_number : "";
    if (tid) {
      const order = await prisma.order.findFirst({
        where: { courier: "redx", courierConsignmentId: tid },
        select: { id: true },
      });
      if (order) await refreshCourierStatus(order.id);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown courier" }, { status: 404 });
}
