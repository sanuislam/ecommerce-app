import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { getCartReminderSettings, sendCartReminder } from "@/lib/carts";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  ids: z.array(z.string().min(1).max(40)).min(1).max(100),
  couponCode: z.string().trim().max(40).optional(),
});

/** Sends the reminder SMS to the chosen abandoned carts. */
export async function POST(req: Request) {
  const session = await adminSession("marketing");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose at least one cart" }, { status: 400 });
  const s = await getCartReminderSettings();
  const code = (parsed.data.couponCode ?? s.couponCode).trim().toUpperCase();
  if (code) {
    const c = await prisma.coupon.findUnique({ where: { code }, select: { active: true, endsAt: true } });
    if (!c || !c.active || (c.endsAt && c.endsAt < new Date())) {
      return NextResponse.json({ error: `Coupon ${code} doesn't exist or isn't active` }, { status: 400 });
    }
  }
  const results = [];
  for (const id of [...new Set(parsed.data.ids)]) {
    results.push(await sendCartReminder(id, { couponCode: code, template: s.template }));
  }
  const sent = results.filter((r) => r.ok).length;
  if (sent) {
    await audit(session, {
      action: "cart.remind",
      summary: `${sent} cart reminder${sent === 1 ? "" : "s"} sent${code ? ` with ${code}` : ""}`,
      data: { ids: results.filter((r) => r.ok).map((r) => r.id) },
    });
  }
  return NextResponse.json({ sent, failed: results.filter((r) => !r.ok) });
}
