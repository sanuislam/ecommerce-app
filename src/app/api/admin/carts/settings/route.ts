import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  auto: z.boolean(),
  afterHours: z.number().int().min(1).max(72),
  couponCode: z.string().trim().max(40),
  template: z.string().trim().max(320),
});

export async function PUT(req: Request) {
  const session = await adminSession("marketing");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const v = { ...parsed.data, couponCode: parsed.data.couponCode.toUpperCase() };
  if (v.template && !v.template.includes("{link}")) {
    return NextResponse.json({ error: "The message must contain {link}" }, { status: 400 });
  }
  if (v.couponCode && !(await prisma.coupon.findUnique({ where: { code: v.couponCode }, select: { id: true } }))) {
    return NextResponse.json({ error: `Coupon ${v.couponCode} doesn't exist` }, { status: 400 });
  }
  await prisma.cartReminderSettings.upsert({ where: { id: "default" }, create: { id: "default", ...v }, update: v });
  await audit(session, { action: "settings.carts", summary: `Cart reminders ${v.auto ? "automatic" : "manual"}`, data: v });
  return NextResponse.json({ ok: true });
}
