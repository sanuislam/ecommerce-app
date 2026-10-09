import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createResetLink } from "@/lib/password-reset";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Owner: a one-time password link (24 h) for someone who is locked out, to hand over yourself. */
export async function POST(_req: Request, ctx: Ctx) {
  const session = await adminSession("owner");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const u = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!u || u.email.endsWith(".invalid")) return NextResponse.json({ error: "No account to reset" }, { status: 404 });
  const link = await createResetLink(u.id, 24 * 60);
  await audit(session, { action: "user.reset_link", targetType: "user", targetId: u.id, summary: `Reset link made for ${u.email}` });
  return NextResponse.json({ ok: true, link });
}
