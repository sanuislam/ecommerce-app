import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Turns off two-factor for a staff member who lost their phone (owner only, never yourself). */
export async function POST(_req: Request, ctx: Ctx) {
  const session = await adminSession("owner");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "Use My security for your own account" }, { status: 400 });
  }
  const u = await prisma.user.findFirst({ where: { id, role: { in: ["STAFF", "ADMIN"] } }, select: { email: true } });
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.user.update({
    where: { id },
    data: { twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorRecovery: [] },
  });
  await audit(session, { action: "staff.reset_2fa", targetType: "user", targetId: id, summary: `Two-factor reset for ${u.email}` });
  return NextResponse.json({ ok: true });
}
