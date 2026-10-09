import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** A customer asked (by phone, chat…) to stop or restart promotional SMS. */
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await adminSession("customers");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = z.object({ optOut: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const u = await prisma.user.updateMany({ where: { id, role: "USER" }, data: { smsOptOut: parsed.data.optOut } });
  if (!u.count) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const who = await prisma.user.findUnique({ where: { id }, select: { email: true, phone: true } });
  await audit(session, {
    action: "customer.marketing",
    targetType: "user",
    targetId: id,
    summary: `${who?.email.endsWith(".invalid") ? who.phone : who?.email}: promotional SMS ${parsed.data.optOut ? "off" : "on"}`,
  });
  return NextResponse.json({ ok: true });
}
